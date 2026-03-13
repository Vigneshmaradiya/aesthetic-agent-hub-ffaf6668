"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import type { ResolutionStage, CanvasSectionId } from "@/types/canvas";

const STAGES: {
  stage: ResolutionStage;
  label: string;
  sectionId: CanvasSectionId;
}[] = [
  { stage: "intake", label: "Intake", sectionId: "ticket-readiness" },
  {
    stage: "classification",
    label: "Classification",
    sectionId: "case-classification",
  },
  {
    stage: "resolution",
    label: "Resolution",
    sectionId: "troubleshooting-tools",
  },
  { stage: "capture", label: "Capture", sectionId: "knowledge-capture" },
];

export function WorkflowProgressBar() {
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);
  const workflow = useCanvasStore((s) => s.resolutionWorkflow);
  const setScrollToSection = useCanvasStore((s) => s.setScrollToSection);

  if (!activeTicketId) return null;

  const currentIndex = STAGES.findIndex(
    (s) => s.stage === workflow.currentStage,
  );

  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-surface px-4 py-3">
      <div className="flex items-center">
        {STAGES.map((item, i) => {
          const isCompleted = workflow.completedStages.includes(item.stage);
          const isCurrent = item.stage === workflow.currentStage;

          return (
            <div key={item.stage} className="flex flex-1 items-center">
              {/* Stage node */}
              <button
                onClick={() => setScrollToSection(item.sectionId)}
                className="group flex flex-col items-center"
                title={`Go to ${item.label}`}
              >
                {/* Circle */}
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    isCompleted
                      ? "bg-nexus-success text-nexus-base"
                      : isCurrent
                        ? "animate-pulse bg-nexus-accent text-nexus-base"
                        : "bg-nexus-surface-raised text-nexus-text-dim"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-1 text-[9px] font-medium transition-colors ${
                    isCompleted
                      ? "text-nexus-success"
                      : isCurrent
                        ? "text-nexus-accent"
                        : "text-nexus-text-dim"
                  } group-hover:text-nexus-text`}
                >
                  {item.label}
                </span>
              </button>

              {/* Connecting line (not after last) */}
              {i < STAGES.length - 1 && (
                <div className="mx-1 h-px flex-1">
                  <div
                    className={`h-px w-full ${
                      i < currentIndex ||
                      (isCompleted &&
                        workflow.completedStages.includes(STAGES[i + 1]?.stage))
                        ? "bg-nexus-success"
                        : "bg-nexus-border"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
