"use client";

import { useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { triggerChatAction } from "@/lib/chat/trigger";
import { refreshSimilarCases } from "@/lib/chat/canvas-bridge";

const sourceBadgeStyles: Record<string, { label: string; color: string }> = {
  zendesk: { label: "ZD", color: "bg-nexus-success/15 text-nexus-success" },
  searchunify: { label: "SU", color: "bg-nexus-accent/15 text-nexus-accent" },
};

export function SimilarCasesSection() {
  const cases = useCanvasStore((s) => s.similarCases);
  const [refreshing, setRefreshing] = useState(false);

  if (cases.length === 0) return null;

  function handleRefresh() {
    setRefreshing(true);
    refreshSimilarCases();
    setTimeout(() => setRefreshing(false), 3000);
  }

  const resolved = cases.filter(
    (c) =>
      c.status.toLowerCase() === "solved" ||
      c.status.toLowerCase() === "closed",
  );
  const topResolution = resolved.length > 0 ? resolved[0].resolution : null;

  return (
    <CanvasSection
      sectionId="similar-cases"
      title="Similar Cases"
      badge={
        <div className="flex items-center gap-2">
          <span className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
            {cases.length} found
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded p-0.5 text-nexus-text-dim transition-colors hover:text-nexus-accent disabled:cursor-not-allowed disabled:opacity-40"
            title="Refresh from Zendesk + SearchUnify"
          >
            <svg
              className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-4">
        {/* Summary line */}
        {resolved.length > 0 && topResolution && (
          <p className="text-xs text-nexus-text-muted">
            {resolved.length} of {cases.length} resolved
            {topResolution && (
              <span className="text-nexus-text">
                {" "}
                — most common: {topResolution}
              </span>
            )}
          </p>
        )}

        {/* Case list */}
        <div className="space-y-2">
          {cases.slice(0, 5).map((c) => {
            const statusColors: Record<string, string> = {
              solved: "text-nexus-success",
              closed: "text-nexus-text-dim",
              open: "text-nexus-accent",
              pending: "text-nexus-warning",
            };
            const statusColor =
              statusColors[c.status.toLowerCase()] ?? "text-nexus-text-muted";
            const sourceBadge = c.source ? sourceBadgeStyles[c.source] : null;

            return (
              <button
                key={c.ticketId}
                onClick={() =>
                  triggerChatAction(
                    `Look up ticket #${c.ticketId} and compare it with the current ticket.`,
                  )
                }
                className="flex w-full items-start gap-3 rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-2.5 text-left transition-colors hover:border-nexus-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-nexus-text-dim">
                      #{c.ticketId}
                    </span>
                    <span className={`text-[10px] font-medium ${statusColor}`}>
                      {c.status}
                    </span>
                    <span className="rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-nexus-text-dim">
                      {Math.round(c.similarity * 100)}%
                    </span>
                    {sourceBadge && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${sourceBadge.color}`}
                      >
                        {sourceBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-nexus-text">
                    {c.subject}
                  </p>
                  {c.resolution && (
                    <p className="mt-0.5 text-[10px] text-nexus-text-muted">
                      Resolution: {c.resolution}
                    </p>
                  )}
                  {/* Resolved by + KB Article link */}
                  <div className="mt-0.5 flex items-center gap-2">
                    {c.resolvedBy && (
                      <span className="text-[10px] text-nexus-text-dim">
                        Resolved by: {c.resolvedBy}
                      </span>
                    )}
                    {c.kbArticleUrl && (
                      <a
                        href={c.kbArticleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-nexus-accent underline decoration-nexus-accent/30 hover:decoration-nexus-accent"
                      >
                        KB Article
                      </a>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </CanvasSection>
  );
}
