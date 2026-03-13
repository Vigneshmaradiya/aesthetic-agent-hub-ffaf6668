"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ActionButton } from "./ActionButton";
import { triggerChatAction } from "@/lib/chat/trigger";
import type { IncidentSeverity } from "@/types/canvas";

const severityStyles: Record<
  IncidentSeverity,
  { border: string; badge: string; label: string }
> = {
  low: {
    border: "border-l-blue-400",
    badge: "bg-blue-500/15 text-blue-400",
    label: "Low",
  },
  medium: {
    border: "border-l-nexus-warning",
    badge: "bg-nexus-warning/15 text-nexus-warning",
    label: "Medium",
  },
  high: {
    border: "border-l-orange-400",
    badge: "bg-orange-500/15 text-orange-400",
    label: "High",
  },
  critical: {
    border: "border-l-red-400",
    badge: "bg-red-500/15 text-red-400",
    label: "Critical",
  },
};

export function IncidentDetectionSection() {
  const signals = useCanvasStore((s) => s.incidentSignals);

  if (signals.length === 0) return null;

  return (
    <CanvasSection
      sectionId="incident-detection"
      title="Incident Detection"
      badge={
        <span className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
          {signals.length} signals
        </span>
      }
    >
      <div className="space-y-2 px-4 pb-4">
        {signals.map((signal, i) => {
          const sev = severityStyles[signal.severity];
          return (
            <div
              key={i}
              className={`rounded-md border border-nexus-border ${sev.border} border-l-2 bg-nexus-surface-raised/50 p-2.5`}
            >
              {/* Header: severity + confidence */}
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sev.badge}`}
                >
                  {sev.label}
                </span>
                <ConfidenceBadge score={signal.confidence} />
              </div>

              {/* Pattern description */}
              <p className="mt-1.5 text-xs leading-relaxed text-nexus-text">
                {signal.patternDescription}
              </p>

              {/* Affected tickets */}
              {signal.affectedTicketIds.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {signal.affectedTicketIds.map((ticketId) => (
                    <button
                      key={ticketId}
                      onClick={() =>
                        triggerChatAction(
                          `Look up ticket #${ticketId} and check if it is related to this incident pattern.`,
                        )
                      }
                      className="rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-nexus-accent transition-colors hover:bg-nexus-accent/20"
                    >
                      #{ticketId}
                    </button>
                  ))}
                </div>
              )}

              {/* Create Incident button */}
              <div className="mt-2">
                <ActionButton
                  label="Create Incident"
                  mcpTool={signal.suggestedAction.mcpTool}
                  mcpArgs={signal.suggestedAction.mcpArgs}
                  chatPrompt={signal.suggestedAction.chatPrompt}
                  variant={signal.suggestedAction.variant}
                  requiresHitl={signal.suggestedAction.requiresHitl}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CanvasSection>
  );
}
