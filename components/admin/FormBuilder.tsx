'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Field } from '@/types/schema';
import { LOW_CONFIDENCE_THRESHOLD } from '@/lib/constants';
import FieldEditor from '@/components/admin/FieldEditor';
import ConfidenceBadge from '@/components/admin/ConfidenceBadge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  // Use crypto.randomUUID when available (all modern browsers + Node 19+), else
  // fall back to a simple timestamp+random string that is UUID-shaped enough for
  // our purposes.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// SortableFieldRow — wraps a single field row with dnd-kit's useSortable
// ---------------------------------------------------------------------------

interface SortableFieldRowProps {
  field: Field;
  onFieldChange: (id: string, updates: Partial<Field>) => void;
  onDelete: (id: string) => void;
}

function SortableFieldRow({ field, onFieldChange, onDelete }: SortableFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          className="mt-1 cursor-grab touch-none rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        {/* Editor + badge */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-500">
              Field {field.position + 1}
            </span>
            <ConfidenceBadge
              fieldId={field.id}
              confidence={field.confidence}
              confirmed={field.confirmed}
            />
          </div>
          <FieldEditor
            field={field}
            onChange={(updates) => onFieldChange(field.id, updates)}
          />
        </div>

        {/* Delete button */}
        <button
          type="button"
          aria-label={`Delete field ${field.position + 1}`}
          onClick={() => onDelete(field.id)}
          className="mt-1 rounded p-1 text-gray-400 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// FormBuilder
// ---------------------------------------------------------------------------

interface FormBuilderProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  // Single-step undo: store the previous fields state before any mutation.
  const [previousFields, setPreviousFields] = useState<Field[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Count fields that need review (low-confidence and not yet confirmed).
  const lowConfidenceCount = fields.filter(
    (f) => f.confidence !== null && f.confidence < LOW_CONFIDENCE_THRESHOLD && !f.confirmed
  ).length;

  // -------------------------------------------------------------------------
  // Mutation helpers — each saves previous state before applying a change.
  // -------------------------------------------------------------------------

  const saveAndUpdate = useCallback(
    (newFields: Field[]) => {
      setPreviousFields(fields);
      onChange(newFields);
    },
    [fields, onChange]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({
      ...f,
      position: i,
    }));
    saveAndUpdate(reordered);
  }

  function handleFieldChange(id: string, updates: Partial<Field>) {
    const updated = fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    saveAndUpdate(updated);
  }

  function handleDelete(id: string) {
    const filtered = fields
      .filter((f) => f.id !== id)
      .map((f, i) => ({ ...f, position: i }));
    saveAndUpdate(filtered);
  }

  function handleAddField() {
    const newField: Field = {
      id: generateId(),
      formId: fields[0]?.formId ?? '',
      position: fields.length,
      label: '',
      fieldType: 'text',
      placeholder: '',
      required: false,
      options: null,
      confidence: null,
      confirmed: false,
    };
    saveAndUpdate([...fields, newField]);
  }

  function handleUndo() {
    if (previousFields === null) return;
    // Restore previous state; clear undo history (only one level).
    onChange(previousFields);
    setPreviousFields(null);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Low-confidence summary banner */}
      {lowConfidenceCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
        >
          <svg
            className="h-4 w-4 shrink-0"
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
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          {lowConfidenceCount} low-confidence field{lowConfidenceCount !== 1 ? 's' : ''} need
          {lowConfidenceCount === 1 ? 's' : ''} review
        </div>
      )}

      {/* Toolbar: Undo + Add Field */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={previousFields === null}
          aria-label="Undo last change"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
            />
          </svg>
          Undo
        </button>

        <button
          type="button"
          onClick={handleAddField}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Field
        </button>
      </div>

      {/* Sortable field list */}
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
          No fields yet. Click &ldquo;Add Field&rdquo; to get started.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3" aria-label="Form fields">
              {fields.map((field) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  onFieldChange={handleFieldChange}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
