import { create } from "zustand";
import type { ChatMessage, ThoughtStep, ToolCallEvent } from "@/types/chat";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamBuffer: string;
  thoughtTrace: ThoughtStep[];
  pendingToolCalls: ToolCallEvent[];

  addMessage: (message: ChatMessage) => void;
  appendToStream: (chunk: string) => void;
  finalizeStream: () => void;
  addThoughtStep: (step: ThoughtStep) => void;
  addToolCall: (toolCall: ToolCallEvent) => void;
  resolveToolCall: (tool: string, result: unknown, callId?: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentStreamBuffer: "",
  thoughtTrace: [],
  pendingToolCalls: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  appendToStream: (chunk) =>
    set((state) => ({
      currentStreamBuffer: state.currentStreamBuffer + chunk,
    })),

  finalizeStream: () => {
    const { currentStreamBuffer, messages, thoughtTrace, pendingToolCalls } =
      get();

    // Always clear streaming state. Previously an early return here when the
    // buffer was empty left isStreaming=true forever on tool-only responses.
    if (!currentStreamBuffer && thoughtTrace.length === 0 && pendingToolCalls.length === 0) {
      set({ isStreaming: false });
      return;
    }

    // Deduplicate tool calls by callId before persisting to the message.
    // Prefer resolved entries when duplicates exist.
    const seenCallIds = new Set<string>();
    const dedupedToolCalls = pendingToolCalls.filter((tc) => {
      const key = tc.callId ?? `${tc.tool}::${JSON.stringify(tc.args)}`;
      if (seenCallIds.has(key)) return false;
      seenCallIds.add(key);
      return true;
    });

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: currentStreamBuffer,
      thoughts: thoughtTrace.length > 0 ? [...thoughtTrace] : undefined,
      toolCalls: dedupedToolCalls.length > 0 ? dedupedToolCalls : undefined,
      timestamp: new Date(),
    };

    set({
      messages: [...messages, assistantMessage],
      currentStreamBuffer: "",
      thoughtTrace: [],
      pendingToolCalls: [],
      isStreaming: false,
    });
  },

  addThoughtStep: (step) =>
    set((state) => ({
      thoughtTrace: [...state.thoughtTrace, step],
    })),

  addToolCall: (toolCall) =>
    set((state) => {
      // Deduplicate by callId to prevent the same tool call appearing twice
      if (
        toolCall.callId &&
        state.pendingToolCalls.some((tc) => tc.callId === toolCall.callId)
      ) {
        return state;
      }
      return { pendingToolCalls: [...state.pendingToolCalls, toolCall] };
    }),

  resolveToolCall: (tool, result, callId) =>
    set((state) => {
      // Resolve ALL matching entries — not just the first.
      // If duplicate entries somehow exist (same callId or same tool name),
      // resolving only the first leaves the rest permanently "running".
      const pendingToolCalls = state.pendingToolCalls.map((tc) => {
        if (tc.resolved) return tc;
        const matches = callId ? tc.callId === callId : tc.tool === tool;
        if (matches) return { ...tc, result, resolved: true };
        return tc;
      });
      return { pendingToolCalls };
    }),

  setStreaming: (streaming) =>
    set(
      streaming
        ? // Reset in-flight state when a new message starts so stale tool
          // calls and thoughts from a previous (possibly aborted) response
          // don't bleed into the next one.
          {
            isStreaming: true,
            currentStreamBuffer: "",
            thoughtTrace: [],
            pendingToolCalls: [],
          }
        : { isStreaming: false },
    ),

  clearChat: () =>
    set({
      messages: [],
      isStreaming: false,
      currentStreamBuffer: "",
      thoughtTrace: [],
      pendingToolCalls: [],
    }),
}));
