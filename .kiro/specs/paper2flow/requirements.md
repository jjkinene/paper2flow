# Requirements Document

## Introduction

Paper2Flow is a web application that converts scanned paper forms (images or PDFs) into editable
digital forms with a shareable URL. An AI pipeline detects the form's structure — title, sections,
labels, instructions, and all field types — and produces a draft schema. An administrator reviews
the draft, corrects any uncertain fields, and publishes the form. End users complete and submit the
form on any device. Administrators view submitted responses and export them to CSV.

The primary users are NGOs, schools, farmer groups, churches, community organisations, and small
businesses that currently manage paper-based data collection.

The stack is Next.js, TypeScript, React, Tailwind CSS, Zod, and Supabase (PostgreSQL).

---

## Glossary

- **Uploader**: An administrator who uploads a source document and manages the resulting form.
- **Reviewer**: An administrator who inspects and edits the AI-generated draft before publishing.
  (In the MVP, the Uploader and the Reviewer are the same person.)
- **Respondent**: A user who fills in and submits a published form.
- **Source Document**: The original PDF, JPG, or PNG file uploaded by the Uploader.
- **Extraction Pipeline**: The server-side process that calls an AI vision/OCR service to detect
  form structure from a Source Document.
- **Draft Schema**: The JSON representation of a form produced by the Extraction Pipeline before
  any human review.
- **Field**: A single input element in a form (text, number, date, checkbox, radio, etc.).
- **Confidence Score**: A numeric value (0–1) assigned by the Extraction Pipeline to each Field,
  indicating how certain the AI is about that Field's type and label.
- **Low-Confidence Field**: A Field whose Confidence Score is below 0.75.
- **Form Schema**: The validated, human-approved JSON representation of a form, stored in the
  database and used to render the published form.
- **Published Form**: A Form Schema that has been approved by the Reviewer and is accessible via a
  shareable URL.
- **Shareable URL**: The unique public URL that lets Respondents access and submit a Published Form.
- **Response**: A single submission of a Published Form by a Respondent, stored as structured data.
- **Admin Dashboard**: The web interface where the Uploader manages forms and views responses.

---

## Requirements

### Requirement 1: Source Document Upload

**User Story:** As an Uploader, I want to upload a PDF, JPG, or PNG file of a paper form, so that
the system can convert it into a digital form.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL accept file uploads in PDF, JPG, and PNG formats.
2. THE Admin_Dashboard SHALL enforce a maximum file size of 20 MB per upload.
3. WHEN a file exceeding 20 MB is selected, THE Admin_Dashboard SHALL display an error message
   stating the file size limit before attempting the upload.
4. WHEN a file of an unsupported format is selected, THE Admin_Dashboard SHALL display an error
   message listing the accepted formats (PDF, JPG, PNG).
5. WHILE an upload is in progress, THE Admin_Dashboard SHALL display a progress indicator to the
   Uploader.
6. WHEN the file is successfully uploaded, THE Admin_Dashboard SHALL store the Source Document and
   initiate the Extraction Pipeline.
7. IF the file storage operation fails, THEN THE Admin_Dashboard SHALL display an error message and
   retain the selected file so the Uploader can retry.

---

### Requirement 2: AI Form Structure Extraction

**User Story:** As an Uploader, I want the system to automatically detect the form's structure from
the uploaded document, so that I do not have to re-enter all fields manually.

#### Acceptance Criteria

1. WHEN a Source Document is stored, THE Extraction_Pipeline SHALL analyse the document and produce
   a Draft Schema containing the detected form title, sections, field labels, field types, and any
   detected instructions.
2. THE Extraction_Pipeline SHALL detect the following field types: text, number, date, checkbox,
   radio, and multi-line text (textarea).
3. THE Extraction_Pipeline SHALL assign a Confidence Score between 0 and 1 to every detected Field.
4. WHEN the Extraction_Pipeline completes successfully, THE Admin_Dashboard SHALL present the Draft
   Schema to the Reviewer for inspection.
