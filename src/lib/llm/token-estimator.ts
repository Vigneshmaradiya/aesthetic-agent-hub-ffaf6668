import type { LLMMessage } from "./types";

/**
 * Rough token estimation: ~4 chars per token for English text.
 * Avoids requiring tiktoken or provider-specific tokenizers.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Estimate total tokens across an array of messages (includes per-message overhead). */
export function estimateMessagesTokens(messages: LLMMessage[]): number {
  return messages.reduce(
    (sum, m) => sum + estimateTokens(m.content) + 4, // +4 for message framing
    0,
  );
}

/**
 * Truncate conversation history to fit within a context window.
 *
 * Strategy:
 * - Always keep the system prompt (first message)
 * - Always keep the most recent messages
 * - Remove older messages from the middle
 */
export function truncateToFit(
  messages: LLMMessage[],
  maxTokens: number,
  reserveForOutput: number = 4096,
): LLMMessage[] {
  const budget = maxTokens - reserveForOutput;

  const systemMessage = messages.find((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");

  let totalTokens = systemMessage
    ? estimateTokens(systemMessage.content) + 4
    : 0;

  const kept: LLMMessage[] = [];

  // Keep messages from the end (most recent first)
  for (let i = nonSystem.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(nonSystem[i].content) + 4;
    if (totalTokens + msgTokens > budget) break;
    totalTokens += msgTokens;
    kept.unshift(nonSystem[i]);
  }

  return systemMessage ? [systemMessage, ...kept] : kept;
}
