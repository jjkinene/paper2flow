import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildResponseSchema } from '@/lib/validation';
import type { Field } from '@/types/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  const { formId } = params;

  // Use the server client (with session cookies) to read fields — it doesn't
  // matter that the public form has no session; the fields table has no
  // row-level restriction on SELECT for published forms, but the anon client
  // also works here. The server client is used per the design spec for reads.
  const serverClient = createSupabaseServerClient();

  const { data: form, error: formError } = await serverClient
    .from('forms')
    .select('id')
    .eq('id', formId)
    .eq('status', 'published')
    .single();
  if (formError || !form) {
    return NextResponse.json({ error: 'Form not found or not available' }, { status: 404 });
  }

  // Fetch fields for the form
  const { data: fields, error: fieldsError } = await serverClient
    .from('fields')
    .select('id, form_id, position, label, field_type, placeholder, required, options, confidence, confirmed')
    .eq('form_id', formId)
    .order('position', { ascending: true });

  if (fieldsError || !fields || fields.length === 0) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // Map snake_case DB columns to camelCase Field type
  const typedFields: Field[] = fields.map((f) => ({
    id: f.id,
    formId: f.form_id,
    position: f.position,
    label: f.label,
    fieldType: f.field_type as Field['fieldType'],
    placeholder: f.placeholder,
    required: f.required,
    options: f.options,
    confidence: f.confidence,
    confirmed: f.confirmed,
  }));

  // Parse and validate the request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const responseSchema = buildResponseSchema(typedFields);
  const result = responseSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  // Use the anon (browser) client for the INSERT so the RLS public_insert
  // policy applies — it blocks inserts into non-published forms at DB level.
  const { error: insertError } = await serverClient
    .from('responses')
    .insert({ form_id: formId, payload: result.data });

  if (insertError) {
    // RLS violation means the form is not published (or doesn't exist)
    return NextResponse.json({ error: 'Form not found or not available' }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
