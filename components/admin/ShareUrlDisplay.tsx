'use client';

import { useState } from 'react';

interface ShareUrlDisplayProps {
  slug: string;
}

export default function ShareUrlDisplay({ slug }: ShareUrlDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Build the full shareable URL from the current origin at render time.
  // Falls back to a relative path during SSR (this component is client-only).
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/f/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      // Reset the "Copied!" indicator after 2 seconds.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available (non-HTTPS dev or permissions denied) —
      // fall back to selecting the text in the input so the user can copy manually.
      const input = document.getElementById('share-url-input') as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="mb-2 text-sm font-medium text-green-800">
        Your form is live! Share this link with respondents:
      </p>

      <div className="flex items-center gap-2">
        {/* Read-only URL display */}
        <div className="relative flex-1">
          <input
            id="share-url-input"
            type="url"
            readOnly
            value={shareUrl}
            aria-label="Shareable form URL"
            className="w-full rounded-md border border-green-300 bg-white py-2 pl-3 pr-3 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 select-all"
            onFocus={(e) => e.target.select()}
          />
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'URL copied to clipboard' : 'Copy shareable URL to clipboard'}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            copied
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {copied ? (
            <>
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Copied!
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
                  d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                />
              </svg>
              Copy link
            </>
          )}
        </button>
      </div>

      {/* Direct link */}
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 underline hover:text-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded"
      >
        Open form in new tab
        <svg
          className="h-3 w-3"
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
            d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </a>
    </div>
  );
}
