'use client';

import { useState, useTransition } from 'react';
import FormBuilder from '@/components/admin/FormBuilder';
import { saveFormSchema } from '@/app/admin/actions';
import type { Field } from '@/types/schema';
import PublishButton from '@/components/admin/PublishButton';
import ShareUrlDisplay from '@/components/admin/ShareUrlDisplay';

interface ReviewPageClientProps {
  formId: string;
  initialTitle: string;
  initialDescription: string;
  initialFields: Field[];
  initialSlug: string | null;
}

export default function ReviewPageClient({
  formId,
  initialTitle,
  initialDescription,
  initialFields,
  initialSlug,
}: ReviewPageClientProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [slug, setSlug] = useState<string | null>(initialSlug);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSuccessMessage(null);
    setErrors({});

    startTransition(async () => {
      const result = await saveFormSchema(formId, { title, description, fields });
      if (result.errors && Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
      } else {
        setSuccessMessage('Form saved successfully.');
      }
    });
  }

  // Helper: get a field-level error by zero-based field index and property name.
  function fieldError(index: number, prop: string): string | undefined {
    return errors[`fields.${index}.${prop}`];
  }

  return (
    <div className="space-y-8">
      {/* Title & Description */}
      <section className="space-y-4">
        <div>
          <label
            htmlFor="form-title"
            className="block text-sm font-medium text-gray-700"
          >
            Form Title
          </label>
          <input
            id="form-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Enter form title"
          />
          {errors['title'] && (
            <p className="mt-1 text-xs text-red-600">{errors['title']}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="form-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="form-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Optional description shown to respondents"
          />
          {errors['description'] && (
            <p className="mt-1 text-xs text-red-600">{errors['description']}</p>
          )}
        </div>
      </section>

      {/* Form-level error (e.g. "Form must have at least one field") */}
      {errors['fields'] && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors['fields']}
        </p>
      )}
      {errors['_form'] && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors['_form']}
        </p>
      )}

      {/* Field-level errors summary (non-title/description) */}
      {Object.entries(errors).some(([k]) => k.startsWith('fields.') && !k.includes('fields.') === false && k !== 'fields') && (
        <ul className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1 list-disc list-inside">
          {Object.entries(errors)
            .filter(([k]) => k.startsWith('fields.') && k !== 'fields')
            .map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
        </ul>
      )}

      {/* FormBuilder */}
      <FormBuilder fields={fields} onChange={setFields} />

      {/* Individual field validation errors rendered inline in FormBuilder aren't
          surfaced here directly — the server returns them keyed as fields.N.prop.
          We surface those above in the error list. */}

      {/* Success feedback */}
      {successMessage && (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {successMessage}
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          {slug && <ShareUrlDisplay slug={slug} />}
        </div>
        <PublishButton formId={formId} fields={fields} onPublished={setSlug} />
      </div>
    </div>
  );
}
