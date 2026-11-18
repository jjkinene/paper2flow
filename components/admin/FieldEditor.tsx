'use client';

import { ChangeEvent } from 'react';
import type { Field, FieldOption, FieldType } from '@/types/schema';

interface FieldEditorProps {
  field: Field;
  onChange: (updates: Partial<Field>) => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'textarea', label: 'Textarea' },
];

const TYPES_WITH_OPTIONS: FieldType[] = ['checkbox', 'radio'];

export default function FieldEditor({ field, onChange }: FieldEditorProps) {
  const hasOptions = TYPES_WITH_OPTIONS.includes(field.fieldType);

  // -------------------------------------------------------------------------
  // Scalar field handlers
  // -------------------------------------------------------------------------
  function handleLabelChange(e: ChangeEvent<HTMLInputElement>) {
    onChange({ label: e.target.value });
  }

  function handleTypeChange(e: ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as FieldType;
    const updates: Partial<Field> = { fieldType: newType };
    // Initialise options array when switching into a type that needs it.
    if (TYPES_WITH_OPTIONS.includes(newType) && !field.options?.length) {
      updates.options = [{ label: '', value: '' }];
    }
    // Clear options when switching away from an options-based type.
    if (!TYPES_WITH_OPTIONS.includes(newType)) {
      updates.options = null;
    }
    onChange(updates);
  }

  function handlePlaceholderChange(e: ChangeEvent<HTMLInputElement>) {
    onChange({ placeholder: e.target.value });
  }

  function handleRequiredChange(e: ChangeEvent<HTMLInputElement>) {
    onChange({ required: e.target.checked });
  }

  // -------------------------------------------------------------------------
  // Options list handlers
  // -------------------------------------------------------------------------
  function handleOptionChange(
    index: number,
    key: keyof FieldOption,
    value: string
  ) {
    const current = field.options ?? [];
    const updated = current.map((opt, i) =>
      i === index ? { ...opt, [key]: value } : opt
    );
    onChange({ options: updated });
  }

  function handleAddOption() {
    const current = field.options ?? [];
    onChange({ options: [...current, { label: '', value: '' }] });
  }

  function handleDeleteOption(index: number) {
    const current = field.options ?? [];
    onChange({ options: current.filter((_, i) => i !== index) });
  }

  // -------------------------------------------------------------------------
  // Shared input class
  // -------------------------------------------------------------------------
  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  const labelCls = 'block text-xs font-medium text-gray-800 mb-1';

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label htmlFor={`label-${field.id}`} className={labelCls}>
          Label
        </label>
        <input
          id={`label-${field.id}`}
          type="text"
          value={field.label}
          onChange={handleLabelChange}
          placeholder="Field label"
          className={inputCls}
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor={`type-${field.id}`} className={labelCls}>
          Type
        </label>
        <select
          id={`type-${field.id}`}
          value={field.fieldType}
          onChange={handleTypeChange}
          className={inputCls}
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>
              {ft.label}
            </option>
          ))}
        </select>
      </div>

      {/* Placeholder (not applicable to checkbox/radio) */}
      {!hasOptions && (
        <div>
          <label htmlFor={`placeholder-${field.id}`} className={labelCls}>
            Placeholder
          </label>
          <input
            id={`placeholder-${field.id}`}
            type="text"
            value={field.placeholder}
            onChange={handlePlaceholderChange}
            placeholder="Placeholder text"
            className={inputCls}
          />
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center gap-2">
        <input
          id={`required-${field.id}`}
          type="checkbox"
          checked={field.required}
          onChange={handleRequiredChange}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor={`required-${field.id}`} className="text-sm text-gray-700">
          Required
        </label>
      </div>

      {/* Options list (checkbox / radio) */}
      {hasOptions && (
        <div>
          <span className={labelCls}>Options</span>
          <ul className="space-y-2" aria-label="Field options">
            {(field.options ?? []).map((opt, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Option ${index + 1} label`}
                  value={opt.label}
                  onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                  placeholder="Label"
                  className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  aria-label={`Option ${index + 1} value`}
                  value={opt.value}
                  onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteOption(index)}
                  aria-label={`Delete option ${index + 1}`}
          className="rounded p-1 text-gray-700 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleAddOption}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:border-indigo-500 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Option
          </button>
        </div>
      )}
    </div>
  );
}
