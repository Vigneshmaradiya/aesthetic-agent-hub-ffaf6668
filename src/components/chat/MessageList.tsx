"use client";

import type { ChatMessage, ToolCallEvent } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { ToolCallTrace } from "./ToolCallTrace";
import { StreamingIndicator } from "./StreamingIndicator";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamBuffer: string;
  pendingToolCalls: ToolCallEvent[];
}

export function MessageList({
  messages,
  isStreaming,
  currentStreamBuffer,
  pendingToolCalls,
}: MessageListProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-1 items-center justify-center py-20 text-center">
          <div className="animate-fade-in space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-nexus-border bg-nexus-surface" style={{ boxShadow: 'var(--nexus-shadow-accent)' }}>
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-nexus-text">
                Welcome to Nexus
              </p>
              <p className="mt-1 text-sm text-nexus-text-dim">
                Your AI-powered support resolution co-pilot
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["/analyze", "/classify", "/similar", "/draft"].map((cmd) => (
                <span
                  key={cmd}
                  className="rounded-full border border-nexus-border bg-nexus-surface-raised px-3 py-1 font-mono text-xs text-nexus-text-muted"
                >
                  {cmd}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isStreaming && pendingToolCalls.length > 0 && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl border border-nexus-border bg-nexus-surface px-4 py-2">
            <ToolCallTrace toolCalls={pendingToolCalls} />
          </div>
        </div>
      )}

      {isStreaming && (
        <MessageBubble
          isStreaming
          message={{
            id: "__streaming__",
            role: "assistant",
            content: currentStreamBuffer,
            timestamp: new Date(),
          }}
        />
      )}

      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
