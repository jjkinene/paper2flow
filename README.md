# Paper2Flow

**Turn paper forms into online forms with AI.** Paper2Flow helps an administrator digitize a paper or PDF form, review the AI-generated draft, publish a shareable form, collect responses, and export submissions as CSV.

**Live application:** [paper2flow.storycrowntechnologies.com](https://paper2flow.storycrowntechnologies.com)

Paper2Flow is developed by **Story Crown Technologies Ltd.** for teams that need a practical path from paper-based data collection to structured online submissions.

## What it does

- Accepts PDF, JPG, and PNG source documents (up to 20 MB).
- Uses OpenAI vision and PDF input to extract a draft form structure and field confidence scores.
- Lets an authenticated administrator edit, add, remove, and reorder fields before publishing.
- Publishes a form at a unique `/f/{slug}` URL that respondents can open without an account.
- Validates and stores submissions in Supabase; administrators can review responses and export CSV.
- Supports email/password account registration, email confirmation, and sign-in. Google, Microsoft, and Facebook buttons are temporarily hidden until those providers are enabled and tested in Supabase; their integration code remains in the project.

The extraction result is a draft and should be reviewed before publication. Paper2Flow does not claim that AI extraction is always accurate.

## Application workflow

1. An administrator signs in and uploads a PDF or image.
2. The document is stored in Supabase Storage and the extraction pipeline calls OpenAI.
3. The administrator reviews the detected form title and fields, then edits and saves the schema.
4. Publishing assigns a shareable slug and makes the form available to respondents.
5. Respondents submit answers without signing in.
6. The administrator reviews submissions and downloads a CSV containing submission dates, field labels, and answers.

## Technology

- Next.js 14 App Router, React 18, and TypeScript
- Tailwind CSS for responsive styling
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- OpenAI API for AI-assisted PDF and image form extraction
- Zod for schema and response validation
- `@dnd-kit` for drag-and-drop field ordering

## Getting started

### Prerequisites

- Node.js and npm
- A Supabase project with the Paper2Flow database schema and a `source-documents` Storage bucket
- An OpenAI API key with access to the configured model

### Install and configure

```bash
npm install
```

Create `.env.local` in the project root. Use `.env.local.example` as the variable-name template and supply credentials from your own Supabase and OpenAI projects. Do not commit `.env.local` or share secret values.

Required variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by browser and server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used with authenticated sessions and RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only access for trusted extraction and submission operations; never expose in browser code |
| `OPENAI_API_KEY` | Server-only key for form extraction |

Apply the required SQL migrations to a development Supabase project before using the application. Review the migration notes and ordering in `supabase/migrations/`; do not run enforcement migration `004_lockdown_direct_response_insert.sql` until its documented deployment prerequisites have been met.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production compilation can be checked with:

```bash
npx tsc --noEmit --incremental false
npm run build
```

## Architecture overview

```text
app/
  (auth)/       Email registration and sign-in pages
  auth/         Supabase email/OAuth callback
  admin/        Authenticated dashboard, upload, review, and responses
  api/          Extraction status, extraction, public submission, and CSV routes
  f/[slug]/     Public form route
components/
  admin/        Dashboard and form-management UI
  auth/         Social sign-in integration (currently hidden in the UI)
  form/         Public form renderer and field controls
lib/
  extraction/   OpenAI extraction and pipeline orchestration
  supabase/     Browser, session-aware server, and server-only service clients
  csv.ts        CSV formatting and escaping
supabase/
  migrations/   Database schema, RLS, and staged submission safeguards
.kiro/specs/    Paper2Flow requirements, design, and task plan
```

The session-aware Supabase client is used for account-scoped operations. The service-role client is limited to trusted server modules. Public form reads are restricted to published forms by RLS. Submission requests are size-limited, validated, and passed through the `submit_public_response` database function for an atomic publication check and rate limit. Keep service credentials out of client code.

## Deployment

Paper2Flow is configured as a Next.js application and can be hosted on Vercel. Connect the existing repository and configure the four environment variables above for the appropriate deployment environments. Add the deployed origin and `/auth/callback` to the Supabase Auth redirect allowlist. Keep the existing Supabase project and data when deploying updates.

Before release, verify:

- Email registration, confirmation callback, sign-in, and sign-out.
- Upload and extraction using representative PDF and image documents.
- Review/save/publish and access to a public form while signed out.
- Submission persistence, administrator response access, and CSV download.
- Required Supabase migrations and policies are applied in the intended sequence.

OAuth providers are not represented as available until their Supabase provider credentials and redirect settings are configured and tested. No pricing plan or price is stated here; consult the product owner for current commercial terms.

## Kiroween 2026 development story

The repository includes Kiro project artifacts under `.kiro/specs/paper2flow/`:

- `requirements.md` records the product requirements and acceptance criteria for uploads, extraction, confidence review, editing, publishing, public responses, response viewing, CSV export, and administration.
- `design.md` describes the intended architecture, components, data model, and workflows.
- `tasks.md` breaks the work into implementation tasks and links those tasks to requirements. Its checkboxes record task-plan status as stored in the repository; unchecked items are not presented here as completed work.

These artifacts show how Kiro was used in this project: requirements and design were captured as a specification, then decomposed into traceable implementation tasks. This account is limited to the evidence in those files and does not claim additional Kiro actions or activities.

## Project status and scope

Paper2Flow includes the MVP form-digitization and collection workflow described above. The repository also contains staged database security migrations. A migration being present in source does not mean it has been applied to a Supabase project. Check the relevant comments and release procedure before applying it. This README does not instruct operators to execute later-stage enforcement prematurely.

## Contributing

Keep changes focused, preserve authentication and data-access boundaries, and update the Kiro requirements/design/tasks when product behavior changes. Never commit `.env.local`, API keys, database credentials, or production data.
