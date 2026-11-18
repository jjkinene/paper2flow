import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ReviewPageClient from './ReviewPageClient';
import type { Field } from '@/types/schema';

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function ReviewPage({ params }: PageProps) {
  // 1. Authenticate the user.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Unwrap params (Next.js 15 async params pattern).
  const { formId } = await params;

  // 3. Load the form.
  const { data: formData, error: formError } = await supabase
    .from('forms')
    .select('id, owner_id, title, description, status, slug')
    .eq('id', formId)
    .single();

  if (formError || !formData) {
    redirect('/admin');
  }

  // 4. Verify ownership.
  if ((formData as { id: string; owner_id: string; title: string; description: string; status: string }).owner_id !== user.id) {
    redirect('/admin');
  }

  const form = formData as { id: string; owner_id: string; title: string; description: string; status: string; slug: string | null };

  // 5. Load fields.
  const { data: fieldsData, error: fieldsError } = await supabase
    .from('fields')
    .select('*')
    .eq('form_id', formId)
    .order('position', { ascending: true });

  if (fieldsError) {
    redirect('/admin');
  }

  // 6. Map DB rows to the Field interface.
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

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin" className="inline-flex text-sm font-semibold text-indigo-700 hover:underline">← Back to dashboard</Link>
        <h1 className="text-3xl font-bold text-gray-900">Review Form</h1>
        <p className="text-sm text-gray-800">
          Edit the form fields, title, and description before publishing.
        </p>
      </header>

      <ReviewPageClient
        formId={formId}
        initialTitle={form.title}
        initialDescription={form.description}
        initialFields={fields}
        initialSlug={form.slug}
      />
    </main>
  );
}
