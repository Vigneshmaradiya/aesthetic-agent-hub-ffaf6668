import type { LLMMessage } from "../types";
import { estimateTokens } from "../token-estimator";

/**
 * Build a compressed conversation summary for long sessions.
 * This keeps the LLM aware of the full conversation without
 * exceeding context limits.
 */
export function buildConversationSummary(
  messages: LLMMessage[],
  maxTokens: number = 500,
): string {
  const nonSystem = messages.filter((m) => m.role !== "system");
  if (nonSystem.length <= 6) return ""; // Not worth summarizing short conversations

  const summaryParts: string[] = [];
  let tokenCount = 0;

  for (const msg of nonSystem) {
    const prefix = msg.role === "user" ? "User" : "Assistant";
    // Take first 100 chars of each message
    const snippet = msg.content.slice(0, 100).replace(/\n/g, " ");
    const line = `- ${prefix}: ${snippet}${msg.content.length > 100 ? "..." : ""}`;

    const lineTokens = estimateTokens(line);
    if (tokenCount + lineTokens > maxTokens) break;

    summaryParts.push(line);
    tokenCount += lineTokens;
  }

  return summaryParts.join("\n");
}

/**
 * Format ticket data into a context block.
 */
export function buildTicketContext(ticket: {
  id: string;
  subject: string;
  status: string;
  priority: string;
  requester: string;
  description?: string;
  tags?: string[];
}): string {
  const lines = [
    `**Ticket #${ticket.id}**: ${ticket.subject}`,
    `Status: ${ticket.status} | Priority: ${ticket.priority} | Requester: ${ticket.requester}`,
  ];
  if (ticket.tags?.length) {
    lines.push(`Tags: ${ticket.tags.join(", ")}`);
  }
  if (ticket.description) {
    lines.push(`Description: ${ticket.description.slice(0, 500)}`);
  }
  return lines.join("\n");
}

/**
 * Format KB search results into a context block.
 */
export function buildKBContext(
  articles: Array<{ title: string; snippet: string; url?: string }>,
): string {
  if (articles.length === 0) return "";
  return articles
    .map(
      (a, i) =>
        `${i + 1}. **${a.title}**${a.url ? ` ([link](${a.url}))` : ""}\n   ${a.snippet}`,
    )
    .join("\n");
}

/**
 * Format tool execution history into a compact context block.
 */
export function buildToolHistory(
  executions: Array<{ tool: string; summary: string; timestamp: Date }>,
): string {
  if (executions.length === 0) return "";
  return executions
    .map(
      (e) =>
        `- \`${e.tool}\` at ${e.timestamp.toLocaleTimeString()}: ${e.summary}`,
    )
    .join("\n");
}
