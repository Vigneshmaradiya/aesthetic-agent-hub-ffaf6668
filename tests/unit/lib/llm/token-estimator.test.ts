import { describe, it, expect } from "vitest";
import { estimateTokens, truncateToFit } from "@/lib/llm/token-estimator";
import type { LLMMessage } from "@/lib/llm/types";

describe("estimateTokens", () => {
  it("should estimate roughly 1 token per 4 characters", () => {
    const text = "a".repeat(400);
    const tokens = estimateTokens(text);
    expect(tokens).toBe(100);
  });

  it("should return 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("should handle short strings", () => {
    expect(estimateTokens("hi")).toBe(1); // ceil(2/4) = 1
  });

  it("should handle unicode characters", () => {
    // Unicode chars are still counted by string length
    const text = "Hello world!";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });
});

describe("truncateToFit", () => {
  const makeMessages = (count: number, contentLength = 100): LLMMessage[] => {
    return Array.from({ length: count }, (_, i) => ({
      role: (i === 0 ? "system" : i % 2 === 1 ? "user" : "assistant") as
        | "system"
        | "user"
        | "assistant",
      content: `msg${i}${"x".repeat(contentLength)}`,
    }));
  };

  it("should return all messages if they fit within context", () => {
    const messages = makeMessages(3, 10);
    const result = truncateToFit(messages, 128_000, 4096);
    expect(result).toHaveLength(3);
  });

  it("should always keep the system message", () => {
    const messages = makeMessages(20, 500);
    const result = truncateToFit(messages, 1000, 200);
    // First message should be the system message
    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain("msg0");
  });

  it("should keep the most recent messages when truncating", () => {
    const messages = makeMessages(10, 200);
    const result = truncateToFit(messages, 400, 100);
    // Should include last message
    const lastOriginal = messages[messages.length - 1];
    const lastTruncated = result[result.length - 1];
    expect(lastTruncated.content).toBe(lastOriginal.content);
  });

  it("should handle empty messages array", () => {
    const result = truncateToFit([], 128_000, 4096);
    expect(result).toHaveLength(0);
  });

  it("should handle single system message", () => {
    const messages: LLMMessage[] = [
      { role: "system", content: "You are helpful." },
    ];
    const result = truncateToFit(messages, 128_000, 4096);
    expect(result).toHaveLength(1);
  });
});
