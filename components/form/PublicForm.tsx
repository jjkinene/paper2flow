'use client';

import React, { useState } from 'react';
import type { FormSchema, Field } from '@/types/schema';
import { buildResponseSchema } from '@/lib/validation';
import { FieldRenderer } from './FieldRenderer';

interface PublicFormProps {
  form: FormSchema;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'networkError';

function initValues(fields: Field[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.id] = field.fieldType === 'checkbox' ? [] : '';
  }
  return values;
}

export function PublicForm({ form }: PublicFormProps) {
  const sortedFields = [...form.fields].sort((a, b) => a.position - b.position);

  const [values, setValues] = useState<Record<string, unknown>>(() => initValues(sortedFields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const handleChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // Clear the error for this field as the user edits it
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side Zod validation
    const schema = buildResponseSchema(sortedFields);
    const result = schema.safeParse(values);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const flatErrors: Record<string, string> = {};
      for (const [key, messages] of Object.entries(fieldErrors)) {
        if (messages && messages.length > 0) {
          flatErrors[key] = messages[0];
        }
      }
      setErrors(flatErrors);
      return;
    }

    setErrors({});
    setSubmitState('submitting');

    try {
      const response = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (response.status === 201) {
        setSubmitState('success');
      } else if (response.status === 422) {
        // Server-side field-level validation errors
        const body = await response.json().catch(() => ({}));
        const serverErrors: Record<string, string> = {};
        if (body && typeof body === 'object' && body.fieldErrors) {
          for (const [key, messages] of Object.entries(
            body.fieldErrors as Record<string, string[]>
          )) {
            if (messages && messages.length > 0) {
              serverErrors[key] = messages[0];
            }
          }
        }
        setErrors(serverErrors);
        setSubmitState('idle');
      } else {
        // Treat unexpected non-success status as a network/server error
        setSubmitState('networkError');
      }
    } catch {
      // fetch threw — network failure
      setSubmitState('networkError');
    }
  };

  if (submitState === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="rounded-lg bg-green-50 border border-green-200 p-8">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-green-800 mb-2">Thank you!</h2>
          <p className="text-green-700">Your response has been submitted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Form header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
        {form.description && (
          <p className="text-gray-800 text-base leading-relaxed">{form.description}</p>
        )}
      </header>

      {/* Network error banner */}
      {submitState === 'networkError' && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3"
        >
          <svg
            className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Something went wrong. Please check your connection and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitState('idle')}
            className="ml-auto flex-shrink-0 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {sortedFields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(value) => handleChange(field.id, value)}
            error={errors[field.id]}
          />
        ))}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitState === 'submitting'}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-md
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitState === 'submitting' ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                Submitting…
              </span>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
