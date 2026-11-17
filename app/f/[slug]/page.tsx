import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PublicForm } from '@/components/form/PublicForm';
import type { FormSchema, Field } from '@/types/schema';

interface PageProps {
  params: { slug: string };
}

async function getPublishedForm(slug: string): Promise<FormSchema | null> {
  const supabase = createSupabaseServerClient();

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, owner_id, title, description, slug, status')
    .eq('slug', slug)
    .single();

  if (formError || !form) return null;
  if (form.status !== 'published') return null;

  const { data: fields, error: fieldsError } = await supabase
    .from('fields')
    .select(
      'id, form_id, position, label, field_type, placeholder, required, options, confidence, confirmed'
    )
    .eq('form_id', form.id)
    .order('position', { ascending: true });

  if (fieldsError) return null;

  const mappedFields: Field[] = (fields ?? []).map((f) => ({
    id: f.id,
    formId: f.form_id,
    position: f.position,
    label: f.label,
    fieldType: f.field_type,
    placeholder: f.placeholder ?? '',
    required: f.required,
    options: f.options ?? null,
    confidence: f.confidence ?? null,
    confirmed: f.confirmed,
  }));

  return {
    id: form.id,
    ownerId: form.owner_id,
    title: form.title,
    description: form.description ?? '',
    slug: form.slug,
    status: form.status,
    fields: mappedFields,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const form = await getPublishedForm(params.slug);
  return {
    title: form ? form.title : 'Form Unavailable',
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  const form = await getPublishedForm(params.slug);

  if (!form) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm p-10">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h1 className="text-xl font-semibold text-gray-800 mb-2">Form Unavailable</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              This form is not available. It may have been unpublished or the link may be incorrect.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <PublicForm form={form} />
      </div>
    </main>
  );
}
