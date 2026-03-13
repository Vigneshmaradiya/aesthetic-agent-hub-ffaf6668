"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ThoughtStep } from "@/types/chat";

interface ThoughtTraceProps {
  steps: ThoughtStep[];
}

export function ThoughtTrace({ steps }: ThoughtTraceProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0) return null;

  // Build compact summary: "Analyzed with 3 tools" or last step content truncated
  const lastStep = steps[steps.length - 1];
  const summary = lastStep
    ? `${steps.length} step${steps.length !== 1 ? "s" : ""} — ${lastStep.content.slice(0, 60)}${lastStep.content.length > 60 ? "…" : ""}`
    : `${steps.length} reasoning step${steps.length !== 1 ? "s" : ""}`;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer select-none items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] text-nexus-text-dim transition-colors hover:bg-nexus-surface-raised hover:text-nexus-text-muted"
        aria-expanded={isOpen}
      >
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="inline-block"
        >
          &#9654;
        </motion.span>
        <span className="truncate">{summary}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="mt-1.5 space-y-1 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {steps.map((step, idx) => (
              <div
                key={`${step.step}-${idx}`}
                className="border-l-2 border-nexus-border-subtle pl-2"
              >
                <p className="font-mono text-[10px] font-semibold text-nexus-accent-dim">
                  {step.step}
                </p>
                <p className="font-mono text-[10px] text-nexus-text-dim">
                  {step.content}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
