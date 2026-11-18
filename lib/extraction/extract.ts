import 'server-only';
import { z } from 'zod';
import OpenAI from 'openai';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { EXTRACTION_SYSTEM_PROMPT } from './prompt';

// ---------------------------------------------------------------------------
// DraftSchema types
// ---------------------------------------------------------------------------

export interface DraftField {
  label: string;
  fieldType: 'text' | 'number' | 'date' | 'checkbox' | 'radio' | 'textarea';
  placeholder: string;
  required: boolean;
  options: Array<{ label: string; value: string }> | null;
  confidence: number;
}

export interface DraftSchema {
  title: string;
  description: string;
  sections: Array<{ heading: string; instruction: string }>;
  fields: DraftField[];
}

// ---------------------------------------------------------------------------
// Zod validation for the AI response
// ---------------------------------------------------------------------------

const DraftFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const DraftFieldSchema = z.object({
  label: z.string(),
  fieldType: z.enum(['text', 'number', 'date', 'checkbox', 'radio', 'textarea']),
  placeholder: z.string(),
  required: z.boolean(),
  options: z.array(DraftFieldOptionSchema).nullable(),
  confidence: z.number().min(0).max(1),
});

const DraftSectionSchema = z.object({
  heading: z.string(),
  instruction: z.string(),
});

const DraftSchemaZod = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(DraftSectionSchema),
  fields: z.array(DraftFieldSchema).min(1, 'The document contains no form fields'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Node.js conversion avoids allocating a character per byte. */
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/** Map a MIME type to the data-URI media type used in the OpenAI image_url. */
function imageMediaType(mimeType: string): string {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType === 'image/png') return 'image/png';
  // PDF pages are always rendered as PNG by renderPdfPages
  return 'image/png';
}

/** Build the OpenAI image_url content parts from an array of base64 strings. */
function buildImageParts(
  base64Images: string[],
  mediaType: string,
): OpenAI.Chat.ChatCompletionContentPart[] {
  return base64Images.map((b64) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${mediaType};base64,${b64}` },
  }));
}

/** Call the GPT-4o Vision API and return the raw text response. */
async function callVisionApi(
  imageParts: OpenAI.Chat.ChatCompletionContentPart[],
  systemPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the form structure from the provided image(s).' },
          ...imageParts,
        ],
      },
    ],
  max_tokens: 4096,
}, { signal });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('GPT-4o returned an empty response.');
  }
  return content;
}

async function callPdfApi(fileBytes: Uint8Array, systemPrompt: string, signal?: AbortSignal): Promise<string> {
  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: 'Extract the form structure from this PDF document.' },
        { type: 'input_file', filename: 'source.pdf', file_data: `data:application/pdf;base64,${toBase64(fileBytes)}` },
      ],
    }],
    instructions: systemPrompt,
    max_output_tokens: 4096,
}, { signal });
  if (!response.output_text) throw new Error('OpenAI returned an empty response.');
  return response.output_text;
}

/** Parse the raw text from the model and validate against DraftSchemaZod. */
function parseAndValidate(raw: string): DraftSchema {
  const parsed: unknown = JSON.parse(raw);
  return DraftSchemaZod.parse(parsed) as DraftSchema;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Download a source document from Supabase Storage, extract its form structure
 * using GPT-4o Vision, and return a validated DraftSchema.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export async function extractFormSchema(
  storagePath: string,
  mimeType: string,
  signal?: AbortSignal,
): Promise<DraftSchema> {
  // 1. Download file bytes from Supabase Storage via the service-role client.
  const supabase = createSupabaseServiceClient();
  const { data: blob, error: downloadError } = await supabase.storage
    .from('source-documents')
    .download(storagePath);

  if (downloadError || !blob) {
    throw new Error(
      `Failed to download source document from Storage: ${downloadError?.message ?? 'unknown error'}`,
    );
  }

  const arrayBuffer = await blob.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  const isPdf = mimeType === 'application/pdf';
  const imageParts = isPdf ? [] : buildImageParts([toBase64(fileBytes)], imageMediaType(mimeType));
  const callModel = (prompt: string) => isPdf
    ? callPdfApi(fileBytes, prompt, signal)
    : callVisionApi(imageParts, prompt, signal);

  // Network errors, API failures, and timeouts should fail immediately so the
  // pipeline records an actionable failure (not a second expensive API call).
  const rawResponse = await callModel(EXTRACTION_SYSTEM_PROMPT);
  try {
    return parseAndValidate(rawResponse);
  } catch (parseError) {
    // One retry is appropriate when the model replies with invalid JSON.
    const stricterPrompt = EXTRACTION_SYSTEM_PROMPT +
      '\nReturn ONLY a complete JSON object. No markdown, no commentary.';
    const retryResponse = await callModel(stricterPrompt);
    try {
      return parseAndValidate(retryResponse);
    } catch {
      throw new Error(`The AI returned an invalid form schema after retry: ${parseError instanceof Error ? parseError.message : 'invalid JSON'}`);
    }
  }
}
