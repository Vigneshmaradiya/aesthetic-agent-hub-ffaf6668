"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ActionButton } from "./ActionButton";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { triggerChatAction } from "@/lib/chat/trigger";
import type { ActionCategory } from "@/types/canvas";

const categoryIcons: Record<ActionCategory, React.ReactNode> = {
  respond: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  ),
  escalate: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  investigate: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  resolve: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
};

// Extract URLs from markdown text (for "share" quick actions)
function extractUrls(text: string): Array<{ url: string; label: string }> {
  const results: Array<{ url: string; label: string }> = [];
  // Match markdown links: [label](url)
  const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdLinkRe.exec(text)) !== null) {
    results.push({ label: m[1], url: m[2] });
  }
  // Match bare URLs not already captured
  const captured = new Set(results.map((r) => r.url));
  const bareUrlRe = /(?<!\()(https?:\/\/[^\s)>]+)/g;
  while ((m = bareUrlRe.exec(text)) !== null) {
    if (!captured.has(m[1])) {
      results.push({ label: m[1], url: m[1] });
      captured.add(m[1]);
    }
  }
  return results.slice(0, 3);
}

export function NextBestActionSection() {
  const nba = useCanvasStore((s) => s.nextBestAction);
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);

  if (!nba) return null;

  // Build context-aware quick actions when the LLM hasn't provided any
  const fullText = `${nba.recommendation}\n${nba.reasoning ?? ""}`;
  const articleLinks = extractUrls(fullText);

  const defaultActions: Array<{ label: string; prompt: string }> = [];
  if (nba.category === "respond" || nba.category === "resolve") {
    defaultActions.push({
      label: "Draft customer reply",
      prompt: `Based on the recommended action "${nba.recommendation}", draft an empathetic customer reply for ticket #${activeTicketId}.`,
    });
  }
  if (nba.category === "escalate") {
    defaultActions.push({
      label: "Draft escalation",
      prompt: `Based on the recommended action "${nba.recommendation}", draft an escalation message with full context for ticket #${activeTicketId}.`,
    });
  }
  if (nba.category === "investigate") {
    defaultActions.push({
      label: "Investigate logs",
      prompt: `Run diagnostics and check recent logs for ticket #${activeTicketId} based on: ${nba.recommendation}`,
    });
  }

  return (
    <CanvasSection
      sectionId="next-best-action"
      title="Recommended Action"
      icon={categoryIcons[nba.category]}
      badge={<ConfidenceBadge score={nba.confidence} />}
    >
      <div className="space-y-3 px-4 pb-4">
        <div className="font-medium text-nexus-text [&_.markdown-content]:text-sm">
          <MarkdownContent content={nba.recommendation} />
        </div>
        {nba.reasoning && (
          <div className="text-nexus-text-muted [&_.markdown-content]:text-xs [&_.markdown-content_ol]:list-decimal [&_.markdown-content_ol]:pl-4 [&_.markdown-content_ul]:list-disc [&_.markdown-content_ul]:pl-4">
            <MarkdownContent content={nba.reasoning} />
          </div>
        )}

        {/* LLM-provided actions */}
        {nba.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {nba.actions.map((action) => (
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

        {/* Quick actions row — always shown */}
        <div className="flex flex-wrap gap-2 border-t border-nexus-border pt-2">
          {/* Default context-aware actions */}
          {defaultActions.map((a) => (
            <button
              key={a.label}
              onClick={() => triggerChatAction(a.prompt)}
              className="rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1 text-[10px] font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent/40 hover:text-nexus-accent"
            >
              {a.label}
            </button>
          ))}
          {/* Article/guide share buttons */}
          {articleLinks.map((link) => (
            <button
              key={link.url}
              onClick={() =>
                triggerChatAction(
                  `Share this guide with the customer for ticket #${activeTicketId}: "${link.label}" — ${link.url}`,
                )
              }
              className="flex items-center gap-1 rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1 text-[10px] font-medium text-nexus-accent transition-colors hover:border-nexus-accent/40 hover:bg-nexus-accent/10"
            >
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Share: {link.label.length > 30 ? link.label.slice(0, 30) + "…" : link.label}
            </button>
          ))}
        </div>
      </div>
    </CanvasSection>
  );
}
