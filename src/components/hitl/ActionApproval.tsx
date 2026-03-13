"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PendingAction } from "@/stores/hitl-store";
import { useHitlApproval } from "@/hooks/useHitlApproval";

const HOLD_DURATION_MS = 2000;

function RiskBadge({ risk }: { risk: PendingAction["risk"] }) {
  const colorMap: Record<PendingAction["risk"], string> = {
    low: "bg-nexus-success/20 text-nexus-success",
    medium: "bg-nexus-warning/20 text-nexus-warning",
    high: "bg-nexus-error/20 text-nexus-error",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${colorMap[risk]}`}
    >
      {risk}
    </span>
  );
}

interface ActionApprovalProps {
  action: PendingAction;
}

export function ActionApproval({ action }: ActionApprovalProps) {
  const { approve: approveAction, reject: rejectAction } = useHitlApproval();

  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement>(null);

  const isHighRisk = action.risk === "high";

  useEffect(() => {
    approveButtonRef.current?.focus();
  }, []);

  const handleApprove = useCallback(() => {
    if (!isHighRisk) {
      approveAction(action.id);
    }
  }, [isHighRisk, approveAction, action.id]);

  const handleHoldStart = useCallback(() => {
    if (!isHighRisk) return;
    holdStartRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      if (holdStartRef.current === null) return;
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        holdStartRef.current = null;
        approveAction(action.id);
      }
    }, 16);
  }, [isHighRisk, approveAction, action.id]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartRef.current = null;
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const handleReject = useCallback(() => {
    rejectAction(action.id);
  }, [rejectAction, action.id]);

  return (
    <motion.div
      className="rounded-lg border border-nexus-border bg-nexus-surface-raised p-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-nexus-text">
            {action.description}
          </p>
          <p className="mt-1 text-xs text-nexus-text-muted">
            Tool:{" "}
            <code className="rounded bg-nexus-base px-1 font-mono text-nexus-accent">
              {action.tool}
            </code>
          </p>
        </div>
        <RiskBadge risk={action.risk} />
      </div>

      <div className="flex items-center gap-2">
        <button
          ref={approveButtonRef}
          onClick={handleApprove}
          onMouseDown={isHighRisk ? handleHoldStart : undefined}
          onMouseUp={isHighRisk ? handleHoldEnd : undefined}
          onMouseLeave={isHighRisk ? handleHoldEnd : undefined}
          onTouchStart={isHighRisk ? handleHoldStart : undefined}
          onTouchEnd={isHighRisk ? handleHoldEnd : undefined}
          className="relative overflow-hidden rounded bg-nexus-success px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-success focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface-raised"
          aria-label={
            isHighRisk
              ? `Approve action: hold for 2 seconds to confirm`
              : `Approve action: ${action.description}`
          }
        >
          {isHighRisk && holdProgress > 0 && (
            <span
              className="absolute inset-0 bg-white/30"
              style={{ width: `${holdProgress * 100}%` }}
            />
          )}
          <span className="relative">
            {isHighRisk ? "Hold to Approve" : "Approve"}
          </span>
        </button>

        <button
          onClick={handleReject}
          className="rounded bg-nexus-error px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-error focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface-raised"
          aria-label={`Reject action: ${action.description}`}
        >
          Reject
        </button>
      </div>
    </motion.div>
  );
}
