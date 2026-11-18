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

// Dynamically built per-form response validator, used in both browser and API.
// All values are bounded so public submissions cannot store unlimited text or
// arbitrary radio/checkbox values. Optional empty controls remain supported.
export function buildResponseSchema(fields: Field[]): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let valueSchema: z.ZodTypeAny;
    switch (field.fieldType) {
      case 'number':
        valueSchema = z.number().finite();
        break;
      case 'date':
        valueSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
        break;
      case 'checkbox': {
        const allowedValues = new Set((field.options ?? []).map((o) => o.value));
        valueSchema = z.array(z.string().max(200))
          .max(100)
          .refine((values) => values.every((v) => allowedValues.has(v)), 'Invalid selection')
          .refine((values) => new Set(values).size === values.length, 'Duplicate selection');
        if (field.required) {
          valueSchema = valueSchema.refine((values) => Array.isArray(values) && values.length > 0, 'Select an option');
        }
        break;
      }
      case 'radio': {
        const allowedValues = new Set((field.options ?? []).map((o) => o.value));
        valueSchema = z.string().max(200).refine((value) => allowedValues.has(value), 'Invalid selection');
        break;
      }
      case 'textarea':
        valueSchema = z.string().max(10000, 'Maximum 10,000 characters');
        break;
      default:
        valueSchema = z.string().max(2000, 'Maximum 2,000 characters');
    }

    if (field.required) {
      if (field.fieldType === 'text' || field.fieldType === 'textarea') {
        valueSchema = valueSchema.refine((v) => typeof v === 'string' && v.trim().length > 0, 'This field is required');
      }
      shape[field.id] = valueSchema;
    } else if (field.fieldType === 'checkbox') {
      shape[field.id] = valueSchema.optional();
    } else {
      // Optional input elements are initialized as empty strings in PublicForm.
      shape[field.id] = z.union([valueSchema, z.literal('')]).optional();
    }
  }
  return z.object(shape).strict();
}
