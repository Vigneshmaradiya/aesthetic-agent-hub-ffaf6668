"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { useChatStore } from "@/stores/chat-store";
import { useSLAStore } from "@/stores/sla-store";
import { fetchCanvasEnrichments, computeSLAForTicket } from "@/lib/chat/canvas-bridge";
import { SLATimerBadge } from "@/components/canvas/SLATimerBadge";
import type { TicketIntelligence } from "@/types/canvas";

export interface TriageTicket {
  id: string;
  subject: string;
  priority: "high" | "medium" | "low";
  status?: "new" | "open" | "pending" | "hold" | "solved" | "closed";
  requester: { name: string; email: string };
  organization?: string;
  createdAt: string;
  tags: string[];
  slaBreachIn?: string;
  ticketAge?: string;
  customerTier?: string;
  sentiment?: "positive" | "neutral" | "negative" | "angry";
  lastCommentIsCustomer?: boolean;
}

interface TriageCardProps {
  ticket: TriageTicket;
  onDiveIn: () => void;
  onSnooze: () => void;
}

const PRIORITY_STYLES: Record<
  TriageTicket["priority"],
  { bg: string; text: string; label: string }
> = {
  high: {
    bg: "bg-nexus-error/15",
    text: "text-nexus-error",
    label: "High",
  },
  medium: {
    bg: "bg-nexus-warning/15",
    text: "text-nexus-warning",
    label: "Medium",
  },
  low: {
    bg: "bg-nexus-info/15",
    text: "text-nexus-info",
    label: "Low",
  },
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  new: { bg: "bg-nexus-info/15", text: "text-nexus-info", label: "New" },
  open: {
    bg: "bg-nexus-warning/15",
    text: "text-nexus-warning",
    label: "Open",
  },
  pending: {
    bg: "bg-nexus-accent/15",
    text: "text-nexus-accent",
    label: "Pending",
  },
  hold: {
    bg: "bg-nexus-text-muted/15",
    text: "text-nexus-text-muted",
    label: "On Hold",
  },
  solved: {
    bg: "bg-nexus-success/15",
    text: "text-nexus-success",
    label: "Solved",
  },
  closed: {
    bg: "bg-nexus-text-dim/15",
    text: "text-nexus-text-dim",
    label: "Closed",
  },
};

const SENTIMENT_STYLES: Record<
  string,
  { icon: string; text: string; label: string }
