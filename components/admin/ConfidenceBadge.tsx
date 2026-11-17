'use client';

import { useState, useTransition } from 'react';
import { suppressFlag } from '@/app/admin/actions';
import { LOW_CONFIDENCE_THRESHOLD } from '@/lib/constants';

interface ConfidenceBadgeProps {
  fieldId: string;
  confidence: number | null;
  confirmed: boolean;
}

export default function ConfidenceBadge({
  fieldId,
  confidence,
  confirmed: initialConfirmed,
}: ConfidenceBadgeProps) {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [isPending, startTransition] = useTransition();

  // Manually-added fields (confidence === null) have no badge to show.
  if (confidence === null) return null;

  const isLow = !confirmed && confidence < LOW_CONFIDENCE_THRESHOLD;

  function handleSuppress() {
    startTransition(async () => {
      await suppressFlag(fieldId);
      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <span
        aria-label={`Confidence score ${confidence.toFixed(2)}, confirmed`}
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
      >
        <svg
          className="h-3.5 w-3.5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        {confidence.toFixed(2)}
      </span>
    );
  }

  if (isLow) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-label={`Low confidence score: ${confidence.toFixed(2)}`}
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
        >
          <svg
            className="h-3.5 w-3.5"
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
          {confidence.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={handleSuppress}
          disabled={isPending}
          aria-label="Suppress low-confidence flag for this field"
          className="rounded px-1.5 py-0.5 text-xs font-medium text-amber-700 underline hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Suppress Flag'}
        </button>
      </span>
    );
  }

  // Confidence is at or above threshold and not confirmed — show a neutral badge.
  return (
    <span
      aria-label={`Confidence score: ${confidence.toFixed(2)}`}
      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
    >
      {confidence.toFixed(2)}
    </span>
  );
}
