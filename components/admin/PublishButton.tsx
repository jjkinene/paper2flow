'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOW_CONFIDENCE_THRESHOLD } from '@/lib/constants';
import type { Field } from '@/types/schema';

interface PublishButtonProps {
  formId: string;
  fields: Field[];
  onPublished?: (slug: string) => void;
}

function countUnresolved(fields: Field[]): number {
  return fields.filter(
    (f) => f.confidence !== null && f.confidence < LOW_CONFIDENCE_THRESHOLD && !f.confirmed
  ).length;
}

export default function PublishButton({ formId, fields, onPublished }: PublishButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unresolvedCount = countUnresolved(fields);

  async function doPublish() {
    setError(null);
    startTransition(async () => {
      try {
        // publishForm is implemented in task 8.2; imported dynamically and cast
        // through unknown so this component compiles before that task is complete.
        const actions = await import('@/app/admin/actions') as unknown as {
          publishForm: (formId: string) => Promise<{ slug: string } | { error: string }>;
        };
        const { publishForm } = actions;
        const result = await publishForm(formId);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        setShowDialog(false);
        if (onPublished) {
          onPublished(result.slug);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  }

  function handleClick() {
    if (unresolvedCount > 0) {
      setShowDialog(true);
    } else {
      doPublish();
    }
  }

  return (
    <>
      {/* Publish button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={
          unresolvedCount > 0
            ? `Publish form — ${unresolvedCount} low-confidence field${unresolvedCount === 1 ? '' : 's'} require attention`
            : 'Publish form'
        }
        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <>
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
            Publishing…
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
              />
            </svg>
            Publish
            {unresolvedCount > 0 && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-flex items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-amber-900"
              >
                {unresolvedCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Inline error message */}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Warning dialog */}
      {showDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-dialog-title"
          aria-describedby="publish-dialog-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => !isPending && setShowDialog(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            {/* Icon + title */}
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg
                  className="h-5 w-5 text-amber-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </span>
              <div>
                <h2 id="publish-dialog-title" className="text-base font-semibold text-gray-900">
                  Unresolved low-confidence fields
                </h2>
                <p id="publish-dialog-desc" className="mt-1.5 text-sm text-gray-600">
                  {unresolvedCount === 1
                    ? '1 field has a low confidence score and has not been reviewed.'
                    : `${unresolvedCount} fields have low confidence scores and have not been reviewed.`}{' '}
                  Publishing now may result in an inaccurate form. You can suppress the flag on each
                  field to confirm it looks correct before publishing.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Go back and review
              </button>
              <button
                type="button"
                onClick={doPublish}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
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
                    Publishing…
                  </>
                ) : (
                  'Publish anyway'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
