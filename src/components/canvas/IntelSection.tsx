"use client";

import { useState, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { PriorityBadge } from "./PriorityBadge";
import { SentimentMeter, sentimentConfig } from "./SentimentMeter";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ActionButton } from "./ActionButton";
import type { CaseCategory } from "@/types/canvas";
import type { TroubleshootingStep } from "@/types/canvas";
import { StepAnnotation } from "./StepAnnotation";

// ── Sub-section wrapper ────────────────────────────────────────────
function SubSection({
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-nexus-border first:border-t-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-nexus-surface-raised"
      >
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-nexus-text-muted">
          {title}
        </span>
        {badge}
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-nexus-text-dim transition-transform ${open ? "" : "-rotate-90"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Category styles for Classification sub-section ─────────────────
const categoryStyles: Record<CaseCategory, { label: string; color: string }> = {
  self_service: { label: "Self-Service", color: "bg-blue-500/15 text-blue-400" },
  service_request: { label: "Service Request", color: "bg-nexus-success/15 text-nexus-success" },
  feature_request: { label: "Feature Request", color: "bg-purple-500/15 text-purple-400" },
  bug_known_issue: { label: "Bug / Known Issue", color: "bg-red-500/15 text-red-400" },
  unknown_issue: { label: "Unknown Issue", color: "bg-amber-500/15 text-amber-400" },
};

// ── Status indicator for troubleshooting steps ─────────────────────
function StatusDot({ status }: { status: TroubleshootingStep["status"] }) {
  if (status === "completed")
    return <div className="h-2 w-2 shrink-0 rounded-full bg-nexus-success" />;
  if (status === "in_progress")
    return <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-nexus-accent" />;
  if (status === "skipped")
    return <div className="h-2 w-2 shrink-0 rounded-full bg-nexus-text-dim" />;
  return <div className="h-2 w-2 shrink-0 rounded-full border border-nexus-text-dim" />;
}

function SLARiskBadge({ risk }: { risk: { breachesIn: string; riskLevel: string } }) {
  const colors: Record<string, string> = {
    low: "bg-nexus-success/15 text-nexus-success",
    medium: "bg-nexus-warning/15 text-nexus-warning",
    high: "bg-nexus-error/15 text-nexus-error",
    breach: "bg-red-600/20 text-red-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[risk.riskLevel] ?? colors.medium}`}>
      SLA {risk.riskLevel === "breach" ? "BREACHED" : `in ${risk.breachesIn}`}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-nexus-info/15 text-nexus-info",
    open: "bg-nexus-accent/15 text-nexus-accent",
    pending: "bg-nexus-warning/15 text-nexus-warning",
    solved: "bg-nexus-success/15 text-nexus-success",
    closed: "bg-nexus-text-dim/15 text-nexus-text-dim",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status.toLowerCase()] ?? colors.open}`}>
      {status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────
export function IntelSection() {
  const intel = useCanvasStore((s) => s.ticketIntelligence);
  const customer = useCanvasStore((s) => s.customerIntelligence);
  const classification = useCanvasStore((s) => s.caseClassification);
  const signals = useCanvasStore((s) => s.rootCauseSignals);
  const steps = useCanvasStore((s) => s.troubleshootingSteps);
  const annotations = useCanvasStore((s) => s.stepAnnotations);
  const setStepAnnotation = useCanvasStore((s) => s.setStepAnnotation);

  const handleAnnotation = useCallback(
    (stepId: string, text: string) => setStepAnnotation(stepId, text),
    [setStepAnnotation],
  );

  const hasAny =
    intel !== null ||
    customer !== null ||
    classification !== null ||
    signals.length > 0 ||
    steps.length > 0;

  if (!hasAny) return null;

  const hasRootCause = signals.length > 0 || steps.length > 0;

  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
          Ticket Intelligence
        </span>
        {intel && (
          <span className="font-mono text-[10px] text-nexus-text-dim">
            #{intel.ticketId}
          </span>
        )}
      </div>

      {/* ── Ticket sub-section ── */}
      {intel && (
        <SubSection
          title="Ticket"
          badge={
            intel.confidenceScore > 0 ? (
              <ConfidenceBadge score={intel.confidenceScore} />
            ) : undefined
          }
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <PriorityBadge priority={intel.priority} />
                <StatusBadge status={intel.status} />
                {intel.slaRisk && <SLARiskBadge risk={intel.slaRisk} />}
              </div>
              <p className="text-sm font-semibold text-nexus-text">{intel.subject}</p>
              <div className="flex flex-wrap gap-3 text-xs text-nexus-text-muted">
                <span>Requester: {intel.requester}</span>
                {intel.assignee && <span>Assignee: {intel.assignee}</span>}
              </div>
            </div>

            <SentimentMeter sentiment={intel.sentiment} />

            <div
              className={`rounded-md bg-gradient-to-r p-3 text-xs leading-relaxed text-nexus-text ${sentimentConfig[intel.sentiment].bgGradient}`}
            >
              {intel.summary}
            </div>

            {intel.evidence.length > 0 && (
              <ul className="space-y-1">
                {intel.evidence.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-nexus-text-muted">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-nexus-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {intel.linkedJiraIssues.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                  Engineering Issues
                </p>
                {intel.linkedJiraIssues.map((issue) => (
                  <a
                    key={issue.key}
                    href={issue.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2.5 py-1.5 text-xs transition-colors hover:bg-nexus-surface-raised"
                  >
                    <span className="shrink-0 font-mono text-[10px] text-nexus-text-dim">{issue.key}</span>
                    <span className="min-w-0 flex-1 truncate text-nexus-text">{issue.summary}</span>
                    <span className="shrink-0 text-[10px] text-nexus-text-muted">{issue.status}</span>
                  </a>
                ))}
              </div>
            )}

            {intel.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {intel.tags.map((tag) => (
                  <span key={tag} className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </SubSection>
      )}

      {/* ── Customer sub-section ── */}
      {customer && (
        <SubSection title="Customer">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-nexus-text">{customer.name}</p>
                <p className="text-xs text-nexus-text-muted">{customer.email}</p>
                {customer.org && <p className="text-xs text-nexus-text-dim">{customer.org}</p>}
              </div>
              <div className="flex items-center gap-2">
                {customer.arr != null && (
                  <span className="font-mono text-[10px] text-nexus-text-dim">
                    ${customer.arr.toLocaleString()} ARR
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${{enterprise:"bg-nexus-accent/15 text-nexus-accent",premium:"bg-nexus-warning/15 text-nexus-warning",standard:"bg-nexus-info/15 text-nexus-info",free:"bg-nexus-text-dim/15 text-nexus-text-dim"}[customer.tier.toLowerCase()] ?? "bg-nexus-info/15 text-nexus-info"}`}>
                  {customer.tier}
                </span>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-nexus-text">{customer.openTickets}</p>
                <p className="text-[10px] text-nexus-text-dim">Open</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-nexus-text">{customer.totalTickets}</p>
                <p className="text-[10px] text-nexus-text-dim">Total</p>
              </div>
            </div>

            <SentimentMeter sentiment={customer.sentiment} />

            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customer.tags.map((tag) => (
                  <span key={tag} className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </SubSection>
      )}

      {/* ── Classification sub-section ── */}
      {classification && (
        <SubSection
          title="Classification"
          badge={<ConfidenceBadge score={classification.confidence} />}
        >
          <div className="space-y-2.5">
            {(() => {
              const style = categoryStyles[classification.category] ?? {
                label: classification.category,
                color: "bg-nexus-surface-raised text-nexus-text-dim",
              };
              return (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ${style.color}`}>
                  {style.label}
                </span>
              );
            })()}
            <p className="text-xs leading-relaxed text-nexus-text-muted">
              {classification.reasoning}
            </p>
            {classification.suggestedActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {classification.suggestedActions.map((action) => (
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
        </SubSection>
      )}

      {/* ── Root Cause sub-section ── */}
      {hasRootCause && (
        <SubSection title="Root Cause" defaultOpen={false}>
          <div className="space-y-3">
            {signals.map((signal, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-nexus-text">{signal.description}</p>
                  <ConfidenceBadge score={signal.confidence} />
                </div>
                {signal.evidence.length > 0 && (
                  <ul className="space-y-1">
                    {signal.evidence.map((ev, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-nexus-text-muted">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-nexus-accent" />
                        {ev}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {steps.length > 0 && (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-0.5">
                      <StatusDot status={step.status} />
                      {index < steps.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-nexus-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-3">
                      <p className={`text-xs font-medium ${step.status === "skipped" ? "text-nexus-text-dim line-through" : "text-nexus-text"}`}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-nexus-text-muted">{step.description}</p>
                      {step.status === "completed" && step.result && (
                        <div className="mt-1 rounded bg-nexus-success/10 px-2 py-1 text-xs text-nexus-success">
                          {step.result}
                        </div>
                      )}
                      <StepAnnotation
                        stepId={step.id}
                        annotation={annotations[step.id] ?? ""}
                        onAnnotationChange={handleAnnotation}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SubSection>
      )}
    </div>
  );
}
