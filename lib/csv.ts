import type { Field, Response } from "@/types/schema";

const UTF8_BOM = "\uFEFF";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function escapeCsvCell(value: unknown): string {
  let text = "";

  if (value === null || value === undefined) {
    text = "";
  } else if (Array.isArray(value)) {
    text = value.join(", ");
  } else if (typeof value === "object") {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  // Prevent formula injection when Excel/Sheets opens an exported CSV.
  // Quoting a CSV cell alone does NOT stop spreadsheet formula execution.
  if (!(typeof value === "number" && Number.isFinite(value)) && /^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  // Wrap every value in quotes and double internal quotes.
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateValue(value: unknown): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function getFieldId(field: Field): string {
  const record = asRecord(field);
  return String(record.id ?? "");
}

function getFieldLabel(field: Field): string {
  const record = asRecord(field);
  return String(record.label ?? record.id ?? "");
}

function getFieldType(field: Field): string {
  const record = asRecord(field);
  return String(record.fieldType ?? record.field_type ?? record.type ?? "");
}

function getFieldPosition(field: Field): number {
  const record = asRecord(field);
  const position = Number(record.position);
  return Number.isFinite(position) ? position : 0;
}

function getResponsePayload(response: Response): Record<string, unknown> {
  const record = asRecord(response);
  return asRecord(record.payload);
}

function getSubmittedAt(response: Response): unknown {
  const record = asRecord(response);
  return record.submittedAt ?? record.submitted_at ?? "";
}

export function formatCsv(
  fields: Field[],
  responses: Response[]
): string {
  const orderedFields = [...fields].sort(
    (a, b) => getFieldPosition(a) - getFieldPosition(b)
  );

  const header = [
    "Submitted At",
    ...orderedFields.map((field) => getFieldLabel(field)),
  ];

  const rows = responses.map((response) => {
    const payload = getResponsePayload(response);

    const values = orderedFields.map((field) => {
      const value = payload[getFieldId(field)];

      if (getFieldType(field) === "date") {
        return formatDateValue(value);
      }

      return value;
    });

    return [
      formatDateValue(getSubmittedAt(response)),
      ...values,
    ];
  });

  const csvRows = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return UTF8_BOM + csvRows.join("\r\n");
}