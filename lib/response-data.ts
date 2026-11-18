import type { Field } from '@/types/schema';

type FormDataReader = Pick<FormData, 'getAll'>;

/**
 * Build the persisted response using the form controls' names (field UUIDs)
 * as the canonical keys. Reading FormData also captures browser autofill and
 * native control values even if a React state update has not flushed yet.
 */
export function buildSubmissionPayload(
  formData: FormDataReader,
  fields: Field[],
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => {
    const submitted = formData.getAll(field.id).filter((value): value is string => typeof value === 'string');

    if (field.fieldType === 'checkbox') return [field.id, submitted];

    const value = submitted[0] ?? '';
    if (field.fieldType === 'number' && value !== '') {
      const numericValue = Number(value);
      return [field.id, Number.isFinite(numericValue) ? numericValue : value];
    }

    return [field.id, value];
  }));
}

/** Copy only known field UUID keys into a stable payload for JSONB storage. */
export function normalizeResponsePayload(
  payload: Record<string, unknown>,
  fields: Field[],
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => {
    const hasValue = Object.prototype.hasOwnProperty.call(payload, field.id);
    const value = hasValue
      ? payload[field.id]
      : field.fieldType === 'checkbox'
        ? []
        : '';
    return [field.id, value];
  }));
}

/** Shared exact-ID lookup used by the response table and CSV export. */
export function getResponseAnswer(
  payload: Record<string, unknown>,
  field: Pick<Field, 'id'>,
): unknown {
  return payload[field.id];
}

export function formatResponseAnswer(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}
