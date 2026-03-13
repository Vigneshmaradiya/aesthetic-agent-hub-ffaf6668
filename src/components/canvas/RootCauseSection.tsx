"use client";

import { useCallback } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { StepAnnotation } from "./StepAnnotation";
import type { TroubleshootingStep } from "@/types/canvas";

function StatusIndicator({
  status,
}: {
  status: TroubleshootingStep["status"];
}) {
  switch (status) {
    case "pending":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-nexus-text-dim" />
      );
    case "in_progress":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-nexus-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nexus-accent" />
        </div>
      );
    case "completed":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nexus-success">
          <svg
            className="h-3 w-3 text-nexus-base"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    case "skipped":
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-nexus-text-dim bg-nexus-text-dim/10">
          <svg
            className="h-3 w-3 text-nexus-text-dim"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      );
  }
}

export function RootCauseSection() {
  const signals = useCanvasStore((s) => s.rootCauseSignals);
  const steps = useCanvasStore((s) => s.troubleshootingSteps);
  const annotations = useCanvasStore((s) => s.stepAnnotations);
  const setStepAnnotation = useCanvasStore((s) => s.setStepAnnotation);

  const handleAnnotationChange = useCallback(
    (stepId: string, text: string) => {
      setStepAnnotation(stepId, text);
    },
    [setStepAnnotation],
  );

  const hasContent = signals.length > 0 || steps.length > 0;
  if (!hasContent) return null;

  return (
    <CanvasSection sectionId="root-cause" title="Root Cause Analysis">
      <div className="space-y-4 px-4 pb-4">
        {/* Root cause signals */}
        {signals.map((signal, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-nexus-text">
                {signal.description}
              </p>
              <ConfidenceBadge score={signal.confidence} />
            </div>
            {signal.category && (
              <span className="inline-flex rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
                {signal.category}
              </span>
            )}
            {signal.evidence.length > 0 && (
              <ul className="space-y-1">
                {signal.evidence.map((ev, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-xs text-nexus-text-muted"
                  >
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-nexus-accent" />
                    {ev}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Troubleshooting steps */}
        {steps.length > 0 && (
          <div className="space-y-0">
            {signals.length > 0 && (
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-nexus-text-muted">
                Troubleshooting Steps
              </h4>
            )}
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <StatusIndicator status={step.status} />
                  {index < steps.length - 1 && (
                    <div className="mt-1 w-px flex-1 bg-nexus-border" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <h4
                    className={`text-xs font-medium ${
                      step.status === "skipped"
                        ? "text-nexus-text-dim line-through"
                        : "text-nexus-text"
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-nexus-text-muted">
                    {step.description}
                  </p>
                  {step.status === "completed" && step.result && (
                    <div className="mt-1.5 rounded-md bg-nexus-success/10 px-2 py-1.5 text-xs text-nexus-success">
                      {step.result}
                    </div>
                  )}
                  {step.citation && (
                    <a
                      href={step.citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-nexus-accent hover:underline"
                    >
                      KB Article
                    </a>
                  )}
                  <StepAnnotation
                    stepId={step.id}
                    annotation={annotations[step.id] ?? ""}
                    onAnnotationChange={handleAnnotationChange}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CanvasSection>
  );
}
