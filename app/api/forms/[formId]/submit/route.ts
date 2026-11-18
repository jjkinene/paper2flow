import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { buildResponseSchema } from '@/lib/validation';
import { normalizeResponsePayload } from '@/lib/response-data';
import type { Field } from '@/types/schema';

// Bound the request before JSON parsing. A normal text form fits within 256 KB.
const MAX_SUBMISSION_BYTES = 256 * 1024;

async function readLimitedBody(request: NextRequest): Promise<string | null> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_SUBMISSION_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SUBMISSION_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    return null;
  }
}

// Best-effort throttling identity. Behind Vercel the forwarded IP is supplied
// by the platform; use a trusted proxy that replaces this header in production.
// No raw IP address is stored in the database.
function getRateLimitIdentity(request: NextRequest, formId: string): string {
  const forwarded = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for');
  const rawIp = forwarded?.split(',')[0]?.trim();
  const ip = rawIp && rawIp.length <= 80 ? rawIp : 'missing-ip';
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(`${formId}:${ip}`)
    .digest('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { formId: string } },
) {
  const { formId } = params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId)) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return NextResponse.json({ error: 'Expected application/json' }, { status: 415 });
  }

  // Read only publicly published forms and their fields via the RLS client.
  const publicClient = createSupabaseServerClient();
  const { data: form, error: formError } = await publicClient
    .from('forms')
    .select('id')
    .eq('id', formId)
    .eq('status', 'published')
    .maybeSingle();
  if (formError || !form) {
    return NextResponse.json({ error: 'Form not found or not available' }, { status: 404 });
  }

  const { data: fields, error: fieldsError } = await publicClient
    .from('fields')
    .select('id, form_id, position, label, field_type, placeholder, required, options, confidence, confirmed')
    .eq('form_id', formId)
    .order('position', { ascending: true });

  if (fieldsError || !fields?.length) {
    return NextResponse.json({ error: 'Form fields are unavailable' }, { status: 404 });
  }

  const typedFields: Field[] = fields.map((f) => ({
    id: f.id,
    formId: f.form_id,
    position: f.position,
    label: f.label,
    fieldType: f.field_type as Field['fieldType'],
    placeholder: f.placeholder ?? '',
    required: f.required,
    options: f.options,
    confidence: f.confidence,
    confirmed: f.confirmed,
  }));

  const raw = await readLimitedBody(request);
  if (raw === null) {
    return NextResponse.json({ error: 'Invalid or oversized submission (maximum 256 KB)' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = buildResponseSchema(typedFields).safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { fieldErrors: result.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Only the trusted server may write responses. The DB function checks that
  // the form is STILL published, rate-limits atomically, then inserts.
  const serviceClient = createSupabaseServiceClient();
  const responsePayload = normalizeResponsePayload(result.data, typedFields);
  const { data: resultStatus, error: insertError } = await serviceClient.rpc(
    'submit_public_response',
    {
      p_form_id: formId,
      p_payload: responsePayload,
      p_identity_hash: getRateLimitIdentity(request, formId),
    },
  );

  if (insertError) {
    // Never log provider/database diagnostics that could contain submitted data.
    console.error('Public form submission could not be stored.');
    return NextResponse.json({ error: 'Submission temporarily unavailable' }, { status: 503 });
  }
  if (resultStatus === 'not_found') {
    return NextResponse.json({ error: 'Form not found or not available' }, { status: 404 });
  }
  if (resultStatus === 'rate_limited') {
    return NextResponse.json(
      { error: 'Too many responses. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '600' } },
    );
  }
  if (resultStatus !== 'submitted') {
    return NextResponse.json({ error: 'Submission temporarily unavailable' }, { status: 503 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
