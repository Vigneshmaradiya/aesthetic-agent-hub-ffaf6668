import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/stores/chat-store";
import type { ChatMessage } from "@/types/chat";

describe("chat-store", () => {
  beforeEach(() => {
    useChatStore.getState().clearChat();
  });

  describe("addMessage", () => {
    it("should add a message to the list", () => {
      const message: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "Hello, Nexus!",
        timestamp: new Date("2025-01-01T00:00:00Z"),
      };

      useChatStore.getState().addMessage(message);

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it("should append messages in order", () => {
      const msg1: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "First",
        timestamp: new Date("2025-01-01T00:00:00Z"),
      };
      const msg2: ChatMessage = {
        id: "msg-2",
        role: "assistant",
        content: "Second",
        timestamp: new Date("2025-01-01T00:00:01Z"),
      };

      useChatStore.getState().addMessage(msg1);
      useChatStore.getState().addMessage(msg2);

      const { messages } = useChatStore.getState();
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe("msg-1");
      expect(messages[1].id).toBe("msg-2");
    });
  });

  describe("appendToStream + finalizeStream", () => {
    it("should accumulate stream chunks", () => {
      useChatStore.getState().appendToStream("Hello");
      useChatStore.getState().appendToStream(", ");
      useChatStore.getState().appendToStream("world!");

      expect(useChatStore.getState().currentStreamBuffer).toBe("Hello, world!");
    });

    it("should finalize stream into an assistant message", () => {
      useChatStore.getState().appendToStream("Streamed ");
      useChatStore.getState().appendToStream("response");
      useChatStore.getState().finalizeStream();

      const { messages, currentStreamBuffer, isStreaming } =
        useChatStore.getState();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toBe("Streamed response");
      expect(currentStreamBuffer).toBe("");
      expect(isStreaming).toBe(false);
    });

    it("should include thought steps in finalized message", () => {
      useChatStore.getState().addThoughtStep({
        step: "Analyzing",
        content: "Looking at the question",
        timestamp: new Date("2025-01-01T00:00:00Z"),
      });
      useChatStore.getState().appendToStream("Answer");
      useChatStore.getState().finalizeStream();

      const { messages } = useChatStore.getState();
      expect(messages[0].thoughts).toHaveLength(1);
      expect(messages[0].thoughts![0].step).toBe("Analyzing");
    });

    it("should include tool calls in finalized message", () => {
      useChatStore.getState().addToolCall({
        tool: "search",
        args: { query: "test" },
        resolved: false,
      });
      useChatStore.getState().resolveToolCall("search", { results: [] });
      useChatStore.getState().appendToStream("Done");
      useChatStore.getState().finalizeStream();

      const { messages } = useChatStore.getState();
      expect(messages[0].toolCalls).toHaveLength(1);
      expect(messages[0].toolCalls![0].resolved).toBe(true);
    });

    it("should not create a message when buffer is empty", () => {
      useChatStore.getState().finalizeStream();

      expect(useChatStore.getState().messages).toHaveLength(0);
    });

    it("should clear thought trace and pending tool calls after finalize", () => {
      useChatStore.getState().addThoughtStep({
        step: "Step 1",
        content: "Content",
        timestamp: new Date(),
      });
      useChatStore.getState().addToolCall({
        tool: "tool1",
        args: {},
        resolved: false,
      });
      useChatStore.getState().appendToStream("Result");
      useChatStore.getState().finalizeStream();

      const { thoughtTrace, pendingToolCalls } = useChatStore.getState();
      expect(thoughtTrace).toHaveLength(0);
      expect(pendingToolCalls).toHaveLength(0);
    });
  });

  describe("clearChat", () => {
    it("should reset all state", () => {
      // Populate state
      useChatStore.getState().addMessage({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: new Date(),
      });
      useChatStore.getState().appendToStream("buffer content");
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().addThoughtStep({
        step: "Thought",
        content: "Content",
        timestamp: new Date(),
      });
      useChatStore.getState().addToolCall({
        tool: "tool",
        args: {},
        resolved: false,
      });

      // Clear
      useChatStore.getState().clearChat();

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(0);
      expect(state.isStreaming).toBe(false);
      expect(state.currentStreamBuffer).toBe("");
      expect(state.thoughtTrace).toHaveLength(0);
      expect(state.pendingToolCalls).toHaveLength(0);
    });
  });

  describe("setStreaming", () => {
    it("should set the streaming flag", () => {
      useChatStore.getState().setStreaming(true);
      expect(useChatStore.getState().isStreaming).toBe(true);

      useChatStore.getState().setStreaming(false);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("resolveToolCall", () => {
    it("should resolve only the first unresolved matching tool call", () => {
      useChatStore.getState().addToolCall({
        tool: "search",
        args: { q: "first" },
        resolved: false,
      });
      useChatStore.getState().addToolCall({
        tool: "search",
        args: { q: "second" },
        resolved: false,
      });

      useChatStore.getState().resolveToolCall("search", "result-1");

      const { pendingToolCalls } = useChatStore.getState();
      expect(pendingToolCalls[0].resolved).toBe(true);
      expect(pendingToolCalls[0].result).toBe("result-1");
      expect(pendingToolCalls[1].resolved).toBe(false);
    });
  });
});
