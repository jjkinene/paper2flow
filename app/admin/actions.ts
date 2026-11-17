'use server';
import { runExtractionPipeline } from "@/lib/extraction/pipeline";
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { FormSchemaZod } from '@/lib/validation';
import type { Field } from '@/types/schema';

// ---------------------------------------------------------------------------
// MIME type → file extension
// ---------------------------------------------------------------------------
function getExtension(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return 'bin';
  }
}

// ---------------------------------------------------------------------------
// uploadDocument
// Uploads the source document to Supabase Storage and creates a forms row.
// Returns { formId } on success or { error } on storage failure.
// Kicks off the extraction pipeline as a non-blocking side-effect.
// ---------------------------------------------------------------------------
export async function uploadDocument(
  formData: FormData
): Promise<{ formId: string } | { error: string }> {
  // 1. Authenticate the requesting user.
  const serverClient = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Extract the file from FormData.
  const file = formData.get('file') as File | null;
  if (!file) {
    return { error: 'No file provided.' };
  }

  // 3. Derive storage path components.
  const formId = crypto.randomUUID();
  const ext = getExtension(file.type);
  const storagePath = `${user.id}/${formId}/original.${ext}`;

  // 4. Upload to Supabase Storage using the service-role client.
  const serviceClient = createSupabaseServiceClient();
  const fileBytes = await file.arrayBuffer();

  const { error: storageError } = await serviceClient.storage
    .from('source-documents')
    .upload(storagePath, fileBytes, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    return { error: `Storage upload failed: ${storageError.message}` };
  }

  // 5. INSERT the forms row (status = 'processing') only after a successful upload.
  const { error: dbError } = await serviceClient
    .from('forms')
    .insert({
      id: formId,
      owner_id: user.id,
      status: 'processing',
      source_path: storagePath,
    });

  if (dbError) {
    // Roll back the uploaded file so we don't leave orphaned storage objects.
    await serviceClient.storage
      .from('source-documents')
      .remove([storagePath]);
    return { error: `Database insert failed: ${dbError.message}` };
  }

  // 6. Kick off the extraction pipeline as a non-blocking call.
  //    runExtractionPipeline is implemented in Task 5 (lib/extraction/pipeline.ts).
  //    We use a string path with require() so TypeScript does not resolve the
  //    module at compile time; the try/catch swallows the error if the module
  //    does not exist yet.
  try {
  await runExtractionPipeline(formId);
} catch (error) {
  console.error("EXTRACTION START ERROR:", error);
}

  return { formId };
}

// ---------------------------------------------------------------------------
// suppressFlag
// Sets fields.confirmed = true for the given field, verifying the requesting
// user owns the parent form before updating.
// ---------------------------------------------------------------------------
export async function suppressFlag(fieldId: string): Promise<void> {
  const serverClient = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify the field belongs to a form owned by the requesting user before
  // updating, so we don't expose other users' data.
  const { data: field, error: fetchError } = await serverClient
    .from('fields')
    .select('id, form_id, forms!inner(owner_id)')
    .eq('id', fieldId)
    .single();

  if (fetchError || !field) {
    throw new Error('Field not found.');
  }

  // Type assertion: Supabase infers a complex joined type; we only need owner_id.
  const ownerRecord = field.forms as unknown as { owner_id: string } | { owner_id: string }[];
  const ownerId = Array.isArray(ownerRecord) ? ownerRecord[0]?.owner_id : ownerRecord?.owner_id;

  if (ownerId !== user.id) {
    throw new Error('Unauthorised.');
  }

  const { error: updateError } = await serverClient
    .from('fields')
    .update({ confirmed: true })
    .eq('id', fieldId);

  if (updateError) {
    throw new Error(`Failed to suppress flag: ${updateError.message}`);
  }
}