5. WHEN the Extraction_Pipeline fails to produce any Fields, THE Admin_Dashboard SHALL notify the
   Uploader and offer the option to upload a different Source Document.
6. THE Extraction_Pipeline SHALL complete analysis within 60 seconds for Source Documents up to
   20 MB.
7. WHILE the Extraction_Pipeline is running, THE Admin_Dashboard SHALL display a status indicator
   showing that extraction is in progress.

---

### Requirement 3: Low-Confidence Field Flagging

**User Story:** As a Reviewer, I want uncertain AI-generated fields highlighted for my attention,
so that I can quickly find and fix potential errors before publishing.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL visually distinguish every Low-Confidence Field from fields with a
   Confidence Score of 0.75 or above.
2. THE Admin_Dashboard SHALL display the Confidence Score value alongside each Low-Confidence
   Field.
3. THE Admin_Dashboard SHALL display a summary count of Low-Confidence Fields at the top of the
   review interface.
4. WHEN no Low-Confidence Fields remain unresolved, THE Admin_Dashboard SHALL allow the Reviewer
   to publish the form.
5. WHERE the Reviewer chooses to suppress a flag, THE Admin_Dashboard SHALL mark that Field as
   manually confirmed and remove it from the Low-Confidence Field count.

---

### Requirement 4: Form Schema Editing

**User Story:** As a Reviewer, I want to edit, add, delete, and reorder fields in the draft, so
that the final published form accurately reflects the original paper form.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL allow the Reviewer to change the label, type, placeholder text, and
   required status of any Field.
2. THE Admin_Dashboard SHALL allow the Reviewer to add a new Field of any supported type at any
   position in the form.
3. THE Admin_Dashboard SHALL allow the Reviewer to delete any Field from the Draft Schema.
4. THE Admin_Dashboard SHALL allow the Reviewer to reorder Fields by dragging them to a new
   position.
5. THE Admin_Dashboard SHALL allow the Reviewer to add, edit, and delete options for checkbox and
   radio Fields.
6. WHEN the Reviewer saves edits, THE Admin_Dashboard SHALL validate the Form Schema with Zod and
   display field-level validation errors for any invalid entries.
7. THE Admin_Dashboard SHALL allow the Reviewer to rename the form title and add a form description.
8. THE Admin_Dashboard SHALL preserve the full edit history within the current review session so
   the Reviewer can undo the most recent change.

---

### Requirement 5: Form Publishing

**User Story:** As a Reviewer, I want to publish the approved form, so that Respondents can access
it via a shareable link.

#### Acceptance Criteria

1. WHEN the Reviewer clicks Publish, THE Admin_Dashboard SHALL save the Form Schema to the database
   with a status of "published".
2. WHEN a form is published, THE System SHALL generate a unique Shareable URL for that form.
3. WHEN a form is published, THE Admin_Dashboard SHALL display the Shareable URL and provide a
   one-click copy action.
4. THE System SHALL keep a form accessible at its Shareable URL until the Uploader explicitly
   unpublishes or deletes it.
5. WHEN the Uploader unpublishes a form, THE System SHALL return a 404 response for the Shareable
   URL and stop accepting new submissions.
6. WHERE the Reviewer has not resolved all Low-Confidence Fields, THE Admin_Dashboard SHALL display
   a warning before allowing the publish action to proceed.

---

### Requirement 6: Mobile-Friendly Form Rendering

**User Story:** As a Respondent, I want to complete the form on my phone, so that I can submit data
without needing a desktop computer.

#### Acceptance Criteria

1. THE Published_Form SHALL render correctly on viewport widths from 320 px to 1920 px without
   horizontal scrolling.
2. THE Published_Form SHALL render all supported field types: text input, number input, date picker,
   checkbox, radio button group, and multi-line textarea.
3. THE Published_Form SHALL display the form title and description above the field list.
4. THE Published_Form SHALL display section headings and instructions extracted from the Form Schema.
5. WHEN a required Field is left empty on submission, THE Published_Form SHALL display an inline
   validation message adjacent to that Field without navigating away from the form.
