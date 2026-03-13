"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/stores/canvas-store";
import { useSessionStore } from "@/stores/session-store";
import { TicketQueue } from "./TicketQueue";
import { BriefActions } from "./BriefActions";
import { ViewSelector } from "./ViewSelector";
import { ViewEditor } from "./ViewEditor";
import type { TicketIntelligence } from "@/types/canvas";
import type { TriageTicket } from "./TriageCard";

function formatCurrentDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function MorningBriefOverlay() {
  const showMorningBrief = useSessionStore((s) => s.showMorningBrief);
  const setShowMorningBrief = useSessionStore((s) => s.setShowMorningBrief);
  const loadTicket = useCanvasStore((s) => s.loadTicket);
  const setTicketIntelligence = useCanvasStore((s) => s.setTicketIntelligence);

  // Track the top-priority ticket from the queue
  const [topTicket, setTopTicket] = useState<TriageTicket | null>(null);
  const topTicketRef = useRef<TriageTicket | null>(null);

  // View editor state
  const [editingView, setEditingView] = useState(false);

  const handleTicketsLoaded = useCallback((tickets: TriageTicket[]) => {
    if (tickets.length > 0) {
      topTicketRef.current = tickets[0];
      setTopTicket(tickets[0]);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShowMorningBrief(false);
  }, [setShowMorningBrief]);

  // Escape key dismisses the overlay
  useEffect(() => {
    if (!showMorningBrief) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showMorningBrief, dismiss]);

  const handleStartTopPriority = useCallback(() => {
    const ticket = topTicketRef.current;
    if (!ticket) return;

    loadTicket(ticket.id);
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
    dismiss();
  }, [loadTicket, setTicketIntelligence, dismiss]);

  return (
    <AnimatePresence>
      {showMorningBrief && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Morning Brief"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={dismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Content card */}
          <motion.div
            className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-nexus-border bg-nexus-surface shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-nexus-border px-6 py-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-nexus-text">
                    Morning Brief
                  </h2>
                  <ViewSelector onCreateNew={() => setEditingView(true)} />
                </div>
                <p className="mt-0.5 text-xs text-nexus-text-muted">
                  {formatCurrentDate()}
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Close morning brief"
                className="flex h-8 w-8 items-center justify-center rounded-md text-nexus-text-muted transition-colors hover:bg-nexus-surface-raised hover:text-nexus-text"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence>
                {editingView && (
                  <ViewEditor
                    onSave={() => setEditingView(false)}
                    onCancel={() => setEditingView(false)}
                  />
                )}
              </AnimatePresence>
              <TicketQueue
                onDiveIn={dismiss}
                onTicketsLoaded={handleTicketsLoaded}
              />
            </div>

            {/* Footer */}
            <div className="border-t border-nexus-border px-6 py-4">
              <BriefActions
                onStartTopPriority={handleStartTopPriority}
                onSkip={dismiss}
                hasTopPriority={!!topTicket}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
