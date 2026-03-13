import type { ToolCallRequest } from "../types";
import { buildContextBlock } from "../system-prompt";

// ─── Entity Types ──────────────────────────────────────────────

interface TicketContext {
  id: string;
  subject: string;
  status: string;
  priority: string;
  requester: string;
  summary: string;
}

interface KBArticle {
  title: string;
  snippet: string;
  sourceId?: string;
}

interface ToolExecution {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  timestamp: Date;
}

// ─── Entity Extraction Patterns ────────────────────────────────

const TICKET_ID_PATTERN = /(?:#|ticket\s*)(\d{3,})/gi;
const ERROR_CODE_PATTERN =
  /(?:error|code|status)\s*[:=]?\s*(\d{3,5}|[A-Z_]{3,})/gi;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;

export interface ExtractedEntities {
  ticketIds: string[];
  errorCodes: string[];
  urls: string[];
}

/**
 * Extract structured entities from text using patterns and heuristics.
 */
export function extractEntities(text: string): ExtractedEntities {
  const ticketIds = [
    ...new Set(Array.from(text.matchAll(TICKET_ID_PATTERN), (m) => m[1])),
  ];
  const errorCodes = [
    ...new Set(Array.from(text.matchAll(ERROR_CODE_PATTERN), (m) => m[1])),
  ];
  const urls = [
    ...new Set(Array.from(text.matchAll(URL_PATTERN), (m) => m[0])),
  ];

  return { ticketIds, errorCodes, urls };
}

// ─── Semantic Memory Manager ───────────────────────────────────

/**
 * Session-scoped semantic memory that enriches LLM context
 * with ticket data, KB articles, conversation history, and tool results.
 *
 * This is what makes the co-pilot "intelligent" — it proactively
 * gathers and organizes context so the LLM can reason more effectively.
 */
export class SemanticMemory {
  /** Currently active ticket context. */
  private activeTicket: TicketContext | null = null;

  /** Proactively fetched KB articles relevant to the conversation. */
  private kbArticles: KBArticle[] = [];

  /** History of tool executions in this session. */
  private toolHistory: ToolExecution[] = [];

  /** Rolling set of entities extracted from the conversation. */
  private entities: ExtractedEntities = {
    ticketIds: [],
    errorCodes: [],
    urls: [],
  };

  /** SearchUnify resolution insights from search results. */
  private resolutionInsights: {
    searchResults: Array<{ title: string; snippet: string; url?: string }>;
    queryUsed: string;
  } | null = null;

  /** Compressed summary of the conversation for long sessions. */
  private conversationSummary: string | null = null;

  /** Count of messages processed for summary triggering. */
  private messageCount = 0;

  // ── Getters ────────────────────────────────────────────────

  getActiveTicket(): TicketContext | null {
    return this.activeTicket;
  }

  getEntities(): ExtractedEntities {
    return this.entities;
  }

  getToolHistory(): ToolExecution[] {
    return this.toolHistory;
  }

  getResolutionInsights(): {
    searchResults: Array<{ title: string; snippet: string; url?: string }>;
    queryUsed: string;
  } | null {
    return this.resolutionInsights;
  }

  // ── Updates ────────────────────────────────────────────────

  /** Update memory when a ticket is loaded/fetched. */
  setActiveTicket(ticket: TicketContext): void {
    this.activeTicket = ticket;
  }

  /** Check if an active ticket is already set. */
  hasActiveTicket(): boolean {
    return this.activeTicket !== null;
  }

  /** Add a KB article to the context. */
  addKBArticle(article: KBArticle): void {
    // Avoid duplicates
    if (!this.kbArticles.some((a) => a.title === article.title)) {
      this.kbArticles.push(article);
      // Keep only the 5 most recent
      if (this.kbArticles.length > 5) {
        this.kbArticles = this.kbArticles.slice(-5);
      }
    }
  }

  /** Record a tool execution for history tracking. */
  recordToolExecution(
    tool: string,
    args: Record<string, unknown>,
    result: string,
  ): void {
    this.toolHistory.push({
      tool,
      args,
      result: result.slice(0, 500), // Truncate for memory efficiency
      timestamp: new Date(),
    });

    // Keep last 20 tool calls
    if (this.toolHistory.length > 20) {
      this.toolHistory = this.toolHistory.slice(-20);
    }
  }

  /** Process a new message and extract entities. */
  processMessage(content: string): void {
    this.messageCount++;
    const newEntities = extractEntities(content);

    // Merge without duplicates
    this.entities.ticketIds = [
      ...new Set([...this.entities.ticketIds, ...newEntities.ticketIds]),
    ];
    this.entities.errorCodes = [
      ...new Set([...this.entities.errorCodes, ...newEntities.errorCodes]),
    ];
    this.entities.urls = [
      ...new Set([...this.entities.urls, ...newEntities.urls]),
    ];
  }

  /** Set the rolling conversation summary. */
  setConversationSummary(summary: string): void {
    this.conversationSummary = summary;
  }

  /** Check if the conversation is long enough to need summarization. */
  needsSummarization(): boolean {
    return this.messageCount > 10 && this.messageCount % 8 === 0;
  }

  // ── Context Enrichment ─────────────────────────────────────

  /**
   * Build an enriched context string to prepend to the system prompt.
   * This gives the LLM full awareness of the current session state.
   */
  buildEnrichedContext(): string {
    const base = buildContextBlock({
      activeTicket: this.activeTicket ?? undefined,
      kbArticles: this.kbArticles.length > 0 ? this.kbArticles : undefined,
      toolHistory:
        this.toolHistory.length > 0
          ? this.toolHistory.map((t) => ({
              tool: t.tool,
              summary: `Called with ${JSON.stringify(t.args).slice(0, 100)}`,
            }))
          : undefined,
      conversationSummary: this.conversationSummary ?? undefined,
    });

    // Append resolution insights if available
    if (
      this.resolutionInsights &&
      this.resolutionInsights.searchResults.length > 0
    ) {
      const results = this.resolutionInsights.searchResults;
      const insightsBlock =
        `\n## SearchUnify Resolution Intelligence (${results.length} hits)\n` +
        results
          .slice(0, 5)
          .map((r) => `- **${r.title}**: ${r.snippet}`)
          .join("\n") +
        "\n";
      return base + insightsBlock;
    }

    return base;
  }

  /**
   * Update memory from a tool result.
   * Extracts relevant information based on the tool that was called.
   */
  updateFromToolResult(toolCall: ToolCallRequest, result: string): void {
    this.recordToolExecution(toolCall.name, toolCall.arguments, result);

    // Auto-extract ticket context from Zendesk tool results
    if (
      toolCall.name.startsWith("zendesk__get_ticket") &&
      !toolCall.name.includes("comments")
    ) {
      try {
        const ticketData = JSON.parse(result);
        if (ticketData?.ticket || ticketData?.id) {
          const t = ticketData.ticket ?? ticketData;
          this.setActiveTicket({
            id: String(t.id ?? ""),
            subject: t.subject ?? "",
            status: t.status ?? "",
            priority: t.priority ?? "",
            requester: t.requester?.name ?? t.requester_id ?? "",
            summary: t.description?.slice(0, 300) ?? "",
          });
        }
      } catch {
        // Not valid JSON, skip
      }
    }

    // Auto-extract KB articles from SearchUnify results
    if (toolCall.name.startsWith("searchunify__search")) {
      try {
        const searchData = JSON.parse(result);
        const hits = searchData?.results ?? searchData?.hits ?? [];
        for (const hit of hits.slice(0, 3)) {
          this.addKBArticle({
            title: hit.title ?? hit.name ?? "Untitled",
            snippet: (hit.snippet ?? hit.description ?? "").slice(0, 200),
            sourceId: hit.id ?? hit.url,
          });
        }

        // Also store in resolutionInsights for enriched context
        this.resolutionInsights = {
          searchResults: hits
            .slice(0, 10)
            .map((hit: Record<string, unknown>) => ({
              title:
                (hit.title as string) ?? (hit.name as string) ?? "Untitled",
              snippet: (
                (hit.snippet as string) ??
                (hit.description as string) ??
                ""
              ).slice(0, 200),
              url: (hit.url as string) ?? (hit.id as string) ?? undefined,
            })),
          queryUsed:
            (toolCall.arguments.query as string) ??
            (toolCall.arguments.q as string) ??
            "",
        };
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  /** Get all new ticket IDs that haven't been fetched yet. */
  getUnfetchedTicketIds(): string[] {
    const fetchedId = this.activeTicket?.id;
    return this.entities.ticketIds.filter((id) => id !== fetchedId);
  }

  // ── Serialization ──────────────────────────────────────────

  /** Get a summary suitable for including in messages. */
  toSummary(): string {
    const parts: string[] = [];
    if (this.activeTicket) {
      parts.push(
        `Active ticket: #${this.activeTicket.id} (${this.activeTicket.subject})`,
      );
    }
    if (this.entities.ticketIds.length > 0) {
      parts.push(`Referenced tickets: ${this.entities.ticketIds.join(", ")}`);
    }
    if (this.kbArticles.length > 0) {
      parts.push(`KB articles loaded: ${this.kbArticles.length}`);
    }
    parts.push(`Tool calls made: ${this.toolHistory.length}`);
    return parts.join(" | ");
  }
}
