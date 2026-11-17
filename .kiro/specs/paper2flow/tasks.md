# Implementation Plan: Paper2Flow

## Overview

Build Paper2Flow as a Next.js 14 App Router application with TypeScript, Tailwind CSS, Supabase,
and Zod. Tasks are ordered foundation-first: project scaffold → database → auth → upload →
extraction pipeline → form builder → publish → public form → submission → responses → CSV export
→ dashboard → tests.

## Tasks

- [x] 1. Project scaffold and shared types
  - [x] 1.1 Initialise Next.js 14 App Router project with TypeScript and Tailwind CSS
    - Run `create-next-app` with the `--app`, `--typescript`, and `--tailwind` flags
    - Configure `tsconfig.json` strict mode and path aliases (`@/`)
    - Install and configure `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `openai`, and `pdfjs-dist`
    - Create `.env.local.example` documenting required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`)
    - _Requirements: 11.2_

  - [x] 1.2 Create shared TypeScript types and constants
    - Write `types/schema.ts` with `FieldType`, `FieldOption`, `Field`, `FormSchema`, and `Response` interfaces exactly as specified in the design
    - Write `lib/constants.ts` with `LOW_CONFIDENCE_THRESHOLD = 0.75`
    - _Requirements: 2.3, 3.1_

  - [x] 1.3 Create Zod validation schemas
    - Write `lib/validation.ts` with `FieldOptionSchema`, `FieldSchema`, `FormSchemaZod`, and `buildResponseSchema` exactly as specified in the design
    - _Requirements: 4.6, 7.1, 8.2_

  - [x] 1.4 Create Supabase client utilities
    - Write `lib/supabase/server.ts` exporting a server-side Supabase client using `@supabase/ssr` (`createServerClient`)
    - Write `lib/supabase/client.ts` exporting a browser-side Supabase client using `createBrowserClient`
    - Write `lib/supabase/service.ts` exporting a service-role client (server-only) for the extraction pipeline
    - _Requirements: 11.2_

- [x] 2. Database schema and RLS
  - [x] 2.1 Write SQL migration for tables and indexes
    - Create `supabase/migrations/001_initial_schema.sql` with the `forms`, `fields`, and `responses` tables exactly as specified in the design, including all CHECK constraints, DEFAULT values, and indexes
    - Add `error_message text` column to `forms` for storing pipeline failure messages
    - _Requirements: 8.1, 8.3_

  - [x] 2.2 Write SQL migration for RLS policies
    - Create `supabase/migrations/002_rls_policies.sql` with the `owner_all` policies on `forms` and `fields`, and the `owner_read` / `public_insert` policies on `responses`, exactly as specified in the design
    - _Requirements: 11.6, 7.4_

- [x] 3. Admin authentication
  - [x] 3.1 Build the login page
    - Create `app/(auth)/login/page.tsx` with an email/password form
    - On submit, call `supabase.auth.signInWithPassword`; display inline error on invalid credentials
    - On success, redirect to `/admin`
    - _Requirements: 11.2, 11.4_

  - [x] 3.2 Build the admin auth-guard layout
    - Create `app/admin/layout.tsx` that calls `supabase.auth.getSession()` server-side
    - Redirect unauthenticated requests to `/login`
    - Render a top navigation bar with a Sign Out button that calls `supabase.auth.signOut()` and redirects to `/login`
    - _Requirements: 11.1, 11.3, 11.5_

- [x] 4. File upload UI and Supabase Storage
  - [x] 4.1 Build the `FileUploader` component
    - Create `components/admin/FileUploader.tsx` with drag-and-drop and file-picker support
    - Validate MIME type (PDF, JPG, PNG) client-side; show inline error for unsupported formats
    - Validate file size ≤ 20 MB client-side before upload; show inline error with the size limit
    - Display an upload progress bar while the upload is in progress
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Build the upload server action and upload page
    - Write the `uploadDocument(formData: FormData): Promise<{ formId: string }>` server action in `app/admin/actions.ts`
    - Upload the file to Supabase Storage at `{owner_id}/{formId}/original.{ext}` using the service-role client
    - INSERT a `forms` row with `status = 'processing'`; return `formId`
    - On storage failure, return `{ error }` without changing DB state
    - Kick off the extraction pipeline as a non-blocking call after returning `formId`
    - Create `app/admin/upload/page.tsx` that renders `FileUploader` and handles the server action result
    - _Requirements: 1.6, 1.7_

