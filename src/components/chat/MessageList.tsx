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
          <div>
            <p className="text-lg font-medium text-nexus-text">
              Welcome to Nexus
            </p>
            <p className="mt-1 text-sm text-nexus-text-dim">
              Ask anything to get started.
            </p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Live streaming: show pending tool calls in a standalone trace section
          ABOVE the streaming bubble. This keeps them separate from the finalized
          message's toolCalls, preventing any duplicate rendering. */}
      {isStreaming && pendingToolCalls.length > 0 && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-xl border border-nexus-border bg-nexus-surface px-4 py-2">
            <ToolCallTrace toolCalls={pendingToolCalls} />
          </div>
        </div>
      )}

      {/* Live streaming buffer shown as in-progress assistant message.
          Show even when the buffer is empty so the bubble is visible during
          pure tool-call iterations where no text has streamed yet. */}
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
