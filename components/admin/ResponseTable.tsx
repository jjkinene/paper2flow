'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Field, Response } from '@/types/schema';
import { formatResponseAnswer, getResponseAnswer } from '@/lib/response-data';
import { IndividualResponsePdfButton } from './ResponseExportButtons';

const PAGE_SIZE = 50;

interface ResponseTableProps {
  fields: Field[];
  responses: Response[];
  totalCount: number;
  currentPage: number;
}

/** Format a cell value for display. Arrays (checkbox answers) become comma-separated strings. */
/** Format an ISO 8601 timestamp as a readable local date+time string. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ResponseTable({
  fields,
  responses,
  totalCount,
  currentPage,
}: ResponseTableProps) {
  const pathname = usePathname();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  function pageHref(page: number) {
    return `${pathname}?page=${page}`;
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <svg
          className="mx-auto mb-4 h-10 w-10 text-gray-300"
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
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
          />
        </svg>
        <p className="text-base font-medium text-gray-800">No responses yet</p>
        <p className="mt-1 text-sm text-gray-700">
          Responses will appear here once people submit the published form.
        </p>
      </div>
    );
  }

  // ── Populated table ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Count summary */}
      <p className="text-sm text-gray-800">
        <span className="font-semibold text-gray-900">{totalCount}</span>{' '}
        {totalCount === 1 ? 'response' : 'responses'}
        {totalPages > 1 && (
          <span className="text-gray-700">
            {' '}
            — page {currentPage} of {totalPages}
          </span>
        )}
      </p>

      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm text-gray-900">
          <thead className="bg-gray-50">
            <tr>
              {/* Fixed first column */}
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-700"
              >
                Submitted At
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-700">Export</th>
              {fields.map((field) => (
                <th
                  key={field.id}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-700"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {responses.map((response, rowIndex) => (
              <tr
                key={response.id}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                  {formatDate(response.submittedAt)}
                </td>
                <td className="px-4 py-3">
                  <IndividualResponsePdfButton formId={response.formId} responseId={response.id} />
                </td>
                {fields.map((field) => (
                  <td key={field.id} className="px-4 py-3 text-gray-800">
                    {formatResponseAnswer(getResponseAnswer(response.payload, field))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav
          aria-label="Response pagination"
          className="flex items-center justify-between pt-2"
        >
          <Link
            href={pageHref(currentPage - 1)}
            aria-disabled={isFirstPage}
            aria-label="Previous page"
            className={
              isFirstPage
                ? 'pointer-events-none inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-300 cursor-not-allowed'
                : 'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
            }
            tabIndex={isFirstPage ? -1 : undefined}
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
            Previous
          </Link>

          <span className="text-sm text-gray-800">
            {currentPage} / {totalPages}
          </span>

          <Link
            href={pageHref(currentPage + 1)}
            aria-disabled={isLastPage}
            aria-label="Next page"
            className={
              isLastPage
                ? 'pointer-events-none inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-300 cursor-not-allowed'
                : 'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
            }
            tabIndex={isLastPage ? -1 : undefined}
          >
            Next
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </nav>
      )}
    </div>
  );
}
