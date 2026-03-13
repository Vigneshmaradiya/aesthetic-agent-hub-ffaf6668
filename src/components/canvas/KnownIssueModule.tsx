"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ActionButton } from "./ActionButton";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-500/15 text-red-400" },
  in_progress: {
    label: "In Progress",
    color: "bg-amber-500/15 text-amber-400",
  },
  resolved: {
    label: "Resolved",
    color: "bg-nexus-success/15 text-nexus-success",
  },
};

export function KnownIssueModule() {
  const data = useCanvasStore((s) => s.knownIssueResolution);
  const rootCauseSignals = useCanvasStore((s) => s.rootCauseSignals);
  const insights = useCanvasStore((s) => s.resolutionInsights);

  // Fall back to root cause + insights data
  const hasData =
    data ||
    rootCauseSignals.length > 0 ||
    (insights?.relatedEngineeringIssues?.length ?? 0) > 0;
  if (!hasData) return null;

  const statusStyle = data?.status
    ? (STATUS_STYLES[data.status] ?? {
        label: data.status,
        color: "bg-nexus-surface-raised text-nexus-text-dim",
      })
    : null;

  return (
    <CanvasSection sectionId="root-cause" title="Known Issue">
      <div className="space-y-3 px-4 pb-4">
        {/* Dedicated known issue data */}
        {data && (
          <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{"\u{1F41B}"}</span>
              <p className="flex-1 text-xs font-medium text-nexus-text">
                {data.issueTitle}
              </p>
              {statusStyle && (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.color}`}
                >
                  {statusStyle.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-nexus-text-dim">
              ID: {data.issueId}
            </p>
            {data.issueUrl && (
              <a
                href={data.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[10px] text-nexus-accent hover:underline"
              >
                View issue
              </a>
            )}
          </div>
        )}

        {/* Workaround */}
        {data?.workaround && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400">
              Workaround
            </p>
            <p className="mt-1 text-xs leading-relaxed text-nexus-text-muted">
              {data.workaround}
            </p>
          </div>
        )}

        {/* Affected versions */}
        {data?.affectedVersions && data.affectedVersions.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-nexus-text-dim">
              Affected Versions
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {data.affectedVersions.map((v) => (
                <span
                  key={v}
                  className="rounded bg-nexus-surface-raised px-1.5 py-0.5 text-[10px] text-nexus-text-muted"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: engineering issues from insights */}
        {!data &&
          insights?.relatedEngineeringIssues &&
          insights.relatedEngineeringIssues.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-nexus-text-dim">
                Related Engineering Issues
              </p>
              {insights.relatedEngineeringIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-2 text-[10px]"
                >
                  <span className="font-mono text-nexus-accent">
                    {issue.id}
                  </span>
                  {issue.title && (
                    <span className="text-nexus-text-muted">{issue.title}</span>
                  )}
                  <span className="rounded bg-nexus-surface-raised px-1.5 py-0.5 text-nexus-text-dim">
                    {issue.status}
                  </span>
                </div>
              ))}
            </div>
          )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="Send Workaround to Customer"
            chatPrompt={`Draft a reply informing the customer about ${data?.issueId ? `known issue ${data.issueId}` : "this known issue"} and providing the available workaround.`}
            variant="primary"
          />
          <ActionButton
            label="Check Issue Status"
            chatPrompt={`Check the current status and latest updates for ${data?.issueId ? `issue ${data.issueId}` : "the related engineering issue"}.`}
            variant="secondary"
          />
        </div>
      </div>
    </CanvasSection>
  );
}