- [x] 5. AI extraction pipeline
  - [x] 5.1 Build the PDF page renderer
    - Create `lib/extraction/renderPages.ts` exporting `renderPdfPages(pdfBytes: Uint8Array): Promise<string[]>`
    - Use `pdfjs-dist` (Node.js build) and `node-canvas` to rasterise each page at 150 DPI
    - Cap rendering at the first 10 pages
    - Return base64-encoded PNG strings
    - _Requirements: 2.1_

  - [x] 5.2 Build the GPT-4o Vision extraction caller
    - Create `lib/extraction/prompt.ts` with `EXTRACTION_SYSTEM_PROMPT` exactly as specified in the design
    - Create `lib/extraction/extract.ts` exporting `extractFormSchema(storagePath: string, mimeType: string): Promise<DraftSchema>`
    - Download file bytes from Supabase Storage using the service-role client
    - For PDFs, call `renderPdfPages`; for images, pass the image directly as base64
    - Call `openai.chat.completions.create` with all page images and the system prompt
    - Parse and validate the JSON response with Zod; on failure, retry once with a stricter prompt
    - On second failure, throw an error
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.3 Build the pipeline orchestrator
    - Create `lib/extraction/pipeline.ts` exporting `runExtractionPipeline(formId: string): Promise<void>`
    - Fetch the form's `source_path` and MIME type from the database
    - Call `extractFormSchema`; on success INSERT all extracted `fields` rows and UPDATE `forms.status = 'review'`
    - On any error, UPDATE `forms.status = 'failed'` and store the error message in `forms.error_message`
    - Enforce a 60-second timeout on the pipeline
    - _Requirements: 2.1, 2.5, 2.6_

- [x] 6. Extraction status polling
  - [x] 6.1 Build the extraction status API route
    - Create `app/api/forms/[formId]/status/route.ts` returning `{ status, fieldCount? }` for the given form
    - Return `400` if the form does not belong to the requesting user
    - _Requirements: 2.4, 2.7_

  - [x] 6.2 Build the `ExtractionStatus` component
    - Create `components/admin/ExtractionStatus.tsx` that polls `/api/forms/[formId]/status` every 2 seconds
    - Show a spinner while `status` is `'pending'` or `'processing'`
    - On `status = 'review'`, redirect to `/admin/forms/[formId]/review`
    - On `status = 'failed'`, display an error message with a link to upload a different document
    - _Requirements: 2.4, 2.5, 2.7_

- [x] 7. Form builder and review UI
  - [x] 7.1 Build `ConfidenceBadge` and `FieldEditor` components
    - Create `components/admin/ConfidenceBadge.tsx` displaying the confidence score and a "suppress flag" button; on click, call a server action that sets `fields.confirmed = true`
    - Create `components/admin/FieldEditor.tsx` with inline editors for label, type, placeholder, required, and options (for radio/checkbox); emit change events to the parent
    - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.5_

  - [x] 7.2 Build the `FormBuilder` component
    - Create `components/admin/FormBuilder.tsx` with a drag-to-reorder field list (use `@dnd-kit/core`)
    - Display low-confidence badge count summary at the top of the review interface
    - Support adding a new field at any position and deleting any field
    - Implement a single-step undo stack (store previous `fields` state in `useReducer` or `useState`)
    - Render `FieldEditor` and `ConfidenceBadge` for each field
    - _Requirements: 3.3, 3.4, 4.2, 4.3, 4.4, 4.8_

  - [x] 7.3 Build the review page and save action
    - Write the `saveFormSchema(formId: string, schema: FormSchema): Promise<void>` server action in `app/admin/actions.ts`
    - Validate the schema with `FormSchemaZod`; return field-level errors on failure
    - UPSERT all `fields` rows and UPDATE `forms.title`, `forms.description`, `forms.updated_at`
    - Create `app/admin/forms/[formId]/review/page.tsx` loading the form and fields server-side, rendering `FormBuilder`, title/description inputs, and the Save button
    - _Requirements: 4.6, 4.7_

