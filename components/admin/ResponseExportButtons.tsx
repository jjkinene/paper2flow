'use client';

import { useState } from 'react';

interface Props { formId: string; responseCount: number }

const formats = [
  { key: 'csv', label: 'Export CSV', file: 'responses.csv' },
  { key: 'pdf', label: 'Export PDF', file: 'responses.pdf' },
  { key: 'docx', label: 'Export Word', file: 'responses.docx' },
] as const;

export default function ResponseExportButtons({ formId, responseCount }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: string, file: string, responseId?: string) {
    if (!responseCount || busy) return;
    setBusy(responseId ? 'response' : format);
    setError(null);
    try {
      const params = new URLSearchParams({ format });
      if (responseId) params.set('responseId', responseId);
      const result = await fetch(`/api/forms/${formId}/export?${params}`, { credentials: 'same-origin' });
      if (!result.ok) {
        setError('Export failed. Please try again.');
        return;
      }
      const url = URL.createObjectURL(await result.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = file;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {formats.map(({ key, label, file }) => (
        <button key={key} type="button" disabled={!responseCount || busy !== null}
          onClick={() => void download(key, file)}
          className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
          {busy === key ? 'Preparing…' : label}
        </button>
      ))}
      {error && <span className="basis-full text-sm text-red-700" role="alert">{error}</span>}
    </div>
  );
}

export function IndividualResponsePdfButton({ formId, responseId, disabled }: { formId: string; responseId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function download() {
    if (busy || disabled) return;
    setBusy(true); setError(false);
    try {
      const params = new URLSearchParams({ format: 'pdf', responseId });
      const result = await fetch(`/api/forms/${formId}/export?${params}`, { credentials: 'same-origin' });
      if (!result.ok) { setError(true); return; }
      const url = URL.createObjectURL(await result.blob());
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'response.pdf';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col items-start">
    <button type="button" onClick={() => void download()} disabled={busy || disabled}
      className="rounded border border-indigo-300 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">
      {busy ? 'Preparing…' : 'Download PDF'}
    </button>
    {error && <span className="mt-1 text-xs text-red-700" role="alert">PDF unavailable</span>}
  </span>;
}
