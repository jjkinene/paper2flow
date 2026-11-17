export type FieldType = 'text' | 'number' | 'date' | 'checkbox' | 'radio' | 'textarea';

export interface FieldOption {
  label: string;
  value: string;
}

export interface Field {
  id: string;
  formId: string;
  position: number;
  label: string;
  fieldType: FieldType;
  placeholder: string;
  required: boolean;
  options: FieldOption[] | null;
  confidence: number | null;   // null for manually added fields
  confirmed: boolean;
}

export interface FormSchema {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  slug: string | null;
  status: 'draft' | 'processing' | 'review' | 'published' | 'unpublished';
  fields: Field[];
}

export interface Response {
  id: string;
  formId: string;
  submittedAt: string;         // ISO 8601
  payload: Record<string, unknown>;
}
