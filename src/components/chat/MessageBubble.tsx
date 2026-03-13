"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/types/chat";
import { ThoughtTrace } from "./ThoughtTrace";
import { ToolCallTrace } from "./ToolCallTrace";
import { MarkdownContent } from "./MarkdownContent";

interface MessageBubbleProps {
  message: ChatMessage;
  /** Skip entrance animation and use plain text (used for the live streaming bubble). */
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
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={isStreaming ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className={`max-w-[80%] rounded-xl border px-4 py-3 ${
          isUser
            ? "bg-nexus-accent/15 border-nexus-accent/30 text-nexus-text"
            : "bg-nexus-surface border-nexus-border text-nexus-text"
        }`}
      >
        {/* Thought trace for assistant messages */}
        {!isUser && message.thoughts && message.thoughts.length > 0 && (
          <ThoughtTrace steps={message.thoughts} />
        )}

        {/* Tool call trace — collapsible section above message content */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallTrace toolCalls={message.toolCalls} />
        )}

        {/* Message content — always rendered as markdown for assistant messages.
            User messages stay as plain text to preserve exact input. */}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        ) : message.content ? (
          <MarkdownContent content={message.content} />
        ) : null}

        {/* Timestamp */}
        <p
          className={`mt-1 text-[10px] ${
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
