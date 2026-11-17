"use client";

import { useState } from "react";

interface CsvExportButtonProps {
  formId: string;
  responseCount: number;
}

export default function CsvExportButton({
  formId,
  responseCount,
}: CsvExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (responseCount === 0 || exporting) return;

    setExporting(true);
    setError(null);

    try {
      const response = await fetch(`/api/forms/${formId}/export`, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const message = await response.text();
        setError(message || "CSV export failed.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "responses.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("CSV export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const disabled = responseCount === 0 || exporting;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled}
        aria-disabled={disabled}
        title={
          responseCount === 0
            ? "There are no responses to export."
            : "Export responses as CSV"
        }
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? "Exporting..." : "Export CSV"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
