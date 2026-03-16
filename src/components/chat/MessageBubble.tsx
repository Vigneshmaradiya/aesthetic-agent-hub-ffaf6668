"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/types/chat";
import { ThoughtTrace } from "./ThoughtTrace";
import { ToolCallTrace } from "./ToolCallTrace";
import { MarkdownContent } from "./MarkdownContent";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  if (message.role === "system") {
    return (
      <motion.div
        className="flex justify-center px-8 py-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-center text-xs text-nexus-text-dim">
          {message.content}
        </p>
      </motion.div>
    );
  }

  const isUser = message.role === "user";

  return (
    <motion.div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      initial={isStreaming ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
          isUser
            ? "bg-gradient-to-br from-nexus-accent-dim to-nexus-accent-muted text-white"
            : "border border-nexus-border bg-nexus-surface-raised text-nexus-accent"
        }`}
      >
        {isUser ? "👤" : "🤖"}
      </div>

      {/* Content */}
      <div
        className={`max-w-[80%] rounded-xl border px-4 py-3 transition-all ${
          isUser
            ? "border-nexus-accent/20 bg-nexus-accent/10 text-nexus-text"
            : "glow-border border-nexus-border bg-nexus-surface text-nexus-text"
        }`}
      >
        {/* Thought trace for assistant messages */}
        {!isUser && message.thoughts && message.thoughts.length > 0 && (
          <ThoughtTrace steps={message.thoughts} />
        )}

        {/* Tool call trace */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallTrace toolCalls={message.toolCalls} />
        )}

        {/* Message content */}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        ) : message.content ? (
          <MarkdownContent content={message.content} />
        ) : null}

        {/* Timestamp */}
        <p
          className={`mt-2 text-[10px] ${
            isUser ? "text-nexus-accent-dim" : "text-nexus-text-dim"
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
