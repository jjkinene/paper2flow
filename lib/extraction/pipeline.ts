import 'server-only';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { extractFormSchema, type DraftField } from './extract';

// ---------------------------------------------------------------------------
// MIME type helpers
// ---------------------------------------------------------------------------

/** Derive a MIME type string from a Supabase Storage object path. */
function mimeFromPath(storagePath: string): string {
  const ext = storagePath.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      throw new Error(
        `Unsupported file extension ".${ext}" in source path "${storagePath}". ` +
          'Expected .pdf, .jpg, .jpeg, or .png.',
      );
  }
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

const PIPELINE_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Core pipeline logic (separated so it can be raced against the timeout)
// ---------------------------------------------------------------------------

async function runPipeline(formId: string, signal: AbortSignal): Promise<void> {
  console.log("1. EXTRACTION STARTED", formId);
  const supabase = createSupabaseServiceClient();

  // 1. Fetch the form row to get source_path.
  const { data: form, error: fetchError } = await supabase
    .from('forms')
    .select('source_path')
    .eq('id', formId)
    .single();

  if (fetchError || !form) {
    throw new Error(
      `Could not fetch form "${formId}": ${fetchError?.message ?? 'row not found'}`,
    );
  }

  if (!form.source_path) {
    throw new Error(`Form "${formId}" has no source_path; nothing to extract.`);
  }

  const storagePath: string = form.source_path;
  const mimeType = mimeFromPath(storagePath);

  // 2. Run the AI extraction.
  const draftSchema = await extractFormSchema(storagePath, mimeType, signal);

  // 3. Persist results.

  // 3a. INSERT extracted fields.
  const fieldsToInsert = draftSchema.fields.map(
    (field: DraftField, index: number) => ({
      form_id: formId,
      position: index,
      label: field.label,
      field_type: field.fieldType,       // camelCase → snake_case column
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,            // jsonb; null for non-radio/checkbox
      confidence: field.confidence,
      confirmed: false,
    }),
  );

  if (fieldsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('fields')
      .insert(fieldsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert extracted fields: ${insertError.message}`);
    }
  }

  // 3b. UPDATE the form with the extracted title, description, and status.
  const { error: updateError } = await supabase
    .from('forms')
    .update({
      title: draftSchema.title,
      description: draftSchema.description,
      status: 'review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId);

  if (updateError) {
    throw new Error(
      `Failed to update form status to "review": ${updateError.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full extraction pipeline for a given form.
 *
 * Downloads the source document, calls GPT-4o Vision, persists the resulting
 * fields, and updates the form status to `'review'`. On any error the form
 * status is set to `'failed'` and the error message is recorded.
 *
 * A 60-second timeout is enforced via `Promise.race`.
 *
 * Requirements: 2.1, 2.5, 2.6
 */
export async function runExtractionPipeline(formId: string): Promise<void> {
  const timeout = AbortSignal.timeout(PIPELINE_TIMEOUT_MS);
  try {
    await runPipeline(formId, timeout);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Best-effort failure update — if this also fails, nothing more we can do.
    const supabase = createSupabaseServiceClient();
    const { error: updateError } = await supabase
      .from('forms')
      .update({
        status: 'failed',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', formId);
    if (updateError) console.error(`Could not mark form ${formId} failed: ${updateError.message}`, err);

    // Re-throw so the caller (e.g. a background trigger) can observe the error.
    throw err;
  }
}
