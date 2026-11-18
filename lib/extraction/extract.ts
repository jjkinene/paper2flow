import 'server-only';
import OpenAI from 'openai';
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { EXTRACTION_SYSTEM_PROMPT } from './prompt';
import {
  DraftSchemaZod,
  ExtractionError,
  parseDraftJson,
  type DraftSchema,
} from './schema';

export type { DraftField, DraftSchema } from './schema';

const MAX_ATTEMPTS = 2;
const INITIAL_OUTPUT_TOKENS = 4096;
const RETRY_OUTPUT_TOKENS = 8192;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Make the bounded application retry policy the only retry policy.
  maxRetries: 0,
});

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
function imageMediaType(mimeType: string): string {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'image/jpeg';
  return 'image/png';
}

function buildImageParts(
  base64Images: string[],
  mediaType: string,
): OpenAI.Chat.ChatCompletionContentPart[] {
  return base64Images.map((b64) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${mediaType};base64,${b64}` },
  }));
}

function hasPdfRefusal(response: OpenAI.Responses.Response): boolean {
  return response.output.some((item) =>
    item.type === 'message' && item.content.some((part) => part.type === 'refusal'),
  );
}

async function callVisionApi(
  imageParts: OpenAI.Chat.ChatCompletionContentPart[],
  signal: AbortSignal | undefined,
  maxTokens: number,
): Promise<DraftSchema> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the form structure from the provided image(s).' },
          ...imageParts,
        ],
      },
    ],
    response_format: zodResponseFormat(DraftSchemaZod, 'paper2flow_form_schema'),
    max_tokens: maxTokens,
  }, { signal });

  const choice = response.choices[0];
  const message = choice?.message;
  if (message?.refusal || choice?.finish_reason === 'content_filter') {
    throw new ExtractionError('REFUSED');
  }
  if (choice?.finish_reason === 'length') throw new ExtractionError('INCOMPLETE');
  if (choice?.finish_reason !== 'stop' || !message?.content) {
    throw new ExtractionError('MODEL_UNAVAILABLE');
  }

  // Structured Outputs should always be JSON, but keep a guarded parser for
  // API/proxy regressions and validate the application-specific non-empty rule.
  return parseDraftJson(message.content);
}

async function callPdfApi(
  fileBytes: Uint8Array,
  signal: AbortSignal | undefined,
  maxTokens: number,
): Promise<DraftSchema> {
  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: 'Extract the form structure from this PDF document.' },
        {
          type: 'input_file',
          filename: 'source.pdf',
          file_data: `data:application/pdf;base64,${toBase64(fileBytes)}`,
        },
      ],
    }],
    instructions: EXTRACTION_SYSTEM_PROMPT,
    text: { format: zodTextFormat(DraftSchemaZod, 'paper2flow_form_schema') },
    max_output_tokens: maxTokens,
    store: false,
  }, { signal });

  if (hasPdfRefusal(response)) throw new ExtractionError('REFUSED');
  if (response.status === 'incomplete') throw new ExtractionError('INCOMPLETE');
  if (response.status !== 'completed') throw new ExtractionError('MODEL_UNAVAILABLE');
  if (!response.output_text) throw new ExtractionError('MODEL_UNAVAILABLE');
  return parseDraftJson(response.output_text);
}

function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof ExtractionError) return error.code === 'INCOMPLETE';
  if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.APIConnectionTimeoutError) return true;
  if (error instanceof OpenAI.RateLimitError) return true;
  if (error instanceof OpenAI.InternalServerError) return true;
  return false;
}

function normalizeProviderError(error: unknown): ExtractionError {
  if (error instanceof ExtractionError) return error;
  if (error instanceof OpenAI.BadRequestError || error instanceof OpenAI.UnprocessableEntityError) {
    return new ExtractionError('INVALID_DOCUMENT');
  }
  return new ExtractionError('MODEL_UNAVAILABLE');
}

/**
 * Extracts a schema from already-downloaded bytes. Kept separate so the model
 * request can be exercised end-to-end without coupling it to Storage setup.
 */
export async function extractBytesToSchema(
  fileBytes: Uint8Array,
  mimeType: string,
  signal?: AbortSignal,
): Promise<DraftSchema> {
  if (!fileBytes.byteLength) throw new ExtractionError('INVALID_DOCUMENT');
  if (mimeType !== 'application/pdf' && mimeType !== 'image/jpeg' && mimeType !== 'image/jpg' && mimeType !== 'image/png') {
    throw new ExtractionError('INVALID_DOCUMENT');
  }

  const isPdf = mimeType === 'application/pdf';
  const imageParts = isPdf
    ? []
    : buildImageParts([toBase64(fileBytes)], imageMediaType(mimeType));
  let lastError: ExtractionError = new ExtractionError('MODEL_UNAVAILABLE');

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return isPdf
        ? await callPdfApi(fileBytes, signal, attempt === 0 ? INITIAL_OUTPUT_TOKENS : RETRY_OUTPUT_TOKENS)
        : await callVisionApi(imageParts, signal, attempt === 0 ? INITIAL_OUTPUT_TOKENS : RETRY_OUTPUT_TOKENS);
    } catch (error) {
      const safeError = normalizeProviderError(error);
      if (error instanceof ExtractionError) lastError = error;
      else lastError = safeError;

      if (attempt + 1 >= MAX_ATTEMPTS || !isRetryableProviderError(error)) {
        throw safeError;
      }
    }
  }

  throw lastError;
}

/** Download an uploaded document from Storage, then extract a validated schema. */
export async function extractFormSchema(
  storagePath: string,
  mimeType: string,
  signal?: AbortSignal,
): Promise<DraftSchema> {
  const supabase = createSupabaseServiceClient();
  const { data: blob, error: downloadError } = await supabase.storage
    .from('source-documents')
    .download(storagePath);

  if (downloadError || !blob) throw new ExtractionError('SOURCE_UNAVAILABLE');

  try {
    return await extractBytesToSchema(new Uint8Array(await blob.arrayBuffer()), mimeType, signal);
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    // Do not persist provider messages, response text, or document contents.
    throw normalizeProviderError(error);
  }
}