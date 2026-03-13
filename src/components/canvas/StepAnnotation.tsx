"use client";

import { useCallback, useState } from "react";

interface StepAnnotationProps {
  stepId: string;
  annotation: string;
  onAnnotationChange: (stepId: string, text: string) => void;
}

const MAX_CHARS = 500;

export function StepAnnotation({
  stepId,
  annotation,
  onAnnotationChange,
}: StepAnnotationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAnnotation = annotation.length > 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_CHARS) {
        onAnnotationChange(stepId, value);
      }
    },
    [stepId, onAnnotationChange],
  );

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-1 text-[11px] text-nexus-text-dim transition-colors hover:text-nexus-accent"
      >
        <svg
          className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {hasAnnotation ? (
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-nexus-accent"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
            </svg>
            Note added
          </span>
        ) : (
          "Add note"
        )}
      </button>

      {isExpanded && (
        <div className="mt-1.5 space-y-1">
          <textarea
            value={annotation}
            onChange={handleChange}
            placeholder="Add a note about this step..."
            rows={3}
            className="w-full resize-none rounded-md border border-nexus-border bg-nexus-base px-3 py-2 text-xs text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent-dim focus:outline-none focus:ring-1 focus:ring-nexus-accent-dim"
          />
          <div className="text-right text-[10px] text-nexus-text-dim">
            {annotation.length}/{MAX_CHARS}
          </div>
        </div>
      )}
    </div>
  );
}
