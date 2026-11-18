# Paper2Flow

**Turn paper forms into online forms with AI.** Paper2Flow helps administrators digitize a paper or PDF form, review and edit its AI-generated draft, publish a shareable online form, collect submissions, and export the resulting data.

**Live application:** [paper2flow.storycrowntechnologies.com](https://paper2flow.storycrowntechnologies.com)

**Demonstration video:** [Watch the Paper2Flow demo](https://youtu.be/82ivG0ukn2U)

Paper2Flow is developed by **Story Crown Technologies Ltd.** for teams that need a practical path from paper-based data collection to structured online submissions.

## Features

- **PDF and image intake:** Upload PDF, JPG, or PNG forms.
- **AI extraction:** OpenAI processes PDF files directly and analyzes images to draft a form title, sections, fields, and confidence scores. Strict structured output and schema validation protect the extraction pipeline; refusals and incomplete results are handled without exposing model output.
- **Review and editing:** Authenticated administrators can inspect, add, edit, remove, and reorder fields before publishing.
- **Public forms:** Publish a unique `/f/{slug}` URL. Respondents can open and submit the public form without creating an account.
- **Responses:** Submission dates, field labels, and answers are stored in Supabase and shown in the owner’s dashboard.
- **CSV export:** Download all responses as CSV, with dates, field labels, and answers. Spreadsheet formula injection is mitigated in exported cells.
- **PDF export:** Download a branded, paginated PDF of all responses or a single response. Long answers wrap across pages; the PDF includes the form title, submission dates, labels, answers, and page numbers.
- **Word export:** Download all responses as an editable `.docx` document with branded headings, response tables, dates, and page numbers.
- **Authentication:** Email/password registration and sign-in, email confirmation, and password recovery are supported. Google, Microsoft, and Facebook buttons are hidden until those Supabase providers are enabled and tested; their integration code remains in the project.

AI extraction produces a draft and should be reviewed before publishing. Paper2Flow does not claim extraction is always accurate.

## Workflow

1. An administrator registers or signs in.
2. They upload a PDF or image, which is stored in Supabase Storage.
3. The extraction pipeline uses OpenAI to propose a form structure.
4. The administrator reviews, edits, and saves the fields.
5. Publishing creates a shareable public URL.
6. Respondents submit answers without signing in.
7. The form owner views submissions and exports them as CSV, PDF, or Word. A single response can also be downloaded as PDF.

## Technology

- Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS
- Supabase Auth, PostgreSQL, Row Level Security (RLS), and Storage
- OpenAI API for PDF and image form extraction with strict structured output
- Zod for extraction and submission validation
- `@dnd-kit` for drag-and-drop field ordering
- Existing `@napi-rs/canvas` package for server-generated PDFs; Word documents are generated as Office Open XML without an additional package

## Getting started

### Prerequisites

- Node.js and npm
- A Supabase project with the Paper2Flow schema and a `source-documents` Storage bucket
- An OpenAI API key with access to the configured model

### Install and configure

```bash
npm install
```

Create `.env.local` in the repository root. Use `.env.local.example` for the required variable names and supply values from your own Supabase and OpenAI projects. Never commit `.env.local` or share secret values.

Required environment variable names:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used with authenticated sessions and RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for trusted operations; never expose it in browser code |
| `OPENAI_API_KEY` | Server-only key for AI extraction |

Apply the database migrations to a development Supabase project in the documented order. Review each migration’s notes. In particular, do not apply `004_lockdown_direct_response_insert.sql` until its deployment prerequisites are satisfied.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npx tsc --noEmit
node --test tests/*.test.cjs
npm run build
```

## Architecture

```text
app/
  (auth)/       Registration and sign-in pages
  auth/         Supabase authentication callback
  admin/        Authenticated dashboard, upload, review, and responses
  api/          Extraction, status, public submission, and protected exports
  f/[slug]/     Public form route
components/
  admin/        Dashboard, form management, response table, export controls
  auth/         Social sign-in integration (buttons currently hidden)
  form/         Public form renderer and field controls
lib/
  extraction/   OpenAI structured extraction and pipeline orchestration
  supabase/     Browser, session-aware server, and service clients
  csv.ts        CSV formatting and spreadsheet-safety escaping
  response-export.ts  PDF and Word response document generation
supabase/
  migrations/   Database schema, RLS, and staged submission safeguards
.kiro/specs/paper2flow/
  requirements.md  Product requirements and acceptance criteria
  design.md        Architecture, data model, components, and workflows
  tasks.md         Requirement-linked implementation task plan
  tasks.meta.json  Kiro task metadata
```

## Security notes

- Authentication protects administrator pages and form-management operations.
- Export endpoints verify the signed-in user owns the requested form before reading response data. Individual-response PDF downloads are scoped to both the owned form and response ID.
- Public submission endpoints accept only published forms, validate fields and answer values, cap request size, and use the server-side `submit_public_response` function for publication checks and rate limiting.
- Row Level Security scopes account data. Service-role credentials are used only in trusted server code and must remain private.
- The repository contains a staged direct-insert lockdown migration. Its presence does not mean it has been applied to a database; follow the migration’s deployment prerequisites.

## Deployment

Paper2Flow is a Next.js application hosted on Vercel. Configure the four environment variables above in the existing deployment project and add the production origin and `/auth/callback` to the Supabase Auth redirect allowlist. Preserve the existing Supabase project and data when deploying updates.

Before release, verify registration, email confirmation, sign-in and password recovery; PDF and image extraction; review and publishing; anonymous public submissions; owner-scoped response viewing; and CSV, PDF, and Word exports. Configure and test any OAuth provider in Supabase before making its sign-in button visible.

## Kiroween 2026 development story

Kiro’s project artifacts are included in `.kiro/specs/paper2flow/`:

- `requirements.md` records requirements and acceptance criteria for uploads, extraction, confidence review, editing, publishing, public responses, response viewing, CSV export, and administration.
- `design.md` describes the architecture, components, data model, and workflows.
- `tasks.md` decomposes requirements into implementation tasks and links tasks to requirements. Its checked and unchecked items reflect the task-plan state committed in the repository; this README does not infer completion from unchecked tasks.
- `tasks.meta.json` and `.config.kiro` contain the associated Kiro task metadata and specification configuration.

These artifacts document the Kiro workflow evidenced in the repository: capture product requirements, describe the intended design, and organize implementation work into traceable tasks. This account does not claim activities beyond those artifacts.

## Project status

Paper2Flow implements the form digitization and response workflow described above. Provider availability, production database migration state, and commercial terms depend on deployment configuration. No pricing claim is made here.

## License

No root-level open-source license is currently included. A proposed MIT License for Story Crown Technologies Ltd. (copyright 2026) is awaiting the project owner’s approval before it is added.

## Contributing

Keep changes focused, preserve authentication and data-access boundaries, and update the Kiro requirements, design, and tasks when product behavior changes. Never commit `.env.local`, API keys, database credentials, or production response data.
