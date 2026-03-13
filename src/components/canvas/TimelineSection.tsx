"use client";

import { useEffect, useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import type { TimelineEventType, TimelineEvent } from "@/types/canvas";

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
  assignment_change: {
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
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    color: "text-nexus-info",
    bgColor: "bg-nexus-info/20",
  },
  priority_change: {
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
          d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
        />
      </svg>
    ),
    color: "text-nexus-warning",
    bgColor: "bg-nexus-warning/20",
  },
  escalation: {
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
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    color: "text-nexus-error",
    bgColor: "bg-nexus-error/20",
  },
};

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const config = eventConfig[event.type] ?? eventConfig.internal_note;

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
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(event.metadata).map(([key, val]) => (
              <span
                key={key}
                className="rounded bg-nexus-surface-raised px-1.5 py-0.5 text-[10px] text-nexus-text-dim"
              >
                {key}: {val}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TimelineSection() {
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);
  const storeEvents = useCanvasStore((s) => s.timelineEvents);
  const setTimelineEvents = useCanvasStore((s) => s.setTimelineEvents);
  const setSectionState = useCanvasStore((s) => s.setSectionState);

  const [fetchedForTicket, setFetchedForTicket] = useState<string | null>(null);

  // Fetch timeline if store has no events and we haven't fetched for this ticket yet
  useEffect(() => {
    if (!activeTicketId) return;
    if (storeEvents.length > 0 && fetchedForTicket === activeTicketId) return;
    if (fetchedForTicket === activeTicketId) return;

    setFetchedForTicket(activeTicketId);
    setSectionState("ticket-timeline", { loading: true, error: null });

    fetch(`/api/tickets/${activeTicketId}/timeline`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setSectionState("ticket-timeline", {
            loading: false,
            error: data.error,
          });
        } else {
          setTimelineEvents(data.events ?? []);
        }
      })
      .catch(() => {
        setSectionState("ticket-timeline", {
          loading: false,
          error: "Failed to fetch timeline",
        });
      });
  }, [
    activeTicketId,
    storeEvents.length,
    fetchedForTicket,
    setSectionState,
    setTimelineEvents,
  ]);

  if (storeEvents.length === 0 && !activeTicketId) return null;

  return (
    <CanvasSection sectionId="ticket-timeline" title="Ticket Timeline">
      <div className="px-4 pb-4">
        {storeEvents.length === 0 && (
          <p className="py-2 text-center text-xs text-nexus-text-dim">
            No events yet
          </p>
        )}
        {storeEvents.length > 0 && (
          <div className="relative">
            <div className="absolute bottom-0 left-3 top-6 w-px bg-nexus-border" />
            <div className="relative space-y-0">
              {storeEvents.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </CanvasSection>
  );
}
