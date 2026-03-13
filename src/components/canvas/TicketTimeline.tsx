"use client";

import { useEffect, useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";

type TimelineEventType =
  | "customer_reply"
  | "agent_reply"
  | "status_change"
  | "internal_note";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  author: string;
  timestamp: string;
  text: string;
}

const eventConfig: Record<
  TimelineEventType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  customer_reply: {
    icon: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    color: "text-nexus-info",
    bgColor: "bg-nexus-info/20",
  },
  agent_reply: {
    icon: (
      <svg
        className="h-3 w-3"
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
    color: "text-nexus-accent",
    bgColor: "bg-nexus-accent/20",
  },
  status_change: {
    icon: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
    color: "text-nexus-warning",
    bgColor: "bg-nexus-warning/20",
  },
  internal_note: {
    icon: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
    color: "text-nexus-text-muted",
    bgColor: "bg-nexus-text-dim/20",
  },
};

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const config = eventConfig[event.type];

  return (
    <div className="flex gap-3">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.bgColor} ${config.color}`}
      >
        {config.icon}
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-xs font-medium ${config.color}`}>
            {event.author}
          </span>
          <span className="text-[10px] text-nexus-text-dim">
            {event.timestamp}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-nexus-text-muted">
          {event.text}
        </p>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex animate-pulse gap-3">
          <div className="h-6 w-6 shrink-0 rounded-full bg-nexus-border" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-nexus-border" />
            <div className="h-3 w-full rounded bg-nexus-border" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TicketTimeline() {
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTicketId) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/tickets/${activeTicketId}/timeline`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setEvents([]);
        } else {
          setEvents(data.events ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to fetch timeline");
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTicketId]);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-nexus-text-muted">
        Ticket Timeline
      </h3>
      <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/30 p-3">
        {loading && <TimelineSkeleton />}

        {!loading && !activeTicketId && (
          <p className="py-2 text-center text-xs text-nexus-text-dim">
            Select a ticket to view its timeline
          </p>
        )}

        {!loading && error && (
          <p className="py-2 text-center text-xs text-nexus-error">
            Could not load timeline
          </p>
        )}

        {!loading && !error && activeTicketId && events.length === 0 && (
          <p className="py-2 text-center text-xs text-nexus-text-dim">
            No events yet
          </p>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="relative">
            <div className="absolute bottom-0 left-3 top-6 w-px bg-nexus-border" />
            <div className="relative space-y-0">
              {events.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
