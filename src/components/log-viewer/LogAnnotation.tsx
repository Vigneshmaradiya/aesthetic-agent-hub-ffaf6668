"use client";

import { useCallback, useState } from "react";

interface LogAnnotationProps {
  lineNumber: number;
  annotations: Map<number, string>;
  onAnnotationChange: (lineNumber: number, text: string) => void;
}

export function LogAnnotation({
  lineNumber,
  annotations,
  onAnnotationChange,
}: LogAnnotationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const existingAnnotation = annotations.get(lineNumber) ?? "";
  const hasAnnotation = existingAnnotation.length > 0;

  const handleSave = useCallback(
    (value: string) => {
      onAnnotationChange(lineNumber, value);
      if (!value.trim()) {
        setIsEditing(false);
      }
    },
    [lineNumber, onAnnotationChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditing(false);
      }
      if (e.key === "Escape") {
        setIsEditing(false);
      }
    },
    [],
  );

  if (isEditing) {
    return (
      <div className="mt-1 flex items-center gap-1.5">
        <svg
          className="h-3 w-3 shrink-0 text-nexus-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <input
          type="text"
          defaultValue={existingAnnotation}
          onBlur={(e) => {
            handleSave(e.target.value);
            setIsEditing(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add annotation..."
          autoFocus
          className="w-full rounded border border-nexus-border bg-nexus-base px-2 py-0.5 text-[11px] text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent-dim focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  if (hasAnnotation) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="mt-1 flex items-center gap-1 text-[11px] text-nexus-accent hover:text-nexus-accent-muted"
        title="Edit annotation"
      >
        <svg
          className="h-3 w-3 shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          <path d="M12 15h2v-2h-2v2zm0-8v4h2V7h-2z" />
        </svg>
        <span className="truncate">{existingAnnotation}</span>
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="mt-1 text-[10px] text-nexus-text-dim opacity-0 transition-opacity hover:text-nexus-accent group-hover:opacity-100"
    >
      + Add note
    </button>
  );
}
