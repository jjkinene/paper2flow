import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ResponseTable from '@/components/admin/ResponseTable';
import CsvExportButton from '@/components/admin/CsvExportButton';
import type { Field, Response } from '@/types/schema';

const PAGE_SIZE = 50;

interface PageProps {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ResponsesPage({ params, searchParams }: PageProps) {
  // 1. Authenticate the user.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Unwrap params and search params (Next.js 15 async pattern).
  const { formId } = await params;
  const { page: pageParam } = await searchParams;

  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10));

  // 3. Load the form and verify ownership.
  const { data: formData, error: formError } = await supabase
    .from('forms')
    .select('id, owner_id, title')
    .eq('id', formId)
    .single();

  if (formError || !formData) {
    notFound();
  }

  const form = formData as { id: string; owner_id: string; title: string };

  if (form.owner_id !== user.id) {
    notFound();
  }

  // 4. Load fields (ordered by position).
  const { data: fieldsData, error: fieldsError } = await supabase
    .from('fields')
    .select('*')
    .eq('form_id', formId)
    .order('position', { ascending: true });

  if (fieldsError) {
    redirect('/admin');
  }

  const fields: Field[] = (fieldsData ?? []).map((row: {
    id: string;
    form_id: string;
    position: number;
    label: string;
    field_type: string;
    placeholder: string;
    required: boolean;
    options: unknown;
    confidence: number | null;
    confirmed: boolean;
  }) => ({
    id: row.id,
    formId: row.form_id,
    position: row.position,
    label: row.label,
    fieldType: row.field_type as 'text' | 'number' | 'date' | 'checkbox' | 'radio' | 'textarea',
    placeholder: row.placeholder,
    required: row.required,
    options: row.options as { label: string; value: string }[] | null,
    confidence: row.confidence,
    confirmed: row.confirmed,
  }));

  // 5. Count total responses.
  const { count: totalCount, error: countError } = await supabase
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId);

  if (countError) {
    redirect('/admin');
  }

  const safeCount = totalCount ?? 0;

  // 6. Load the requested page of responses (newest first).
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { data: responsesData, error: responsesError } = await supabase
    .from('responses')
    .select('id, form_id, submitted_at, payload')
    .eq('form_id', formId)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (responsesError) {
    redirect('/admin');
  }

  const responses: Response[] = (responsesData ?? []).map((row: {
    id: string;
    form_id: string;
    submitted_at: string;
    payload: Record<string, unknown>;
  }) => ({
    id: row.id,
    formId: row.form_id,
    submittedAt: row.submitted_at,
    payload: row.payload,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Link href="/admin" className="inline-flex text-sm font-semibold text-indigo-700 hover:underline">← Back to dashboard</Link>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            All submissions for this form
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CsvExportButton formId={formId} responseCount={safeCount} />
        </div>
      </header>

      {/* Responses table */}
      <ResponseTable
        fields={fields}
        responses={responses}
        totalCount={safeCount}
        currentPage={currentPage}
      />
    </div>
  );
}
