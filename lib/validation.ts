// lib/validation.ts

import { z } from 'zod';
import type { Field } from '@/types/schema';

export const FieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const FieldSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  label: z.string().min(1, 'Label is required'),
  fieldType: z.enum(['text', 'number', 'date', 'checkbox', 'radio', 'textarea']),
  placeholder: z.string(),
  required: z.boolean(),
  options: z.array(FieldOptionSchema).nullable(),
  confirmed: z.boolean(),
});

export const FormSchemaZod = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  fields: z.array(FieldSchema).min(1, 'Form must have at least one field'),
});

// Dynamically built per-form response validator (see submission handler)
export function buildResponseSchema(fields: Field[]): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let valueSchema: z.ZodTypeAny;
    switch (field.fieldType) {
      case 'number':  valueSchema = z.number(); break;
      case 'date':    valueSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); break;
      case 'checkbox':valueSchema = z.array(z.string()); break;
      case 'radio':   valueSchema = z.string(); break;
      default:        valueSchema = z.string();
    }
    shape[field.id] = field.required ? valueSchema : valueSchema.optional();
  }
  return z.object(shape);
}
