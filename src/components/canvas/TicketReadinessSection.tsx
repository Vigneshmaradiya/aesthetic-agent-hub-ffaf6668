"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ActionButton } from "./ActionButton";

export function TicketReadinessSection() {
  const data = useCanvasStore((s) => s.ticketReadiness);

  if (!data) return null;

  const barColor =
    data.score > 70
      ? "bg-nexus-success"
      : data.score >= 40
        ? "bg-nexus-warning"
        : "bg-red-400";

  const statusLabel =
    data.missingFields.length === 0 ? "Complete" : "Incomplete";

  return (
    <CanvasSection
      sectionId="ticket-readiness"
      title="Ticket Readiness"
      badge={
        <span className="rounded bg-nexus-surface-raised px-2 py-0.5 font-mono text-[10px] text-nexus-text-dim">
          {data.score}%
        </span>
      }
    >
      <div className="space-y-3 px-4 pb-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-nexus-text-dim">
              Readiness Score
            </span>
            <span className="font-mono text-[10px] text-nexus-text-muted">
              {data.score}/100
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-nexus-surface-raised">
            <div
              className={`h-2 rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(data.score, 100)}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          {data.checks.map((check) => (
            <div
              key={check.field}
              className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2.5 py-1.5"
            >
              <span
                className={`shrink-0 text-sm font-bold ${check.present ? "text-nexus-success" : "text-red-400"}`}
              >
                {check.present ? "\u2713" : "\u2717"}
              </span>
              <span className="min-w-0 flex-1 text-xs text-nexus-text">
                {check.label}
              </span>
              {check.value && (
                <span className="max-w-[120px] shrink-0 truncate text-[10px] text-nexus-text-dim">
                  {check.value}
                </span>
              )}
              {!check.present && check.action?.chatPrompt && (
                <ActionButton
                  label={check.action.label}
                  chatPrompt={check.action.chatPrompt}
                  variant="ghost"
                  requiresHitl={check.action.requiresHitl}
                />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <p className="text-xs text-nexus-text-muted">
          Ticket readiness:{" "}
          <span
            className={
              data.missingFields.length === 0
                ? "text-nexus-success"
                : "text-nexus-warning"
            }
          >
            {statusLabel}
          </span>
          {data.missingFields.length > 0 && (
            <span className="text-nexus-text-dim">
              {" "}
              &mdash; Missing: {data.missingFields.join(", ")}
            </span>
          )}
        </p>
      </div>
    </CanvasSection>
  );
}
