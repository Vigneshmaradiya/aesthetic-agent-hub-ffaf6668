"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useSSE } from "@/hooks/useSSE";
import { useProactiveSearch } from "@/hooks/useProactiveSearch";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { KBSuggestionPills } from "./KBSuggestionPills";
import { ModelSelector } from "./ModelSelector";
import { useHitlStore } from "@/stores/hitl-store";
import { ActionApproval } from "@/components/hitl/ActionApproval";

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentStreamBuffer = useChatStore((s) => s.currentStreamBuffer);
  const pendingToolCalls = useChatStore((s) => s.pendingToolCalls);
  const clearChat = useChatStore((s) => s.clearChat);
  const { sendMessage } = useSSE();

  const pendingActions = useHitlStore((s) => s.pendingActions);

  const [inputValue, setInputValue] = useState("");
  const { suggestions } = useProactiveSearch(inputValue);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or stream updates
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, currentStreamBuffer, isStreaming]);

  return (
    <div className="flex h-full flex-col bg-nexus-base">
      {/* Chat header with model selector */}
      <div className="flex items-center justify-between border-b border-nexus-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-dim">
          Nexus Co-pilot
        </span>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={clearChat}
              title="Clear chat history"
              className="rounded-md px-2 py-1 text-[10px] font-medium text-nexus-text-dim transition-colors hover:bg-nexus-surface-raised hover:text-red-400"
            >
              Clear chat
            </button>
          )}
          <ModelSelector />
        </div>
      </div>

      {/* Message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          currentStreamBuffer={currentStreamBuffer}
          pendingToolCalls={pendingToolCalls}
        />
      </div>

      {/* HITL Approval Actions */}
      {pendingActions.length > 0 && (
        <div className="space-y-2 border-t border-nexus-border px-4 py-3">
          {pendingActions.map((action) => (
            <ActionApproval key={action.id} action={action} />
          ))}
        </div>
      )}

      {/* KB Suggestion Pills */}
      {suggestions.length > 0 && (
        <div className="border-t border-nexus-border px-4 py-2">
          <KBSuggestionPills suggestions={suggestions} />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-nexus-border px-4 py-3">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          onValueChange={setInputValue}
        />
      </div>
    </div>
  );
}
