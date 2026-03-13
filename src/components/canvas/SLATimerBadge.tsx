"use client";

import { useEffect } from "react";
import { useSLAStore } from "@/stores/sla-store";
import { formatRemaining } from "@/lib/sla/engine";
import type { SLABreachLevel } from "@/lib/sla/types";

const BREACH_STYLES: Record<SLABreachLevel, { bg: string; text: string; dot: string }> = {
  safe: {
    bg: "bg-nexus-success/10",
    text: "text-nexus-success",
    dot: "bg-nexus-success",
  },
  warning: {
    bg: "bg-nexus-warning/10",
    text: "text-nexus-warning",
    dot: "bg-nexus-warning animate-pulse",
  },
  critical: {
    bg: "bg-nexus-error/10",
    text: "text-nexus-error",
    dot: "bg-nexus-error animate-pulse",
  },
  breached: {
    bg: "bg-nexus-error/20",
    text: "text-nexus-error",
    dot: "bg-nexus-error shadow-[0_0_6px_rgba(255,77,106,0.6)]",
  },
};

interface SLATimerBadgeProps {
  ticketId: string;
  /** Compact mode shows only the most urgent timer. */
  compact?: boolean;
}

/**
 * Displays SLA countdown badge(s) for a ticket.
 * Automatically refreshes every minute via the SLA store tick.
 */
export function SLATimerBadge({ ticketId, compact = true }: SLATimerBadgeProps) {
  const timers = useSLAStore((s) => s.timersByTicket[ticketId]);
  const tick = useSLAStore((s) => s.tick);

  // Tick every 60 seconds to refresh countdowns
  useEffect(() => {
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [tick]);

  if (!timers || timers.length === 0) return null;

  // In compact mode, show only the most urgent
  const displayed = compact
    ? [timers.reduce((a, b) => (a.remainingMinutes < b.remainingMinutes ? a : b))]
    : timers;

  return (
    <div className="flex items-center gap-1.5">
      {displayed.map((timer) => {
        const style = BREACH_STYLES[timer.breachLevel];
        const label = compact
          ? formatRemaining(timer.remainingMinutes)
          : `${timer.policyName}: ${formatRemaining(timer.remainingMinutes)}`;

        return (
          <span
            key={timer.policyId}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
            title={`${timer.policyName} — ${timer.breachLevel === "breached" ? "BREACHED" : `${formatRemaining(timer.remainingMinutes)} remaining`}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {timer.breachLevel === "breached" ? "SLA " : ""}
            {label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Small inline SLA indicator for the status bar.
 * Shows count of breached/critical SLA timers.
 */
export function SLAStatusIndicator() {
  const summary = useSLAStore((s) => s.summary);
  const tick = useSLAStore((s) => s.tick);

  useEffect(() => {
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [tick]);

  const atRisk = summary.breached + summary.critical;
  if (atRisk === 0 && summary.warning === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {atRisk > 0 && (
        <span className="inline-flex items-center gap-1 rounded bg-nexus-error/15 px-1.5 py-0.5 text-[10px] font-medium text-nexus-error">
          <span className="h-1.5 w-1.5 rounded-full bg-nexus-error animate-pulse" />
          {atRisk} SLA{atRisk > 1 ? "s" : ""} at risk
        </span>
      )}
      {summary.warning > 0 && atRisk === 0 && (
        <span className="inline-flex items-center gap-1 rounded bg-nexus-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-nexus-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-nexus-warning" />
          {summary.warning} SLA warning{summary.warning > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
