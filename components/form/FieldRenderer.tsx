'use client';

import React from 'react';
import type { Field, FieldOption } from '@/types/schema';

interface FieldRendererProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const fieldId = `field-${field.id}`;
  const errorId = `error-${field.id}`;
  const hasError = Boolean(error);

  // Base input classes for consistent styling
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md bg-white text-gray-900
    placeholder:text-gray-700 placeholder:opacity-100
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed
    ${hasError ? 'border-red-500' : 'border-gray-300'}
  `.trim();

  const renderLabel = () => (
    <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
    </label>
  );

  const renderError = () => {
    if (!error) return null;
    return (
      <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  };

  const renderTextField = () => (
    <div>
      {renderLabel()}
      <input
        type="text"
        id={fieldId}
        name={field.id}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        className={baseInputClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {renderError()}
    </div>
  );

  const renderNumberField = () => (
    <div>
      {renderLabel()}
      <input
        type="number"
        id={fieldId}
        name={field.id}
        value={(value as number) ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={field.placeholder}
        required={field.required}
        className={baseInputClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {renderError()}
    </div>
  );

  const renderDateField = () => (
    <div>
      {renderLabel()}
      <input
        type="date"
        id={fieldId}
        name={field.id}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        className={baseInputClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {renderError()}
    </div>
  );

  const renderTextareaField = () => (
    <div>
      {renderLabel()}
      <textarea
        id={fieldId}
        name={field.id}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        rows={4}
        className={baseInputClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {renderError()}
    </div>
  );

  const renderCheckboxGroup = () => {
    const selectedValues = (value as string[]) || [];
    const options = field.options || [];

    const handleCheckboxChange = (optionValue: string, checked: boolean) => {
      if (checked) {
        onChange([...selectedValues, optionValue]);
      } else {
        onChange(selectedValues.filter((v) => v !== optionValue));
      }
    };

    return (
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </legend>
        <div className="space-y-2" role="group" aria-describedby={hasError ? errorId : undefined}>
          {options.map((option: FieldOption, index: number) => {
            const optionId = `${fieldId}-option-${index}`;
            const isChecked = selectedValues.includes(option.value);

            return (
              <div key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={optionId}
                  name={field.id}
                  value={option.value}
                  checked={isChecked}
                  onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  aria-invalid={hasError}
                />
                <label htmlFor={optionId} className="ml-2 text-sm text-gray-700">
                  {option.label}
                </label>
              </div>
            );
          })}
        </div>
        {renderError()}
      </fieldset>
    );
  };

  const renderRadioGroup = () => {
    const selectedValue = (value as string) || '';
    const options = field.options || [];

    return (
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </legend>
        <div className="space-y-2" role="radiogroup" aria-describedby={hasError ? errorId : undefined}>
          {options.map((option: FieldOption, index: number) => {
            const optionId = `${fieldId}-option-${index}`;
            const isChecked = selectedValue === option.value;

            return (
              <div key={option.value} className="flex items-center">
                <input
                  type="radio"
                  id={optionId}
                  name={field.id}
                  value={option.value}
                  checked={isChecked}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                  aria-invalid={hasError}
                />
                <label htmlFor={optionId} className="ml-2 text-sm text-gray-700">
                  {option.label}
                </label>
              </div>
            );
          })}
        </div>
        {renderError()}
      </fieldset>
    );
  };

  // Render the appropriate field type
  switch (field.fieldType) {
    case 'text':
      return renderTextField();
    case 'number':
      return renderNumberField();
    case 'date':
      return renderDateField();
    case 'textarea':
      return renderTextareaField();
    case 'checkbox':
      return renderCheckboxGroup();
    case 'radio':
      return renderRadioGroup();
    default:
      return null;
  }
}
