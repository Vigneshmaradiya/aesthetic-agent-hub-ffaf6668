"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ActionButton } from "./ActionButton";
import type { CaseCategory } from "@/types/canvas";

const categoryStyles: Record<CaseCategory, { label: string; color: string }> = {
  self_service: {
    label: "Self-Service",
    color: "bg-blue-500/15 text-blue-400",
  },
  service_request: {
    label: "Service Request",
    color: "bg-nexus-success/15 text-nexus-success",
  },
  feature_request: {
    label: "Feature Request",
    color: "bg-purple-500/15 text-purple-400",
  },
  bug_known_issue: {
    label: "Bug / Known Issue",
    color: "bg-red-500/15 text-red-400",
  },
  unknown_issue: {
    label: "Unknown Issue",
    color: "bg-amber-500/15 text-amber-400",
  },
};

export function CaseClassificationSection() {
  const data = useCanvasStore((s) => s.caseClassification);

  if (!data) return null;

  const style = categoryStyles[data.category] ?? {
    label: data.category,
    color: "bg-nexus-surface-raised text-nexus-text-dim",
  };

  return (
    <CanvasSection
      sectionId="case-classification"
      title="Case Classification"
      badge={<ConfidenceBadge score={data.confidence} />}
    >
      <div className="space-y-3 px-4 pb-4">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ${style.color}`}
          >
            {style.label}
          </span>
        </div>

        {/* Reasoning */}
        <p className="text-xs leading-relaxed text-nexus-text-muted">
          {data.reasoning}
        </p>

        {/* Suggested Actions */}
        {data.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {data.suggestedActions.map((action) => (
              <ActionButton
                key={action.id}
                label={action.label}
                mcpTool={action.mcpTool}
                mcpArgs={action.mcpArgs}
                chatPrompt={action.chatPrompt}
                variant={action.variant}
                requiresHitl={action.requiresHitl}
              />
            ))}
          </div>
        )}
      </div>
    </CanvasSection>
  );
}
