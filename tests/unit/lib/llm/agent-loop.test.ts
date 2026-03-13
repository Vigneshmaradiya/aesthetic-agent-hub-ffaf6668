import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgentLoop } from "@/lib/llm/agent-loop";
import type { SSESender } from "@/lib/llm/agent-loop";
import type { LLMMessage } from "@/lib/llm/types";
import type { SSEEventType } from "@/lib/streaming/sse-client";

// Mock all external dependencies
vi.mock("@/lib/llm/provider-factory", () => ({
  getLLMProvider: vi.fn(() => ({
    name: "mock",
    streamCompletion: vi.fn(async function* () {
      yield { type: "text_delta" as const, text: "Hello from the agent!" };
      yield {
        type: "done" as const,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    }),
  })),
}));

vi.mock("@/lib/llm/models", () => ({
  getModelInfo: vi.fn(() => ({
    id: "mock-model",
    provider: "anthropic",
    displayName: "Mock Model",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    supportsToolUse: true,
    supportsStreaming: true,
  })),
}));

vi.mock("@/lib/llm/tool-bridge", () => ({
  discoverTools: vi.fn(async () => []),
  executeTool: vi.fn(async (toolCall: { id: string; name: string }) => ({
    toolCallId: toolCall.id,
    name: toolCall.name,
    content: JSON.stringify({ result: "mock tool result" }),
  })),
}));

describe("runAgentLoop", () => {
  let sseSender: SSESender;
  let sentEvents: Array<{ type: SSEEventType; data: string }>;

  beforeEach(() => {
    sentEvents = [];
    sseSender = {
      send: (type: SSEEventType, data: string) => {
        sentEvents.push({ type, data });
      },
    };
    vi.clearAllMocks();
  });

  it("should emit thought events during initialization", async () => {
    const conversationHistory: LLMMessage[] = [
      { role: "user", content: "Hello" },
    ];

    await runAgentLoop(
      {
        provider: "anthropic",
        model: "mock-model",
        apiKey: "test-key",
        conversationHistory,
        hitlMode: "autonomous",
      },
      sseSender,
    );

    // Should have emitted intent analysis thought
    const thoughts = sentEvents.filter((e) => e.type === "thought");
    expect(thoughts.length).toBeGreaterThan(0);

    // Should have emitted a message (from mock provider text_delta)
    const messages = sentEvents.filter((e) => e.type === "message");
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].data).toBe("Hello from the agent!");
  });

  it("should respect abort signal", async () => {
    const controller = new AbortController();
    controller.abort(); // Abort immediately

    const conversationHistory: LLMMessage[] = [
      { role: "user", content: "Hello" },
    ];

    await runAgentLoop(
      {
        provider: "anthropic",
        model: "mock-model",
        apiKey: "test-key",
        conversationHistory,
        hitlMode: "autonomous",
        signal: controller.signal,
      },
      sseSender,
    );

    // Should have emitted an error event about cancellation
    const errors = sentEvents.filter((e) => e.type === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should classify intent from user message", async () => {
    const conversationHistory: LLMMessage[] = [
      { role: "user", content: "Show me ticket #1234" },
    ];

    await runAgentLoop(
      {
        provider: "anthropic",
        model: "mock-model",
        apiKey: "test-key",
        conversationHistory,
        hitlMode: "autonomous",
      },
      sseSender,
    );

    // Should have an intent analysis thought
    const thoughts = sentEvents.filter((e) => e.type === "thought");
    const intentThought = thoughts.find((t) => {
      const parsed = JSON.parse(t.data) as { step: string };
      return parsed.step === "Intent Analysis";
    });
    expect(intentThought).toBeDefined();

    const parsed = JSON.parse(intentThought!.data) as { content: string };
    expect(parsed.content).toContain("ticket_lookup");
  });

  it("should work in supervised mode without HITL callback", async () => {
    const conversationHistory: LLMMessage[] = [
      { role: "user", content: "Help me with something" },
    ];

    // Should not throw even in supervised mode without onHitlRequest
    await expect(
      runAgentLoop(
        {
          provider: "anthropic",
          model: "mock-model",
          apiKey: "test-key",
          conversationHistory,
          hitlMode: "supervised",
        },
        sseSender,
      ),
    ).resolves.not.toThrow();
  });

  it("should emit tool discovery thought", async () => {
    const conversationHistory: LLMMessage[] = [
      { role: "user", content: "Hello" },
    ];

    await runAgentLoop(
      {
        provider: "anthropic",
        model: "mock-model",
        apiKey: "test-key",
        conversationHistory,
        hitlMode: "autonomous",
      },
      sseSender,
    );

    const thoughts = sentEvents.filter((e) => e.type === "thought");
    const toolDiscovery = thoughts.find((t) => {
      const parsed = JSON.parse(t.data) as { step: string };
      return parsed.step === "Tool Discovery";
    });
    expect(toolDiscovery).toBeDefined();
  });
});
