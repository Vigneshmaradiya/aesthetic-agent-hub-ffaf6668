"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ToolCallEvent } from "@/types/chat";

interface ToolCallTraceProps {
  toolCalls: ToolCallEvent[];
}

export function ToolCallTrace({ toolCalls }: ToolCallTraceProps) {
  const [isOpen, setIsOpen] = useState(false);

  // UI-level dedup: if duplicate callIds exist, keep the resolved entry.
  const seen = new Set<string>();
  const unique = toolCalls.filter((tc) => {
    const key = tc.callId ?? `${tc.tool}::${JSON.stringify(tc.args)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) return null;

  const resolvedCount = unique.filter((tc) => tc.resolved).length;
  const totalCount = unique.length;
  const allResolved = resolvedCount === totalCount;

  const summary = allResolved
    ? `${totalCount} tool call${totalCount !== 1 ? "s" : ""} completed`
    : `${resolvedCount}/${totalCount} tool call${totalCount !== 1 ? "s" : ""} — running...`;

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
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
            allResolved ? "bg-nexus-success" : "bg-nexus-warning animate-pulse"
          }`}
        />
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
            {unique.map((tc, idx) => (
              <ToolCallEntry key={tc.callId ?? `${tc.tool}-${idx}`} toolCall={tc} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolCallEntry({ toolCall }: { toolCall: ToolCallEvent }) {
  const [showResult, setShowResult] = useState(false);
  const hasResult = toolCall.resolved && toolCall.result !== undefined;

  return (
    <div className="border-l-2 border-nexus-border-subtle pl-2">
      <button
        onClick={() => hasResult && setShowResult(!showResult)}
        className={`flex items-center gap-1.5 font-mono text-[10px] ${
          hasResult
            ? "cursor-pointer hover:text-nexus-text-muted"
            : "cursor-default"
        }`}
      >
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
            toolCall.resolved ? "bg-nexus-success" : "bg-nexus-warning animate-pulse"
          }`}
        />
        <span className="font-semibold text-nexus-accent-dim">
          {toolCall.tool}
        </span>
        <span className="text-nexus-text-dim">
          {toolCall.resolved ? "completed" : "running..."}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {showResult && hasResult && (
          <motion.pre
            className="mt-0.5 max-h-32 overflow-auto rounded bg-nexus-base px-2 py-1 font-mono text-[10px] text-nexus-text-dim"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            {typeof toolCall.result === "string"
              ? toolCall.result
              : JSON.stringify(toolCall.result, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}