// ---------------------------------------------------------------------------
// saveFormSchema
// Validates the schema with Zod, then:
//   - UPSERTs all fields rows
//   - Deletes any fields that were removed
//   - UPDATEs forms.title, forms.description, forms.updated_at
// Returns {} on success or { errors: Record<string, string> } on validation failure.
// ---------------------------------------------------------------------------
export async function saveFormSchema(
  formId: string,
  schema: { title: string; description: string; fields: Field[] }
): Promise<{ errors?: Record<string, string> }> {
  // 1. Authenticate the requesting user.
  const serverClient = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Verify the form exists and belongs to this user.
  const { data: form, error: formFetchError } = await serverClient
    .from('forms')
    .select('id, owner_id')
    .eq('id', formId)
    .single();

  if (formFetchError || !form) {
    return { errors: { _form: 'Form not found.' } };
  }

  if ((form as { id: string; owner_id: string }).owner_id !== user.id) {
    return { errors: { _form: 'Unauthorised.' } };
  }

  // 3. Validate the schema.
  const parseResult = FormSchemaZod.safeParse(schema);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      // Build a human-readable key from the path, e.g. "fields.0.label".
      const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { errors: fieldErrors };
  }

  const { title, description, fields: validatedFields } = parseResult.data;

  // Merge confidence values back from the raw input — the Zod FieldSchema does
  // not include confidence because it is assigned by the AI pipeline, not the
  // reviewer.  We use a lookup map so we don't pass unsanitised data for any
  // other property.
  const confidenceByFieldId = new Map<string, number | null>(
    schema.fields.map((f) => [f.id, f.confidence ?? null])
  );
  const fields = validatedFields.map((f) => ({
    ...f,
    confidence: confidenceByFieldId.get(f.id) ?? null,
  }));

  // 4. Fetch the current field IDs to detect deletions.
  const { data: existingFields, error: fetchFieldsError } = await serverClient
    .from('fields')
    .select('id')
    .eq('form_id', formId);

  if (fetchFieldsError) {
    return { errors: { _form: `Failed to fetch existing fields: ${fetchFieldsError.message}` } };
  }

  const incomingIds = new Set(fields.map((f) => f.id));
  const idsToDelete = (existingFields ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id) => !incomingIds.has(id));

  // 5. Delete removed fields.
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await serverClient
      .from('fields')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return { errors: { _form: `Failed to delete removed fields: ${deleteError.message}` } };
    }
  }

  // 6. UPSERT all incoming fields.
  const fieldRows = fields.map((f) => ({
    id: f.id,
    form_id: formId,
    position: f.position,
    label: f.label,
    field_type: f.fieldType,
    placeholder: f.placeholder,
    required: f.required,
    options: f.options,
    confidence: f.confidence,
    confirmed: f.confirmed,
  }));

  if (fieldRows.length > 0) {
    const { error: upsertError } = await serverClient
      .from('fields')
      .upsert(fieldRows, { onConflict: 'id' });

    if (upsertError) {
      return { errors: { _form: `Failed to save fields: ${upsertError.message}` } };
    }
  }

  // 7. UPDATE the form title, description, and updated_at.
  const { error: updateError } = await serverClient
    .from('forms')
    .update({
      title,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId);

  if (updateError) {
    return { errors: { _form: `Failed to update form: ${updateError.message}` } };
  }

  return {};
}

// ---------------------------------------------------------------------------
// publishForm
// Generates a URL-safe slug, marks the form as published, and returns the slug.
// Requirements: 5.1, 5.2
// ---------------------------------------------------------------------------
export async function publishForm(
  formId: string
): Promise<{ slug: string } | { error: string }> {
  // 1. Authenticate the requesting user.
  const serverClient = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch the form and verify ownership.
  const { data: form, error: fetchError } = await serverClient
    .from('forms')
    .select('id, owner_id, title, slug')
    .eq('id', formId)
    .single();

  if (fetchError || !form) {
    return { error: 'Form not found.' };
  }

  if ((form as { id: string; owner_id: string; title: string }).owner_id !== user.id) {
    return { error: 'Unauthorised.' };
  }

  // 3. Reuse an existing public URL or generate a new unique slug.
  const { nanoid } = await import('nanoid');
  const rawTitle = (form as { title: string }).title ?? '';
  const sanitisedTitle = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // replace non-alphanumeric runs with a hyphen
    .replace(/^-+|-+$/g, '');       // trim leading/trailing hyphens

  const existingSlug = (form as { slug?: string | null }).slug;
  const suffix = nanoid(12);
  const slug = existingSlug ?? (sanitisedTitle.length > 0 ? `${sanitisedTitle}-${suffix}` : suffix);

  // 4. UPDATE the forms row.
  const { error: updateError } = await serverClient
    .from('forms')
    .update({
      status: 'published',
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId)
    .eq('owner_id', user.id)
    .select('id')
    .single();

  if (updateError) {
    return { error: `Failed to publish form: ${updateError.message}` };
  }

  return { slug };
}

// ---------------------------------------------------------------------------
// unpublishForm
// Sets the form status to 'unpublished'. Existing responses are retained.
// Requirements: 5.4, 5.5
// ---------------------------------------------------------------------------
export async function unpublishForm(
  formId: string
): Promise<void | { error: string }> {
  // 1. Authenticate the requesting user.
  const serverClient = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch the form and verify ownership.
  const { data: form, error: fetchError } = await serverClient
    .from('forms')
    .select('id, owner_id')
    .eq('id', formId)
    .single();

  if (fetchError || !form) {
    return { error: 'Form not found.' };
  }

  if ((form as { id: string; owner_id: string }).owner_id !== user.id) {
    return { error: 'Unauthorised.' };
  }

  // 3. UPDATE the forms row.
  const { error: updateError } = await serverClient
    .from('forms')
    .update({
      status: 'unpublished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', formId);

  if (updateError) {
    return { error: `Failed to unpublish form: ${updateError.message}` };
  }
}

// ---------------------------------------------------------------------------
// signOut (used by SignOutButton)
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
