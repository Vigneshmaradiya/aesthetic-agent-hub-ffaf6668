"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { KBSuggestion } from "@/hooks/useProactiveSearch";
import { useChatStore } from "@/stores/chat-store";

interface KBSuggestionPillsProps {
  suggestions: KBSuggestion[];
}

export function KBSuggestionPills({ suggestions }: KBSuggestionPillsProps) {
  const addMessage = useChatStore((s) => s.addMessage);

  const handleClick = useCallback(
    (suggestion: KBSuggestion) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: `[KB: ${suggestion.title}]`,
        timestamp: new Date(),
      });
    },
    [addMessage],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] text-nexus-text-dim">KB:</span>
      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion, idx) => (
          <motion.button
            key={suggestion.sourceId}
            onClick={() => handleClick(suggestion)}
            title={suggestion.title}
            className="max-w-[200px] truncate rounded-full border border-nexus-border bg-nexus-surface-raised px-2.5 py-1 text-xs text-nexus-text transition-colors hover:border-nexus-accent hover:text-nexus-accent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, delay: idx * 0.05 }}
            layout
          >
            {suggestion.title}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
