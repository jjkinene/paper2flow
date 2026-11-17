'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from '@/components/admin/FileUploader';
import { uploadDocument } from '@/app/admin/actions';

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleUpload(formData: FormData) {
    setServerError(null);
    setUploading(true);
    setProgress(10);

    try {
      // Simulate incremental progress while the server action runs.
      // The actual upload is a single request, so we advance the bar in steps.
      const tick = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 10 : p));
      }, 400);

      const result = await uploadDocument(formData);

      clearInterval(tick);
      setProgress(100);

      if ('error' in result) {
        setServerError(result.error);
        setUploading(false);
        setProgress(0);
        return;
      }

      // Success — navigate to the extraction status page.
      router.push(`/admin/forms/${result.formId}/status`);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload a Paper Form</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload a scanned PDF, JPG, or PNG and the AI will detect the form structure for you.
        </p>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <FileUploader
          onUpload={handleUpload}
          uploading={uploading}
          progress={progress}
        />

        {/* Server-side error (storage failure, auth error, etc.) */}
        {serverError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span className="font-medium">Upload failed:</span> {serverError}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="mt-4 text-center">
        <a
          href="/admin"
          className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline"
        >
          ← Back to dashboard
        </a>
      </div>
    </div>
  );
}
