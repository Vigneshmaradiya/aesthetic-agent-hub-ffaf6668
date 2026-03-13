"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ActionButton } from "./ActionButton";

export function SelfServiceModule() {
  const data = useCanvasStore((s) => s.selfServiceResolution);
  const insights = useCanvasStore((s) => s.resolutionInsights);

  // Fall back to resolution insights evidence sources if no dedicated self-service data
  if (!data && !insights?.evidenceSources?.length) return null;

  const articleTitle =
    data?.articleTitle ??
    insights?.evidenceSources?.find((s) => s.type === "kb")?.title ??
    "Knowledge Base Article";
  const articleUrl =
    data?.articleUrl ??
    insights?.evidenceSources?.find((s) => s.type === "kb")?.url ??
    "";
  const confidence = data?.confidence ?? insights?.confidence ?? 0.6;

  return (
    <CanvasSection sectionId="similar-cases" title="Self-Service Resolution">
      <div className="space-y-3 px-4 pb-4">
        {/* Matched article */}
        <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-sm">{"\u{1F4D6}"}</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-nexus-text">
                {articleTitle}
              </p>
              {data?.articleSnippet && (
                <p className="mt-1 text-[10px] leading-relaxed text-nexus-text-muted">
                  {data.articleSnippet}
                </p>
              )}
              {articleUrl && (
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[10px] text-nexus-accent hover:underline"
                >
                  View article
                </a>
              )}
            </div>
            <ConfidenceBadge score={confidence} />
          </div>
        </div>

        {/* Source badge */}
        {data?.source && (
          <span className="inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            Source: {data.source}
          </span>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="Send Article to Customer"
            chatPrompt={`Draft a helpful customer reply pointing them to the KB article "${articleTitle}" as a self-service solution.`}
            variant="primary"
          />
          <ActionButton
            label="Search More Articles"
            chatPrompt="Search the knowledge base for additional articles related to this issue."
            variant="secondary"
          />
        </div>
      </div>
    </CanvasSection>
  );
}