- [x] 8. Form publishing
  - [x] 8.1 Build `PublishButton` and `ShareUrlDisplay` components
    - Create `components/admin/PublishButton.tsx` that is disabled when unresolved low-confidence fields exist; show a warning dialog before proceeding
    - Create `components/admin/ShareUrlDisplay.tsx` displaying the shareable URL with a one-click copy button
    - _Requirements: 3.4, 5.3, 5.6_

  - [x] 8.2 Build publish and unpublish server actions
    - Write `publishForm(formId: string): Promise<{ slug: string }>` in `app/admin/actions.ts`
    - Generate a slug as `{sanitised-title}-{short-uuid}` and UPDATE `forms.status = 'published'`, `forms.slug = slug`
    - Write `unpublishForm(formId: string): Promise<void>` that sets `forms.status = 'unpublished'`
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 9. Public form renderer
  - [x] 9.1 Build the `FieldRenderer` component
    - Create `components/form/FieldRenderer.tsx` rendering all six field types: text input, number input, date picker, checkbox group, radio button group, and textarea
    - Each field must be fully keyboard-navigable (tab + enter/space)
    - _Requirements: 6.2, 6.6_

  - [x] 9.2 Build the `PublicForm` component
    - Create `components/form/PublicForm.tsx` rendering the form title, description, section headings, instructions, and all fields using `FieldRenderer`
    - Run Zod client-side validation on submit; display inline error messages adjacent to invalid fields without navigating away
    - POST the payload to `/api/forms/[formId]/submit`; on success, show a confirmation message; on network error, show a retry message and retain entered data
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 7.1, 7.3_

  - [x] 9.3 Build the public form page
    - Create `app/f/[slug]/page.tsx` that looks up the form by slug server-side
    - If `status !== 'published'`, render a "form unavailable" message without a submit button
    - If published, render `PublicForm` with the form schema
    - Apply Tailwind responsive classes so the layout works from 320 px to 1920 px without horizontal scrolling
    - _Requirements: 6.1, 7.4_

- [x] 10. Form submission API
  - [x] 10.1 Build the submission route handler
    - Create `app/api/forms/[formId]/submit/route.ts` handling POST requests
    - Fetch the form's fields from the database; call `buildResponseSchema` to build the Zod validator
    - Validate the submitted payload; return 422 with field-level errors on failure
    - INSERT a `responses` row using the **anon** Supabase client (so RLS `public_insert` policy applies); return 201 on success
    - _Requirements: 7.1, 7.4, 7.5, 8.1, 8.2, 8.3_

- [x] 11. Response viewer
  - [ ] 11.1 Build the `ResponseTable` component
    - Create `components/admin/ResponseTable.tsx` rendering a paginated table (50 rows/page) with column headers derived from field labels and a "Submitted At" first column
    - Implement next/previous pagination controls
    - Display an empty-state message when no responses exist
    - Display the total response count
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 11.2 Build the responses page
    - Create `app/admin/forms/[formId]/responses/page.tsx` loading the form, fields, and first page of responses server-side, rendering `ResponseTable` and `CsvExportButton`
    - _Requirements: 9.1_

- [ ] 12. CSV export
  - [ ] 12.1 Build the CSV formatter utility
    - Create `lib/csv.ts` implementing the algorithm from the design: build header row, format date values as `YYYY-MM-DD`, escape cells (wrap in double quotes, double internal quotes), join rows with CRLF, prepend UTF-8 BOM
    - Export `formatCsv(fields: Field[], responses: Response[]): string`
    - _Requirements: 10.2, 10.3, 10.4, 10.6_

  - [ ] 12.2 Build the CSV export server action and button
    - Write `exportCsv(formId: string): Promise<Response>` in `app/admin/actions.ts`
    - Verify the requesting user owns the form; return 400 if no responses exist
    - Call `formatCsv` and stream the result with `Content-Disposition: attachment; filename="responses.csv"`
    - Create `components/admin/CsvExportButton.tsx` that calls the server action; disable the button and show a tooltip when response count is 0
    - _Requirements: 10.1, 10.5_

