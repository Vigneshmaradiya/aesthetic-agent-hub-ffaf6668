"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { PriorityBadge } from "./PriorityBadge";
import { SentimentMeter, sentimentConfig } from "./SentimentMeter";
import { ConfidenceBadge } from "./ConfidenceBadge";

function SLARiskBadge({
  risk,
}: {
  risk: { breachesIn: string; riskLevel: string; policyName: string };
}) {
  const colors: Record<string, string> = {
    low: "bg-nexus-success/15 text-nexus-success",
    medium: "bg-nexus-warning/15 text-nexus-warning",
    high: "bg-nexus-error/15 text-nexus-error",
    breach: "bg-red-600/20 text-red-400",
  };
  const color = colors[risk.riskLevel] ?? colors.medium;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
    >
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
  const color = colors[status.toLowerCase()] ?? colors.open;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
    >
      {status}
    </span>
  );
}

export function TicketIntelligenceSection() {
  const intel = useCanvasStore((s) => s.ticketIntelligence);

  if (!intel) return null;

  return (
    <CanvasSection sectionId="ticket-intelligence" title="Ticket Intelligence">
      <div className="space-y-4 px-4 pb-4">
        {/* Header row */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-nexus-text-dim">
              #{intel.ticketId}
            </span>
            <PriorityBadge priority={intel.priority} />
            <StatusBadge status={intel.status} />
            {intel.slaRisk && <SLARiskBadge risk={intel.slaRisk} />}
            {intel.confidenceScore > 0 && (
              <ConfidenceBadge score={intel.confidenceScore} />
            )}
          </div>
          <h2 className="text-sm font-semibold text-nexus-text">
            {intel.subject}
          </h2>
          <div className="flex items-center gap-3 text-xs text-nexus-text-muted">
            <span>Requester: {intel.requester}</span>
            {intel.assignee && <span>Assignee: {intel.assignee}</span>}
          </div>
        </div>

        {/* Sentiment */}
        <SentimentMeter sentiment={intel.sentiment} />

        {/* Summary */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-nexus-text-muted">
            Summary
          </h3>
          <div
            className={`rounded-md bg-gradient-to-r p-3 text-sm leading-relaxed text-nexus-text ${sentimentConfig[intel.sentiment].bgGradient}`}
          >
            {intel.summary}
          </div>
        </div>

        {/* Evidence */}
        {intel.evidence.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-nexus-text-muted">
              Evidence
            </h3>
            <ul className="space-y-1">
              {intel.evidence.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-nexus-text-muted"
                >
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-nexus-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Linked JIRA Issues */}
        {intel.linkedJiraIssues.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-nexus-text-muted">
              Engineering Issues
            </h3>
            <div className="space-y-1.5">
              {intel.linkedJiraIssues.map((issue) => {
                const statusLower = issue.status.toLowerCase();
                const statusColor =
                  statusLower === "open"
                    ? "text-nexus-accent"
                    : statusLower === "in progress" ||
                        statusLower === "in_progress"
                      ? "text-nexus-warning"
                      : statusLower === "resolved" ||
                          statusLower === "done" ||
                          statusLower === "closed"
                        ? "text-nexus-success"
                        : "text-nexus-text-muted";

                return (
                  <a
                    key={issue.key}
                    href={issue.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2.5 py-1.5 transition-colors hover:bg-nexus-surface-raised"
                  >
                    {/* JIRA icon */}
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-nexus-text-dim"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="shrink-0 font-mono text-[10px] text-nexus-text-dim">
                      {issue.key}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-nexus-text">
                      {issue.summary}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-medium ${statusColor}`}
                    >
                      {issue.status}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {intel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {intel.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related articles */}
        {intel.relatedArticles.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-nexus-text-muted">
              Related Articles
            </h3>
            <ul className="space-y-1">
              {intel.relatedArticles.map((article) => (
                <li key={article.sourceId}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-nexus-accent transition-colors hover:bg-nexus-surface-raised"
                  >
                    <span className="truncate">{article.title}</span>
                    <span className="ml-2 shrink-0 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-nexus-text-dim">
                      {Math.round(article.relevance * 100)}%
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CanvasSection>
  );
}
