"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHitlStore } from "@/stores/hitl-store";

export function HitlToggle() {
  const mode = useHitlStore((s) => s.mode);
  const setMode = useHitlStore((s) => s.setMode);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = useCallback(() => {
    if (mode === "supervised") {
      setShowConfirm(true);
    } else {
      setMode("supervised");
    }
  }, [mode, setMode]);

  const confirmAutonomous = useCallback(() => {
    setMode("autonomous");
    setShowConfirm(false);
  }, [setMode]);

  const cancelAutonomous = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const isAutonomous = mode === "autonomous";

  return (
    <div className="relative flex items-center gap-2">
      <span
        className={`text-xs font-medium transition-colors ${
          !isAutonomous ? "text-nexus-accent" : "text-nexus-text-dim"
        }`}
      >
        Supervised
      </span>

      <button
        role="switch"
        aria-checked={isAutonomous}
        aria-label={`Agent mode: ${mode}. Press to switch to ${isAutonomous ? "supervised" : "autonomous"} mode`}
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-base ${
          isAutonomous ? "bg-nexus-warning" : "bg-nexus-accent"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            isAutonomous ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>

      <span
        className={`text-xs font-medium transition-colors ${
          isAutonomous ? "text-nexus-warning" : "text-nexus-text-dim"
        }`}
      >
        Auto
      </span>

      <span className="ml-1 text-nexus-text-dim">
        <kbd className="rounded bg-nexus-surface-raised px-1 font-mono text-[10px]">
          ⌘⇧A
        </kbd>
      </span>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md border border-nexus-border bg-nexus-surface-raised p-3 shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <p className="mb-2 whitespace-nowrap text-xs text-nexus-text">
              Enable autonomous mode?
            </p>
            <p className="mb-3 whitespace-nowrap text-[10px] text-nexus-text-muted">
              Agent will act without approval.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={cancelAutonomous}
                className="rounded px-2 py-1 text-xs text-nexus-text-muted transition-colors hover:bg-nexus-surface hover:text-nexus-text"
              >
                Cancel
              </button>
              <button
                onClick={confirmAutonomous}
                className="rounded bg-nexus-warning px-2 py-1 text-xs font-medium text-black transition-opacity hover:opacity-90"
              >
                Enable
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
