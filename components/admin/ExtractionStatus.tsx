'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ExtractionStatusProps {
  formId: string;
}

type Status = 'pending' | 'processing' | 'ready' | 'failed';

interface StatusResponse {
  status: Status;
  fieldCount?: number;
  error?: string | null;
}

export default function ExtractionStatus({ formId }: ExtractionStatusProps) {
  const [status, setStatus] = useState<Status>('pending');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let isActive = true;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/forms/${formId}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch extraction status');
        }

        const data: StatusResponse = await response.json();

        if (!isActive) return;

        setStatus(data.status);
        if (data.status === 'failed') setError(data.error || 'Extraction failed. Try uploading the document again.');

        // Handle terminal states
        if (data.status === 'ready') {
          // Stop polling and redirect to review page
          if (intervalId) clearInterval(intervalId);
          router.push(`/admin/forms/${formId}/review`);
        } else if (data.status === 'failed') {
          // Stop polling on failure
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'An error occurred');
        if (intervalId) clearInterval(intervalId);
      }
    }

    // Start extraction independently from the upload server action.
    // The API atomically claims draft forms, so StrictMode/multiple tabs
    // cannot start duplicate OpenAI requests.
    async function startExtraction() {
      try {
        await fetch(`/api/forms/${formId}/extract`, {
          method: 'POST',
          cache: 'no-store',
        });
        if (isActive) void pollStatus();
      } catch (cause) {
        // Polling remains authoritative: the database may still be processing.
        console.error('Extraction start request failed:', cause);
      }
    }
    void startExtraction();

    // Initial poll
    void pollStatus();

    // Set up polling every 2 seconds
    intervalId = setInterval(() => { void pollStatus(); }, 2000);

    // Cleanup on unmount
    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [formId, router]);

  // Failed state
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 px-6 py-12 text-center">
        <svg
          className="mb-4 h-12 w-12 text-red-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <h2 className="mb-2 text-lg font-semibold text-red-900">Extraction Failed</h2>
        <p className="mb-6 text-sm text-red-700">{error || "We couldn't extract the form structure. Try a clear PDF, JPG, or PNG."}</p>
        <Link
          href="/admin/upload"
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Upload a Different Document
        </Link>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-red-200 bg-red-50 px-6 py-12 text-center">
        <svg
          className="mb-4 h-12 w-12 text-red-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <h2 className="mb-2 text-lg font-semibold text-red-900">Error Loading Status</h2>
        <p className="mb-6 text-sm text-red-700">{error}</p>
        <Link
          href="/admin/upload"
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Try Uploading Again
        </Link>
      </div>
    );
  }

  // Processing state (pending or processing)
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 px-6 py-12 text-center">
      {/* Spinner */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Extracting form structure from document"
        className="mb-4"
      >
        <svg
          className="h-12 w-12 animate-spin text-indigo-600"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-indigo-900">
        {status === 'pending' ? 'Starting extraction…' : 'Extracting form structure…'}
      </h2>
      <p className="text-sm text-indigo-700">
        We're analyzing your document and detecting fields. This usually takes 30–60 seconds.
      </p>
    </div>
  );
}