6. THE Published_Form SHALL be operable using a keyboard alone (tab navigation and enter/space
   activation) to meet basic accessibility requirements.

---

### Requirement 7: Form Submission

**User Story:** As a Respondent, I want to submit my completed form, so that my data is captured
digitally.

#### Acceptance Criteria

1. WHEN the Respondent clicks Submit on a valid form, THE Published_Form SHALL POST the response
   data to the server and display a confirmation message.
2. THE System SHALL store each Response as a structured JSON object keyed by Field identifiers,
   associated with the Published Form's identifier and a UTC submission timestamp.
3. WHEN the POST request fails due to a network error, THE Published_Form SHALL display an error
   message and retain the Respondent's entered data so the Respondent can retry.
4. WHEN the form is not in "published" status, THE Published_Form SHALL display a message stating
   the form is unavailable and SHALL NOT present a submit action.
5. THE System SHALL accept concurrent submissions from multiple Respondents without data loss.

---

### Requirement 8: Response Storage and Integrity

**User Story:** As an Administrator, I want all submissions stored reliably, so that no response
data is lost.

#### Acceptance Criteria

1. THE Database SHALL store each Response as a row containing the form identifier, a unique response
   identifier, the UTC submission timestamp, and the response payload as a JSON column.
2. THE System SHALL validate the submitted response payload against the Form Schema using Zod before
   persisting it; IF validation fails, THEN THE System SHALL return an error to the Respondent
   without storing the invalid payload.
3. THE System SHALL apply database-level constraints to prevent duplicate response identifiers.
4. THE System SHALL retain all Responses for a Published Form even after the form is unpublished.

---

### Requirement 9: Response Viewer

**User Story:** As an Administrator, I want to see all submitted responses in the dashboard, so
that I can monitor data collection.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display all Responses for a selected Published Form in a paginated
   table, with the most recent Response shown first.
2. THE Admin_Dashboard SHALL show each Response's submission timestamp and all field values as
   columns in the table.
3. THE Admin_Dashboard SHALL display the total Response count for a form.
4. WHEN a Published Form has no Responses yet, THE Admin_Dashboard SHALL display an empty-state
   message.
5. THE Admin_Dashboard SHALL paginate the response table at 50 rows per page and provide
   next/previous navigation controls.

---

### Requirement 10: CSV Export

**User Story:** As an Administrator, I want to export all responses to a CSV file, so that I can
analyse the data in spreadsheet tools.

#### Acceptance Criteria

1. WHEN the Administrator clicks Export CSV, THE Admin_Dashboard SHALL generate and download a CSV
   file containing all Responses for the selected form.
2. THE CSV_Exporter SHALL use the Field labels as column headers in the first row.
3. THE CSV_Exporter SHALL include one data row per Response, with values in the same column order
   as the headers.
4. THE CSV_Exporter SHALL encode the CSV file in UTF-8 to support non-ASCII characters.
5. WHEN the form has no Responses, THE Admin_Dashboard SHALL disable the Export CSV action and
   display a tooltip explaining that there are no responses to export.
6. THE CSV_Exporter SHALL format date Field values as ISO 8601 strings (YYYY-MM-DD) in the exported
   file.

---

### Requirement 11: Administrator Authentication

**User Story:** As an Administrator, I want to log in securely, so that only authorised users can
upload forms and view responses.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL require authentication before granting access to any administrative
   function.
2. THE System SHALL authenticate Administrators using Supabase Auth with email and password.
3. WHEN an unauthenticated user attempts to access an administrative route, THE System SHALL
   redirect the user to the login page.
4. WHEN login credentials are invalid, THE Admin_Dashboard SHALL display an error message and SHALL
   NOT grant access.
5. WHEN an authenticated Administrator clicks Sign Out, THE System SHALL invalidate the session and
   redirect the user to the login page.
6. THE System SHALL associate each form and each Response with the Administrator account that
   created it, and SHALL prevent one Administrator from accessing another Administrator's forms or
   Responses.
