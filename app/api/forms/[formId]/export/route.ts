import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatCsv } from '@/lib/csv';
import { formatResponsesDocx, formatResponsesPdf } from '@/lib/response-export';
import type { Field, Response } from '@/types/schema';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { formId: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { formId } = params;
  const { data: form, error: formError } = await supabase
    .from('forms').select('id, title').eq('id', formId).eq('owner_id', user.id).single();
  if (formError || !form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

  const search = _request.nextUrl.searchParams;
  const format = search.get('format') ?? 'csv';
  if (!['csv', 'pdf', 'docx'].includes(format)) {
    return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
  }
  const responseId = search.get('responseId');
  if (responseId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responseId)) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 });
  }

  const [{ data: fields, error: fieldsError }, { data: responses, error: responsesError }] = await Promise.all([
    supabase.from('fields').select('id, position, label, field_type').eq('form_id', formId).order('position', { ascending: true }),
    (() => {
      let query = supabase.from('responses').select('id, form_id, submitted_at, payload').eq('form_id', formId).order('submitted_at', { ascending: false });
      if (responseId) query = query.eq('id', responseId);
      return query;
    })(),
  ]);
  if (fieldsError) return NextResponse.json({ error: 'Could not load form fields' }, { status: 500 });
  if (responsesError) return NextResponse.json({ error: 'Could not load responses' }, { status: 500 });
  if (!responses?.length) return NextResponse.json(
    { error: 'No responses available for export' },
    { status: format === 'csv' ? 400 : 404 },
  );

  const typedFields = fields as unknown as Field[];
  const typedResponses: Response[] = (responses as unknown as Array<{
    id: string; form_id: string; submitted_at: string; payload: Record<string, unknown>;
  }>).map((row) => ({ id: row.id, formId: row.form_id, submittedAt: row.submitted_at, payload: row.payload }));
  const stem = responseId ? 'response' : 'responses';

  if (format === 'pdf') {
    const pdf = formatResponsesPdf(form.title, typedFields, typedResponses);
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${stem}.pdf"`, 'Cache-Control': 'no-store',
    } });
  }
  if (format === 'docx') {
    const docx = formatResponsesDocx(form.title, typedFields, typedResponses);
    return new NextResponse(new Uint8Array(docx), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${stem}.docx"`, 'Cache-Control': 'no-store',
    } });
  }

  const csv = formatCsv(typedFields, typedResponses);
  return new NextResponse(csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="responses.csv"',
    'Cache-Control': 'no-store',
  } });
}
