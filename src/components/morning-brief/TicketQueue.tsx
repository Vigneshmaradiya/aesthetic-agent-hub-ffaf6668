"use client";

import { useCallback, useEffect, useState } from "react";
import { TriageCard } from "./TriageCard";
import type { TriageTicket } from "./TriageCard";
import { useAgentViews } from "@/hooks/useAgentViews";
import { useSLAStore } from "@/stores/sla-store";
import type { SLABreachLevel } from "@/lib/sla/types";

const PRIORITY_ORDER: Record<TriageTicket["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const SENTIMENT_ORDER: Record<string, number> = {
  angry: 0,
  negative: 1,
  neutral: 2,
  positive: 3,
};

const BREACH_ORDER: Record<SLABreachLevel, number> = {
  breached: 0,
  critical: 1,
  warning: 2,
  safe: 3,
};

export type SortMode = "default" | "sla";

/**
 * Sort tickets by: priority (high first) → awaiting reply first →
 * sentiment (angry/negative first) → date (older first).
 */
function sortTickets(
  tickets: TriageTicket[],
  mode: SortMode = "default",
  slaStore?: typeof useSLAStore,
): TriageTicket[] {
  return [...tickets].sort((a, b) => {
    // SLA-breach-first sorting: most urgent SLA first
    if (mode === "sla" && slaStore) {
      const aTimer = slaStore.getState().getMostUrgent(a.id);
      const bTimer = slaStore.getState().getMostUrgent(b.id);
      const aBreachOrder = aTimer ? BREACH_ORDER[aTimer.breachLevel] : 99;
      const bBreachOrder = bTimer ? BREACH_ORDER[bTimer.breachLevel] : 99;
      if (aBreachOrder !== bBreachOrder) return aBreachOrder - bBreachOrder;
      // Within same breach level, sort by remaining time (ascending)
      const aRemaining = aTimer?.remainingMinutes ?? Infinity;
      const bRemaining = bTimer?.remainingMinutes ?? Infinity;
      if (aRemaining !== bRemaining) return aRemaining - bRemaining;
    }

    // 1. Priority: high → medium → low
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;

    // 2. Awaiting reply: customer-last tickets surface higher
    const aAwait = a.lastCommentIsCustomer ? 0 : 1;
    const bAwait = b.lastCommentIsCustomer ? 0 : 1;
    if (aAwait !== bAwait) return aAwait - bAwait;

    // 3. Sentiment: angry → negative → neutral → positive (missing = last)
    const sA = a.sentiment ? (SENTIMENT_ORDER[a.sentiment] ?? 99) : 99;
    const sB = b.sentiment ? (SENTIMENT_ORDER[b.sentiment] ?? 99) : 99;
    if (sA !== sB) return sA - sB;

    // 4. Date: older first (ascending createdAt)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Compute SLA timers for all tickets in the queue.
 */
function computeSLAForQueue(tickets: TriageTicket[]): void {
  const slaStore = useSLAStore.getState();
  for (const ticket of tickets) {
    const resolvedStatuses = ["solved", "closed", "resolved"];
    const isResolved = resolvedStatuses.includes(
      (ticket.status ?? "open").toLowerCase(),
    );
    slaStore.computeForTicket({
      ticketId: ticket.id,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      isResolved,
    });
  }
}

/** Skeleton placeholder shown while the queue loads. */
function TicketSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-nexus-border bg-nexus-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 rounded bg-nexus-border" />
            <div className="h-4 w-48 rounded bg-nexus-border" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-24 rounded bg-nexus-border" />
            <div className="h-3 w-12 rounded bg-nexus-border" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-16 rounded bg-nexus-border" />
          <div className="h-7 w-16 rounded bg-nexus-border" />
        </div>
      </div>
    </div>
  );
}

interface TicketQueueProps {
  onDiveIn: () => void;
  onTicketsLoaded?: (tickets: TriageTicket[]) => void;
}

export function TicketQueue({ onDiveIn, onTicketsLoaded }: TicketQueueProps) {
  const { activeQuery } = useAgentViews();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [tickets, setTickets] = useState<TriageTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const slaSummary = useSLAStore((s) => s.summary);

  useEffect(() => {
    let cancelled = false;

    // Reset state when the active view or scope changes so the skeleton shows
    setLoading(true);
    setError(null);

    async function fetchQueue() {
      try {
        const params = new URLSearchParams();
        if (activeQuery) params.set("query", activeQuery);
        if (scope === "all") params.set("scope", "all");
        const qs = params.toString();
        const url = `/api/tickets/queue${qs ? `?${qs}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (cancelled) return;

        if (data.error === "zendesk_not_configured") {
          setError("not_configured");
          setTickets([]);
        } else if (data.error === "zendesk_unreachable") {
          setError("unreachable");
          setTickets([]);
        } else {
          const raw = data.tickets ?? [];
          computeSLAForQueue(raw);
          const sorted = sortTickets(raw, sortMode, useSLAStore);
          setTickets(sorted);
          setError(null);
          onTicketsLoaded?.(sorted);
        }
      } catch {
        if (!cancelled) {
          setError("unreachable");
          setTickets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchQueue();
    return () => {
      cancelled = true;
    };
  }, [activeQuery, scope, onTicketsLoaded]);

  const handleSnooze = useCallback((ticketId: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      next.add(ticketId);
      return next;
    });
  }, []);

  // Re-sort when sortMode changes
  const sortedTickets = sortTickets(tickets, sortMode, useSLAStore);
  const visibleTickets = sortedTickets.filter((t) => !snoozedIds.has(t.id));

  return (
    <div className="flex flex-col gap-3">
      {/* Count badge + SLA summary + scope toggle + sort toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-nexus-text">Queue</span>
          {!loading && !error && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-nexus-accent/15 px-1.5 text-xs font-medium text-nexus-accent">
              {visibleTickets.length}
            </span>
          )}
          {!loading && !error && (slaSummary.breached > 0 || slaSummary.critical > 0) && (
            <span className="inline-flex items-center gap-1 rounded bg-nexus-error/15 px-1.5 py-0.5 text-[10px] font-medium text-nexus-error">
              <span className="h-1.5 w-1.5 rounded-full bg-nexus-error animate-pulse" />
              {slaSummary.breached + slaSummary.critical} SLA at risk
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort mode toggle */}
          <div className="flex items-center rounded-md border border-nexus-border bg-nexus-surface p-0.5">
            <button
              onClick={() => setSortMode("default")}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                sortMode === "default"
                  ? "bg-nexus-accent text-nexus-base"
                  : "text-nexus-text-muted hover:text-nexus-text"
              }`}
              title="Sort by priority"
            >
              Priority
            </button>
            <button
              onClick={() => setSortMode("sla")}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                sortMode === "sla"
                  ? "bg-nexus-accent text-nexus-base"
                  : "text-nexus-text-muted hover:text-nexus-text"
              }`}
              title="Sort by SLA urgency"
            >
              SLA
            </button>
          </div>
          {/* Scope toggle */}
          <div className="flex items-center rounded-md border border-nexus-border bg-nexus-surface p-0.5">
            <button
              onClick={() => setScope("mine")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                scope === "mine"
                  ? "bg-nexus-accent text-nexus-base"
                  : "text-nexus-text-muted hover:text-nexus-text"
              }`}
            >
              My Tickets
            </button>
            <button
              onClick={() => setScope("all")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                scope === "all"
                  ? "bg-nexus-accent text-nexus-base"
                  : "text-nexus-text-muted hover:text-nexus-text"
              }`}
            >
              All Tickets
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          <TicketSkeleton />
          <TicketSkeleton />
          <TicketSkeleton />
        </div>
      )}

      {/* Zendesk not configured */}
      {!loading && error === "not_configured" && (
        <div className="rounded-md border border-nexus-warning/30 bg-nexus-warning/5 p-4 text-center">
          <p className="text-sm text-nexus-warning">Zendesk not configured</p>
          <p className="mt-1 text-xs text-nexus-text-dim">
            Connect your Zendesk account to see your ticket queue.
          </p>
        </div>
      )}

      {/* Zendesk unreachable */}
      {!loading && error === "unreachable" && (
        <div className="rounded-md border border-nexus-error/30 bg-nexus-error/5 p-4 text-center">
          <p className="text-sm text-nexus-error">Could not reach Zendesk</p>
          <p className="mt-1 text-xs text-nexus-text-dim">
            Check your MCP server connection and try again.
          </p>
        </div>
      )}

      {/* Empty queue */}
      {!loading && !error && visibleTickets.length === 0 && (
        <div className="rounded-md border border-nexus-success/30 bg-nexus-success/5 p-4 text-center">
          <p className="text-sm text-nexus-success">No open tickets</p>
          <p className="mt-1 text-xs text-nexus-text-dim">
            You&apos;re all caught up! Enjoy your morning.
          </p>
        </div>
      )}

      {/* Ticket list */}
      {!loading && !error && visibleTickets.length > 0 && (
        <div className="flex flex-col gap-2">
          {visibleTickets.map((ticket) => (
            <TriageCard
              key={ticket.id}
              ticket={ticket}
              onDiveIn={onDiveIn}
              onSnooze={() => handleSnooze(ticket.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
