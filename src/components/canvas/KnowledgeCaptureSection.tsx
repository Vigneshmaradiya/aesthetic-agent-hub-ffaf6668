"use client";

import { useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ActionButton } from "./ActionButton";
import type { KBArticleStatus } from "@/types/canvas";

const statusStyles: Record<KBArticleStatus, { color: string; label: string }> =
  {
    draft: { color: "bg-orange-500/15 text-orange-400", label: "Draft" },
    ready_for_review: {
      color: "bg-nexus-success/15 text-nexus-success",
      label: "Ready for Review",
    },
  };

export function KnowledgeCaptureSection() {
  const data = useCanvasStore((s) => s.kbArticleDraft);
  const setKBArticleDraft = useCanvasStore((s) => s.setKBArticleDraft);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editProblem, setEditProblem] = useState("");
  const [editRootCause, setEditRootCause] = useState("");
  const [editSteps, setEditSteps] = useState<string[]>([]);

  if (!data) return null;

  const status = statusStyles[data.status];

  function handleStartEdit() {
    setEditTitle(data!.title);
    setEditProblem(data!.problem);
    setEditRootCause(data!.rootCause);
    setEditSteps([...data!.resolutionSteps]);
    setIsEditing(true);
  }

  function handleSave() {
    setKBArticleDraft({
      ...data!,
      title: editTitle,
      problem: editProblem,
      rootCause: editRootCause,
      resolutionSteps: editSteps.filter((s) => s.trim().length > 0),
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleStepChange(index: number, value: string) {
    setEditSteps((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleAddStep() {
    setEditSteps((prev) => [...prev, ""]);
  }

  function handleRemoveStep(index: number) {
    setEditSteps((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <CanvasSection
      sectionId="knowledge-capture"
      title="Knowledge Capture"
      badge={
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}
        >
          {status.label}
        </span>
      }
    >
      <div className="space-y-3 px-4 pb-4">
        {isEditing ? (
          /* ── Edit Mode ── */
          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Title
              </label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1.5 text-xs text-nexus-text outline-none focus:border-nexus-accent"
              />
            </div>

            {/* Problem */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Problem
              </label>
              <textarea
                value={editProblem}
                onChange={(e) => setEditProblem(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1.5 text-xs leading-relaxed text-nexus-text outline-none focus:border-nexus-accent"
              />
            </div>

            {/* Root Cause */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Root Cause
              </label>
              <textarea
                value={editRootCause}
                onChange={(e) => setEditRootCause(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1.5 text-xs leading-relaxed text-nexus-text outline-none focus:border-nexus-accent"
              />
            </div>

            {/* Resolution Steps */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Resolution Steps
              </label>
              <div className="mt-1 space-y-1.5">
                {editSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 shrink-0 text-[10px] text-nexus-text-dim">
                      {i + 1}.
                    </span>
                    <input
                      value={step}
                      onChange={(e) => handleStepChange(i, e.target.value)}
                      className="flex-1 rounded-md border border-nexus-border bg-nexus-surface-raised px-2 py-1 text-xs text-nexus-text outline-none focus:border-nexus-accent"
                    />
                    <button
                      onClick={() => handleRemoveStep(i)}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-nexus-text-dim transition-colors hover:text-nexus-error"
                      title="Remove step"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddStep}
                  className="text-[10px] text-nexus-accent hover:underline"
                >
                  + Add step
                </button>
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                className="rounded-md bg-nexus-accent px-3 py-1.5 text-xs font-medium text-nexus-base transition-colors hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="rounded-md border border-nexus-border bg-nexus-surface-raised px-3 py-1.5 text-xs font-medium text-nexus-text transition-colors hover:border-nexus-accent hover:text-nexus-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── View Mode ── */
          <>
            {/* Title */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Title
              </p>
              <p className="mt-0.5 text-sm font-medium text-nexus-text">
                {data.title}
              </p>
            </div>

            {/* Problem */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Problem
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-nexus-text-muted">
                {data.problem}
              </p>
            </div>

            {/* Root Cause */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                Root Cause
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-nexus-text-muted">
                {data.rootCause}
              </p>
            </div>

            {/* Resolution Steps */}
            {data.resolutionSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                  Resolution Steps
                </p>
                <ol className="mt-1 list-inside list-decimal space-y-1">
                  {data.resolutionSteps.map((step, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed text-nexus-text-muted"
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Affected Versions */}
            {data.affectedVersions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                  Affected Versions
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.affectedVersions.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-nexus-surface-raised px-2 py-0.5 font-mono text-[10px] text-nexus-text-dim"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {data.tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-nexus-accent/10 px-2 py-0.5 text-[10px] text-nexus-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleStartEdit}
                className="rounded-md border border-nexus-border bg-nexus-surface-raised px-3 py-1.5 text-xs font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent hover:text-nexus-accent"
              >
                Edit
              </button>
              <ActionButton
                label="Generate Draft"
                chatPrompt="Generate a KB article draft from the resolution of the current ticket"
                variant="secondary"
              />
              <ActionButton
                label="Publish to KB"
                chatPrompt="Publish this KB article draft for review"
                variant="ghost"
                requiresHitl
              />
            </div>
          </>
        )}
      </div>
    </CanvasSection>
  );
}