- [ ] 13. Admin dashboard home
  - [ ] 13.1 Build the admin dashboard page
    - Create `app/admin/page.tsx` listing all forms owned by the authenticated user, ordered by `updated_at DESC`
    - Each row shows form title, status badge, response count, and links to the review and responses pages
    - Include a prominent "Upload New Form" button linking to `/admin/upload`
    - _Requirements: 11.6_

- [ ] 14. Checkpoint — wire everything together
  - Confirm all routes are reachable: `/login` → `/admin` → `/admin/upload` → `/admin/forms/[id]/review` → `/admin/forms/[id]/responses` → `/f/[slug]`
  - Verify the full happy path: upload → extraction → review → publish → fill → submit → view responses → export CSV
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Unit and integration tests
  - [ ] 15.1 Build the extraction pipeline unit tests
    - Write tests in `__tests__/extraction.test.ts` covering: fixture JSON from GPT-4o maps to correct `Field[]` with right confidence values; Zod schema rejects malformed GPT-4o responses
    - _Requirements: 2.2, 2.3_

  - [ ]* 15.2 Write unit tests for `buildResponseSchema`
    - Test that required fields reject empty values, optional fields accept them, number fields reject strings, and date fields enforce `YYYY-MM-DD`
    - _Requirements: 8.2_

  - [ ]* 15.3 Write unit tests for `lib/csv.ts`
    - Test header row construction, date formatting, cell escaping (commas, quotes, newlines), and UTF-8 BOM presence
    - _Requirements: 10.2, 10.3, 10.4, 10.6_

  - [ ]* 15.4 Write integration tests for the upload and extraction flow
    - Mock Supabase Storage and OpenAI; verify `forms.status` transitions from `'processing'` to `'review'`
    - _Requirements: 2.1, 2.6_

  - [ ]* 15.5 Write integration tests for the submission handler
    - POST a valid payload to `/api/forms/[formId]/submit`; assert 201 and row in `responses`
    - POST an invalid payload; assert 422 and no row inserted
    - _Requirements: 7.1, 8.2_

  - [ ]* 15.6 Write component tests for `FileUploader`
    - Selecting an oversized file shows the error message
    - Selecting an unsupported format shows the format error
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 15.7 Write component tests for `FormBuilder`
    - Dragging a field to a new position updates the `position` values
    - _Requirements: 4.4_

  - [ ]* 15.8 Write component tests for `PublicForm`
    - Submitting with an empty required field shows the validation message
    - _Requirements: 6.5_

  - [ ]* 15.9 Write component tests for `ResponseTable`
    - Renders paginated rows; next/previous controls change the visible page
    - _Requirements: 9.5_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation at natural integration points.
- The design explicitly opts out of property-based tests; all test tasks use unit and integration testing.
- Environment variables must be set before running any Supabase or OpenAI-dependent code.
- `pdfjs-dist` requires the Node.js build (`pdfjs-dist/legacy/build/pdf.js`) and `node-canvas` as a peer dependency.
- The anon Supabase client is used in the submission route handler so RLS policies govern inserts.
- Slug format: `{sanitised-title}-{nanoid(8)}` keeps URLs readable and collision-resistant.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3"] },
    { "id": 7, "tasks": ["6.1", "6.2"] },
    { "id": 8, "tasks": ["7.1", "12.1"] },
    { "id": 9, "tasks": ["7.2", "8.1", "9.1"] },
    { "id": 10, "tasks": ["7.3", "8.2", "9.2", "10.1", "11.1"] },
    { "id": 11, "tasks": ["9.3", "11.2", "12.2", "13.1"] },
    { "id": 12, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 13, "tasks": ["15.4", "15.5", "15.6", "15.7", "15.8", "15.9"] }
  ]
}
```
