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
      <div className="glass-header flex items-center justify-between border-b border-nexus-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-nexus-accent/10">
            <span className="text-xs text-nexus-accent">🤖</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
            Nexus Co-pilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={clearChat}
              title="Clear chat history"
              className="rounded-md border border-transparent px-2 py-1 text-[10px] font-medium text-nexus-text-dim transition-all hover:border-nexus-error/30 hover:bg-nexus-error/10 hover:text-nexus-error"
            >
              Clear
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
        <div className="animate-slide-up space-y-2 border-t border-nexus-warning/20 bg-nexus-warning/5 px-4 py-3">
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
      <div className="glass-surface border-t border-nexus-border px-4 py-3">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          onValueChange={setInputValue}
        />
      </div>
    </div>
  );
}
