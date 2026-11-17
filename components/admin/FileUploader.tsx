'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_SIZE_LABEL = '20 MB';

interface FileUploaderProps {
  /** Called with the FormData once the user confirms the file. */
  onUpload: (formData: FormData) => Promise<void>;
  /** Whether an upload is currently in progress (shows progress UI). */
  uploading?: boolean;
  /** Upload progress percentage 0–100. */
  progress?: number;
}

export default function FileUploader({
  onUpload,
  uploading = false,
  progress = 0,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return 'Unsupported format. Please upload a PDF, JPG, or PNG file.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. The maximum allowed size is ${MAX_SIZE_LABEL}.`;
    }
    return null;
  }

  function handleFileChange(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
    } else {
      setError(null);
      setSelectedFile(file);
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    await onUpload(formData);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="File upload area. Click or drag and drop a file here."
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={[
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50',
          uploading ? 'pointer-events-none opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Upload icon */}
        <svg
          className="mb-3 h-10 w-10 text-gray-400"
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
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>

        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
            <p className="text-xs text-indigo-600">Click to choose a different file</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              Drag &amp; drop your file here, or{' '}
              <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-gray-500">PDF, JPG, or PNG · Max {MAX_SIZE_LABEL}</p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        onChange={onInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Validation error */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Progress bar */}
      {uploading && (
        <div aria-label={`Upload progress: ${progress}%`} className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-500">{progress}%</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!selectedFile || !!error || uploading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload Document'}
      </button>
    </form>
  );
}
