"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { triggerChatAction } from "@/lib/chat/trigger";

export function CommunicationDock() {
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);
  const expanded = useCanvasStore((s) => s.communicationDockExpanded);
  const activeTab = useCanvasStore((s) => s.communicationDockTab);
  const suggestedDraft = useCanvasStore((s) => s.suggestedDraft);
  const setSuggestedDraft = useCanvasStore((s) => s.setSuggestedDraft);
  const setExpanded = useCanvasStore((s) => s.setCommunicationDockExpanded);
  const setTab = useCanvasStore((s) => s.setCommunicationDockTab);

  const [isInternal, setIsInternal] = useState(true);

  // Single compose buffer — the user always types here directly.
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hold-to-clear state
  const [clearProgress, setClearProgress] = useState(0); // 0–100
  const clearRafRef = useRef<number | null>(null);
  const clearStartRef = useRef<number | null>(null);
  const CLEAR_HOLD_MS = 2000;

  // Track the last draft string we've already applied so we never re-apply it.
  const lastAppliedDraft = useRef<string | null>(null);

  // Keep store tab in sync with checkbox
  useEffect(() => {
    if (activeTab !== "escalation") {
      setTab(isInternal ? "internal_note" : "reply");
    }
  }, [isInternal, activeTab, setTab]);

  // When AI generates a draft: fill the textarea and expand the dock.
  // We use a ref to deduplicate so we never apply the same string twice,
  // and we do NOT clear the store value here — clearing happens in
  // handleSend / executeClear so the store stays in sync with the textarea.
  useEffect(() => {
    if (!suggestedDraft) return;
    if (suggestedDraft === lastAppliedDraft.current) return;
    lastAppliedDraft.current = suggestedDraft;
    setMessage(suggestedDraft);
    setExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedDraft]);

  if (!activeTicketId) return null;

  const isEscalation = activeTab === "escalation";
  const hasMessage = message.trim().length > 0;

  // ── Actions ────────────────────────────────────────────────────

  function handleSend() {
    if (!hasMessage) return;
    const body = message.trim();
    const instruction = isEscalation
      ? `Send the following as an escalation message on ticket #${activeTicketId}, then create a linked JIRA ticket to track this escalation (use ticket subject as JIRA summary, priority high):\n\n${body}`
      : isInternal
        ? `Send the following as an internal note on ticket #${activeTicketId}:\n\n${body}`
        : `Send the following as a public customer reply on ticket #${activeTicketId}:\n\n${body}`;
    triggerChatAction(instruction);
    setMessage("");
    setSuggestedDraft(null);
    // Do NOT reset lastAppliedDraft.current — the LLM confirmation response
    // echoes the sent content under a "### Draft ..." heading; keeping the ref
    // means the dedup check prevents it from re-populating the dock.
  }

  function handleCopy() {
    if (!hasMessage) return;
    navigator.clipboard.writeText(message.trim()).catch(() => {});
  }

  function handleAIDraft() {
    const typeLabel = isEscalation
      ? "escalation message with full context"
      : isInternal
        ? "internal note with technical details"
        : "empathetic customer reply";
    triggerChatAction(`Draft a ${typeLabel} for ticket #${activeTicketId}.`);
  }

  function executeClear() {
    setMessage("");
    setSuggestedDraft(null);
    lastAppliedDraft.current = null;
    setClearProgress(0);
    clearStartRef.current = null;
  }

  // ── Hold-to-clear ────────────────────────────────────────────

  const startClearHold = useCallback(() => {
    if (!hasMessage) return;
    clearStartRef.current = performance.now();

    function tick() {
      if (clearStartRef.current === null) return;
      const elapsed = performance.now() - clearStartRef.current;
      const pct = Math.min((elapsed / CLEAR_HOLD_MS) * 100, 100);
      setClearProgress(pct);
      if (pct < 100) {
        clearRafRef.current = requestAnimationFrame(tick);
      } else {
        executeClear();
      }
    }

    clearRafRef.current = requestAnimationFrame(tick);
  }, [hasMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelClearHold = useCallback(() => {
    if (clearRafRef.current !== null) {
      cancelAnimationFrame(clearRafRef.current);
      clearRafRef.current = null;
    }
    clearStartRef.current = null;
    setClearProgress(0);
  }, []);

  // Cancel hold if pointer leaves
  useEffect(() => {
    return () => {
      if (clearRafRef.current !== null) {
        cancelAnimationFrame(clearRafRef.current);
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────

  const typeLabel = isEscalation ? "Escalation" : isInternal ? "Internal Note" : "Public Reply";
  const typeLabelColor = isEscalation
    ? "text-nexus-warning"
    : isInternal
      ? "text-nexus-accent"
      : "text-nexus-success";

  return (
    <div className="border-t border-nexus-border bg-nexus-surface">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-nexus-surface-raised"
      >
        <span className="text-sm">{"\u{1F4AC}"}</span>
        <span className="flex-1 text-xs font-semibold text-nexus-text-muted">
          Communication
        </span>
        {hasMessage && !expanded && (
          <span className="rounded-full bg-nexus-accent/20 px-2 py-0.5 text-[10px] font-medium text-nexus-accent">
            Draft ready
          </span>
        )}
        <svg
          className={`h-4 w-4 shrink-0 text-nexus-text-dim transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-nexus-border px-4 pb-3 pt-2 space-y-2">
          {/* Controls row */}
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={isInternal && !isEscalation}
                disabled={isEscalation}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-nexus-accent disabled:cursor-not-allowed disabled:opacity-40"
              />
              <span
                className={`text-[10px] font-medium ${
                  isEscalation
                    ? "text-nexus-text-dim opacity-40"
                    : isInternal
                      ? "text-nexus-accent"
                      : "text-nexus-text-muted"
                }`}
              >
                Internal note
              </span>
            </label>

            <button
              onClick={() =>
                setTab(
                  isEscalation
                    ? isInternal
                      ? "internal_note"
                      : "reply"
                    : "escalation",
                )
              }
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                isEscalation
                  ? "bg-nexus-warning/20 text-nexus-warning"
                  : "text-nexus-text-dim hover:bg-nexus-surface-raised hover:text-nexus-text"
              }`}
            >
              Escalation
            </button>

            {/* Type indicator */}
            <span className={`ml-auto text-[10px] font-semibold ${typeLabelColor}`}>
              {typeLabel}
            </span>
          </div>

          {/* Compose textarea — always visible */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message or ask AI to draft one…"
            rows={5}
            className="w-full resize-y rounded-md border border-nexus-border bg-nexus-surface-raised px-3 py-2 text-xs leading-relaxed text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent-dim focus:outline-none focus:ring-1 focus:ring-nexus-accent-dim"
          />

          {/* Action row */}
          <div className="flex items-center gap-2">
            {/* AI Draft button */}
            <button
              onClick={handleAIDraft}
              title="Ask AI to draft a message"
              className="flex items-center gap-1.5 rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1.5 text-[10px] font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent/50 hover:text-nexus-accent"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Draft
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              disabled={!hasMessage}
              className="rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1.5 text-[10px] font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent/50 hover:text-nexus-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy
            </button>

            {/* Hold-to-Clear */}
            <div className="relative">
              <button
                disabled={!hasMessage}
                onMouseDown={startClearHold}
                onMouseUp={cancelClearHold}
                onMouseLeave={cancelClearHold}
                onTouchStart={startClearHold}
                onTouchEnd={cancelClearHold}
                className="relative overflow-hidden rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1.5 text-[10px] font-medium text-nexus-text-muted transition-colors hover:border-red-400/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 select-none"
              >
                {/* Fill progress overlay */}
                {clearProgress > 0 && (
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-red-400/20 transition-none"
                    style={{ width: `${clearProgress}%` }}
                  />
                )}
                <span className="relative">
                  {clearProgress > 0 ? "Hold…" : "Clear"}
                </span>
              </button>
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!hasMessage}
              className="ml-auto rounded-md bg-nexus-accent px-4 py-1.5 text-xs font-medium text-nexus-base transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
