import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCsv } from '@/lib/csv';
import type { Field, Response } from '@/types/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: { formId: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { formId } = params;
  const { data: form, error: formError } = await supabase
    .from('forms').select('id').eq('id', formId).eq('owner_id', user.id).single();
  if (formError || !form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const [{ data: fields, error: fieldsError }, { data: responses, error: responsesError }] = await Promise.all([
    supabase.from('fields').select('id, position, label, field_type').eq('form_id', formId).order('position', { ascending: true }),
    supabase.from('responses').select('id, form_id, submitted_at, payload').eq('form_id', formId).order('submitted_at', { ascending: false }),
  ]);
  if (fieldsError) return NextResponse.json({ error: 'Could not load form fields' }, { status: 500 });
  if (responsesError) return NextResponse.json({ error: 'Could not load responses' }, { status: 500 });
  if (!responses?.length) return NextResponse.json({ error: 'No responses available for export' }, { status: 400 });

  const csv = formatCsv(fields as unknown as Field[], responses as unknown as Response[]);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="responses.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
