"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { triggerChatAction } from "@/lib/chat/trigger";

export function ResolutionInsightsSection() {
  const similarCases = useCanvasStore((s) => s.similarCases);
  const resolutionInsights = useCanvasStore((s) => s.resolutionInsights);
  const intel = useCanvasStore((s) => s.ticketIntelligence);
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);
  const relatedArticles = intel?.relatedArticles ?? [];

  // Merge KB articles from evidenceSources + ticketIntelligence.relatedArticles
  const kbSources = (resolutionInsights?.evidenceSources ?? []).filter(
    (s) => s.type === "kb" && s.title,
  );
  // Dedup with relatedArticles by title
  const relatedTitles = new Set(relatedArticles.map((a) => a.title.toLowerCase()));
  const extraKbArticles = kbSources.filter(
    (s) => !relatedTitles.has(s.title.toLowerCase()),
  );

  const jiraSources = (resolutionInsights?.evidenceSources ?? []).filter(
    (s) => s.type === "jira",
  );
  const engineeringIssues = resolutionInsights?.relatedEngineeringIssues ?? [];
  // Dedup jira evidence with engineeringIssues
  const engineeringIds = new Set(engineeringIssues.map((i) => i.id));
  const extraJiraIssues = jiraSources.filter((s) => !engineeringIds.has(s.id));

  const hasContent =
    similarCases.length > 0 ||
    relatedArticles.length > 0 ||
    extraKbArticles.length > 0 ||
    engineeringIssues.length > 0 ||
    extraJiraIssues.length > 0 ||
    (resolutionInsights?.similarCasesCount ?? 0) > 0;

  if (!hasContent) return null;

  function handleShareArticle(title: string, url?: string) {
    const ref = url ? `${title} — ${url}` : title;
    triggerChatAction(
      `Share this KB article with the customer for ticket #${activeTicketId}: ${ref}`,
    );
  }

  return (
    <CanvasSection sectionId="resolution-insights" title="Insights">
      <div className="space-y-4 px-4 pb-4">
        {/* Similar Cases */}
        {similarCases.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
              Similar Cases{" "}
              <span className="ml-1 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-nexus-text-dim">
                {similarCases.length}
              </span>
            </p>
            <div className="space-y-1.5">
              {similarCases.map((c) => (
                <div
                  key={c.ticketId}
                  className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2.5 py-1.5"
                >
                  <span className="shrink-0 font-mono text-[10px] text-nexus-text-dim">
                    #{c.ticketId}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-nexus-text">
                    {c.subject}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      c.status === "solved"
                        ? "bg-nexus-success/15 text-nexus-success"
                        : "bg-nexus-accent/15 text-nexus-accent"
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.similarity > 0 && (
                    <span className="shrink-0 font-mono text-[10px] text-nexus-text-dim">
                      {Math.round(c.similarity * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar case count from SearchUnify when no case objects */}
        {similarCases.length === 0 &&
          (resolutionInsights?.similarCasesCount ?? 0) > 0 && (
            <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-3 py-2 text-xs text-nexus-text-muted">
              {resolutionInsights!.similarCasesCount} similar results found via
              SearchUnify
            </div>
          )}

        {/* Related KB Articles (from ticketIntelligence brief) */}
        {relatedArticles.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
              Related Articles{" "}
              <span className="ml-1 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-nexus-text-dim">
                {relatedArticles.length}
              </span>
            </p>
            <div className="space-y-1">
              {relatedArticles.map((article) => (
                <div
                  key={article.sourceId}
                  className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-nexus-surface-raised"
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-xs text-nexus-accent"
                  >
                    {article.title}
                  </a>
                  <span className="shrink-0 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-nexus-text-dim">
                    {Math.round(article.relevance * 100)}%
                  </span>
                  <button
                    onClick={() => handleShareArticle(article.title, article.url)}
                    title="Draft reply sharing this article"
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-nexus-text-dim transition-colors hover:bg-nexus-accent/10 hover:text-nexus-accent"
                  >
                    Share
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KB Articles from SearchUnify evidenceSources */}
        {extraKbArticles.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
              SearchUnify Articles{" "}
              <span className="ml-1 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-nexus-text-dim">
                {extraKbArticles.length}
              </span>
            </p>
            <div className="space-y-1">
              {extraKbArticles.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-nexus-surface-raised"
                >
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-nexus-accent"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs text-nexus-text">
                      {source.title}
                    </span>
                  )}
                  <button
                    onClick={() => handleShareArticle(source.title, source.url)}
                    title="Draft reply sharing this article"
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-nexus-text-dim transition-colors hover:bg-nexus-accent/10 hover:text-nexus-accent"
                  >
                    Share
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related JIRA Issues */}
        {(engineeringIssues.length > 0 || extraJiraIssues.length > 0) && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
              JIRA Issues{" "}
              <span className="ml-1 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-nexus-text-dim">
                {engineeringIssues.length + extraJiraIssues.length}
              </span>
            </p>
            <div className="space-y-1.5">
              {engineeringIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2.5 py-1.5"
                >
                  <span className="shrink-0 font-mono text-[10px] font-medium text-nexus-warning">
                    {issue.id}
                  </span>
                  {issue.url ? (
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-nexus-accent"
                    >
                      {issue.title || issue.id}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs text-nexus-text">
                      {issue.title || issue.id}
                    </span>
                  )}
                  <span className="shrink-0 rounded-full bg-nexus-surface-raised px-1.5 py-0.5 text-[10px] text-nexus-text-dim">
                    {issue.status}
                  </span>
                </div>
              ))}
              {extraJiraIssues.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2.5 py-1.5"
                >
                  <span className="shrink-0 font-mono text-[10px] font-medium text-nexus-warning">
                    {source.id}
                  </span>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-nexus-accent"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs text-nexus-text">
                      {source.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CanvasSection>
  );
}