> = {
  angry: { icon: "\uD83D\uDE21", text: "text-nexus-error", label: "Angry" },
  negative: {
    icon: "\uD83D\uDE1F",
    text: "text-nexus-warning",
    label: "Negative",
  },
  positive: {
    icon: "\uD83D\uDE0A",
    text: "text-nexus-success",
    label: "Positive",
  },
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const created = new Date(dateString);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function TriageCard({ ticket, onDiveIn, onSnooze }: TriageCardProps) {
  const loadTicket = useCanvasStore((s) => s.loadTicket);
  const setTicketIntelligence = useCanvasStore((s) => s.setTicketIntelligence);
  const priorityStyle = PRIORITY_STYLES[ticket.priority];
  const statusStyle = ticket.status ? STATUS_STYLES[ticket.status] : undefined;

  function handleDiveIn() {
    // Clear chat history from the previous ticket
    useChatStore.getState().clearChat();

    // Load ticket — clears data and sets sections loading
    loadTicket(ticket.id);

    // Set initial ticket intelligence immediately
    const intel: TicketIntelligence = {
      ticketId: ticket.id,
      subject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status ?? "open",
      requester: ticket.requester.name,
      assignee: "",
      summary: `Ticket from ${ticket.requester.name}: ${ticket.subject}`,
      sentiment: "neutral",
      confidenceScore: 0,
      evidence: [],
      tags: ticket.tags,
      relatedArticles: [],
      linkedJiraIssues: [],
      slaRisk: null,
      createdAt: ticket.createdAt,
      updatedAt: "",
    };
    setTicketIntelligence(intel);
    computeSLAForTicket(intel);
    onDiveIn();

    // Fire all background canvas enrichments (customer, similar, timeline, readiness, insights)
    fetchCanvasEnrichments(ticket.id);

    // Background: fetch AI-enriched briefing (canvas-bridge handles the rest)
    fetch(`/api/tickets/${ticket.id}/brief`)
      .then((res) => res.json())
      .then((enriched) => {
        if (enriched && !enriched.error) {
          const validSentiments = ["positive", "neutral", "negative", "angry"];
          const store = useCanvasStore.getState();
          if (store.activeTicketId !== ticket.id) return;
          if (store.ticketIntelligence) {
            store.setTicketIntelligence({
              ...store.ticketIntelligence,
              summary: enriched.summary ?? store.ticketIntelligence.summary,
              sentiment: validSentiments.includes(enriched.sentiment)
                ? enriched.sentiment
                : store.ticketIntelligence.sentiment,
              confidenceScore: enriched.confidenceScore ?? 0,
              evidence: enriched.evidence ?? [],
              relatedArticles: enriched.relatedArticles ?? [],
              slaRisk: enriched.slaRisk ?? null,
            });
          }
          if (enriched.nextBestAction) {
            store.setNextBestAction(enriched.nextBestAction);
          }
          if (Array.isArray(enriched.suggestedActions)) {
            store.setSuggestedActions(
              enriched.suggestedActions.map(
                (a: Record<string, unknown>, i: number) => ({
                  id: String(a.id ?? `sa-${i}`),
                  label: String(a.label ?? a),
                  chatPrompt: a.chatPrompt as string | undefined,
                }),
              ),
            );
          }
          // Merge linked JIRA issues into resolution insights
          if (
            Array.isArray(enriched.linkedJiraIssues) &&
            enriched.linkedJiraIssues.length > 0
          ) {
            const existing = store.resolutionInsights;
            const jiraIssues = enriched.linkedJiraIssues as Array<
              Record<string, unknown>
            >;
            const newIssues = jiraIssues.map((j) => ({
              id: String(j.key ?? ""),
              title: String(j.summary ?? j.key ?? ""),
              status: String(j.status ?? "Open"),
              url: j.url ? String(j.url) : undefined,
            }));
            // Deduplicate by ID
            const seen = new Set(
              existing?.relatedEngineeringIssues?.map((e) => e.id) ?? [],
            );
            const uniqueNew = newIssues.filter((i) => !seen.has(i.id));
            store.setResolutionInsights({
              similarCasesCount: existing?.similarCasesCount ?? 0,
              commonResolutions: existing?.commonResolutions ?? [],
              relatedEngineeringIssues: [
                ...(existing?.relatedEngineeringIssues ?? []),
                ...uniqueNew,
              ],
              confidence: existing?.confidence ?? 0,
              evidenceSources: [
                ...(existing?.evidenceSources ?? []),
                ...uniqueNew.map((j) => ({
                  type: "jira" as const,
                  title: j.title,
                  id: j.id,
                  url: j.url,
                })),
              ],
            });
          }
        }
      })
      .catch(() => {
        // Keep initial data on failure
      });
  }

  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-surface-raised p-4 transition-colors hover:border-nexus-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Priority badge + status badge + ticket # + subject */}
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}
            >
              {priorityStyle.label}
            </span>
            {statusStyle && (
              <span
                className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>
            )}
            <span className="shrink-0 font-mono text-xs text-nexus-text-dim">
              #{ticket.id}
            </span>
            <h3 className="truncate text-sm font-medium text-nexus-text">
              {ticket.subject}
            </h3>
          </div>

          {/* Requester + org + awaiting reply + sentiment + time + SLA + tier */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-nexus-text-muted">
            <span>{ticket.requester.name}</span>
            {ticket.organization && (
              <>
                <span className="text-nexus-text-dim">&#183;</span>
                <span className="text-nexus-text-dim">
                  {ticket.organization}
                </span>
              </>
            )}
            {ticket.lastCommentIsCustomer && (
              <>
                <span className="text-nexus-text-dim">&#183;</span>
                <span className="inline-flex items-center gap-1 text-nexus-warning">
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="4" cy="4" r="4" />
                  </svg>
                  Awaiting reply
                </span>
              </>
            )}
            {ticket.sentiment &&
              ticket.sentiment !== "neutral" &&
              SENTIMENT_STYLES[ticket.sentiment] && (
                <>
                  <span className="text-nexus-text-dim">&#183;</span>
                  <span
                    className={`inline-flex items-center gap-0.5 ${SENTIMENT_STYLES[ticket.sentiment].text}`}
                  >
                    {SENTIMENT_STYLES[ticket.sentiment].icon}{" "}
                    {SENTIMENT_STYLES[ticket.sentiment].label}
                  </span>
                </>
              )}
            <span className="text-nexus-text-dim">&#183;</span>
            <span className="text-nexus-text-dim">
              {formatTimeAgo(ticket.createdAt)}
            </span>
            <SLATimerBadge ticketId={ticket.id} compact />
            {ticket.slaBreachIn && (
              <>
                <span className="text-nexus-text-dim">&#183;</span>
                <span className="text-nexus-error">
                  SLA in {ticket.slaBreachIn}
                </span>
              </>
            )}
            {ticket.customerTier && (
              <span className="rounded bg-nexus-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-nexus-accent">
                {ticket.customerTier}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onSnooze}
            className="rounded px-3 py-1.5 text-xs text-nexus-text-muted transition-colors hover:bg-nexus-surface hover:text-nexus-text"
          >
            Snooze
          </button>
          <button
            onClick={handleDiveIn}
            className="rounded bg-nexus-accent px-3 py-1.5 text-xs font-medium text-nexus-base transition-opacity hover:opacity-90"
          >
            Dive In
          </button>
        </div>
      </div>
    </div>
  );
}
