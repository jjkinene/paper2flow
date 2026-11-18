import { z } from 'zod';

export const DraftFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const DraftFieldSchema = z.object({
  label: z.string(),
  fieldType: z.enum(['text', 'number', 'date', 'checkbox', 'radio', 'textarea']),
  placeholder: z.string(),
  required: z.boolean(),
  options: z.array(DraftFieldOptionSchema).nullable(),
  confidence: z.number().min(0).max(1),
});

export const DraftSectionSchema = z.object({
  heading: z.string(),
  instruction: z.string(),
});

export const DraftSchemaZod = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(DraftSectionSchema),
  fields: z.array(DraftFieldSchema).min(1),
});

export type DraftField = z.infer<typeof DraftFieldSchema>;
export type DraftSchema = z.infer<typeof DraftSchemaZod>;

export type ExtractionFailureCode =
  | 'REFUSED'
  | 'INCOMPLETE'
  | 'INVALID_DOCUMENT'
  | 'INVALID_SCHEMA'
  | 'MODEL_UNAVAILABLE'
  | 'SOURCE_UNAVAILABLE';

const USER_MESSAGES: Record<ExtractionFailureCode, string> = {
  REFUSED: 'The document could not be processed. Please check the file and try a different document.',
  INCOMPLETE: 'The document could not be fully read. Try a clearer or shorter PDF, or upload a sharper image.',
  INVALID_DOCUMENT: 'This file could not be read as a valid PDF, JPG, or PNG form. Please check the file and upload it again.',
  INVALID_SCHEMA: 'We could not identify form fields in this document. Upload a clearer form with at least one readable field.',
  MODEL_UNAVAILABLE: 'Form extraction is temporarily unavailable. Please try again in a few minutes.',
  SOURCE_UNAVAILABLE: 'We could not retrieve the uploaded document. Please upload it again.',
};

/** Safe error suitable for persisting to the form and displaying to its owner. */
export class ExtractionError extends Error {
  readonly code: ExtractionFailureCode;

  constructor(code: ExtractionFailureCode) {
    super(USER_MESSAGES[code]);
    this.name = 'ExtractionError';
    this.code = code;
  }
}

/** Validate an already-decoded model value without exposing its contents/errors. */
export function validateDraftSchema(value: unknown): DraftSchema {
  const parsed = DraftSchemaZod.safeParse(value);
  if (!parsed.success) throw new ExtractionError('INVALID_SCHEMA');
  return parsed.data;
}

/** Parse only structured JSON; plain language refusals are never fed to JSON.parse. */
export function parseDraftJson(raw: string): DraftSchema {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ExtractionError('INVALID_SCHEMA');
  }
  return validateDraftSchema(value);
}

export function isRecoverableExtractionFailure(error: unknown): boolean {
  return error instanceof ExtractionError && error.code === 'INCOMPLETE';
}
