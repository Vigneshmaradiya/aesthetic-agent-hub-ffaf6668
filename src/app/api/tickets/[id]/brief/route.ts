import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";
import {
  getAvailableProviders,
  getDefaultModelForProvider,
} from "@/lib/llm/models";
import { getLLMProvider } from "@/lib/llm/provider-factory";
import type { LLMProviderName } from "@/lib/llm/types";
import { getPrompt } from "@/lib/prompts/prompt-registry";

export const dynamic = "force-dynamic";

// In-memory briefing cache (per ticket, per session)
const briefingCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/brief
 * Fetches ticket + comments, then generates an AI-enriched briefing
 * (summary, sentiment, suggested actions).
 * Falls back to raw ticket data if no LLM is configured.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check cache
  const cached = briefingCache.get(id);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  let accessToken: string | undefined;
  try {
    const session = await auth();
    accessToken = session?.accessToken ?? undefined;
  } catch {
    // No session
  }

  // Fetch ticket + comments + linked JIRA issues in parallel
  const [ticketResult, commentsResult, jiraSearchResult] = await Promise.all([
    callMCPTool("zendesk", "get_ticket", { ticket_id: id }, accessToken).catch(
      () => null,
    ),
    callMCPTool(
      "zendesk",
      "get_ticket_comments",
      { ticket_id: id },
      accessToken,
    ).catch(() => null),
    callMCPTool("jira-onprem", "search_issues", {
      jql: `text ~ "${id}"`,
      max_results: 5,
    }).catch(() => null),
  ]);

  if (ticketResult?.error && commentsResult?.error) {
    return NextResponse.json(
      {
        error: "zendesk_unreachable",
        message: ticketResult.error,
      },
      { status: 502 },
    );
  }

  // Parse ticket
  let ticket: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(ticketResult?.content?.[0]?.text ?? "{}");
    ticket = parsed.ticket ?? parsed;
  } catch {
    /* empty */
  }

  // Parse comments
  let comments: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(commentsResult?.content?.[0]?.text ?? "[]");
    comments = Array.isArray(parsed)
      ? parsed
      : (parsed.comments ?? parsed.results ?? []);
  } catch {
    /* empty */
  }

  // Parse linked JIRA issues
  type LinkedJiraIssue = {
    key: string;
    summary: string;
    status: string;
    priority: string;
    assignee: string;
    url: string;
  };
  let linkedJiraIssues: LinkedJiraIssue[] = [];
  if (jiraSearchResult && !jiraSearchResult.error) {
    try {
      const parsed = JSON.parse(jiraSearchResult.content?.[0]?.text ?? "{}");
      const issues = Array.isArray(parsed) ? parsed : (parsed.issues ?? []);
      linkedJiraIssues = issues.map((issue: Record<string, unknown>) => ({
        key: String(issue.key ?? ""),
        summary: String(issue.summary ?? issue.key ?? ""),
        status: String(issue.status ?? "Open"),
        priority: String(issue.priority ?? ""),
        assignee: String(issue.assignee ?? "Unassigned"),
        url: String(issue.url ?? ""),
      }));
    } catch {
      /* empty */
    }
  }

  // Build raw briefing data
  const rawBriefing = {
    ticketId: String(ticket.id ?? id),
    subject: String(ticket.subject ?? "Untitled"),
    priority: String(ticket.priority ?? "normal"),
    requester: String(
      (ticket.requester as Record<string, unknown>)?.name ??
        ticket.requester_name ??
        "Unknown",
    ),
    status: String(ticket.status ?? "open"),
    description: String(ticket.description ?? ""),
    commentCount: comments.length,
    linkedJiraIssues,
  };

  // Try AI enrichment
  const env = process.env;
  const availableProviders = getAvailableProviders(env);

  if (availableProviders.length === 0) {
    // No LLM configured — return raw data without AI enrichment
    const fallbackBriefing = {
      ...rawBriefing,
      summary:
        rawBriefing.description.slice(0, 300) ||
        `Ticket from ${rawBriefing.requester}: ${rawBriefing.subject}`,
      sentiment: "neutral" as const,
      suggestedActions: [],
      relatedArticles: [],
      linkedJiraIssues,
      aiEnriched: false,
    };
    briefingCache.set(id, { data: fallbackBriefing, createdAt: Date.now() });
    return NextResponse.json(fallbackBriefing);
  }

  // AI enrichment via LLM
  try {
    const providerName: LLMProviderName =
      (env.LLM_DEFAULT_PROVIDER as LLMProviderName) ?? availableProviders[0];
    const apiKey =
      env[
        providerName === "anthropic"
          ? "ANTHROPIC_API_KEY"
          : providerName === "openai"
            ? "OPENAI_API_KEY"
            : "GOOGLE_AI_API_KEY"
      ] ?? "";
    const model =
      env.LLM_DEFAULT_MODEL || getDefaultModelForProvider(providerName);

    const provider = getLLMProvider(providerName);

    // Build a concise prompt with ticket context
    const lastComments = comments
      .slice(-5)
      .map(
        (c: Record<string, unknown>) =>
          `[${c.public === false ? "Internal" : "Public"}] ${(c.author as Record<string, unknown>)?.name ?? "Unknown"}: ${String(
            c.body ?? c.plain_body ?? "",
          )
            .replace(/<[^>]*>/g, "")
            .slice(0, 200)}`,
      )
      .join("\n");

    // Build JIRA context block for the prompt
    const jiraContext =
      linkedJiraIssues.length > 0
        ? `\nLinked JIRA Issues:\n${linkedJiraIssues
            .map(
              (j) =>
                `- ${j.key}: "${j.summary}" (${j.status}, assigned to ${j.assignee})`,
            )
            .join("\n")}\n`
        : "";

    const prompt = `Analyze this support ticket and respond with ONLY valid JSON (no markdown, no code blocks):

Ticket #${rawBriefing.ticketId}: ${rawBriefing.subject}
Priority: ${rawBriefing.priority} | Status: ${rawBriefing.status}
Requester: ${rawBriefing.requester}
Description: ${rawBriefing.description.slice(0, 500)}

Recent comments:
${lastComments || "No comments yet."}
${jiraContext}
Respond with this exact JSON structure:
{"summary":"2-3 sentence overview","sentiment":"positive|neutral|negative|angry","confidenceScore":0.85,"evidence":["key finding 1","key finding 2"],"relatedArticles":[{"title":"KB article title","sourceId":"kb-001","url":"","relevance":0.85}],"suggestedActions":[{"id":"sa-1","label":"Search KB","chatPrompt":"Search the knowledge base for..."},{"id":"sa-2","label":"Draft Reply","chatPrompt":"Draft a reply for..."}],"rootCause":{"description":"likely root cause","confidence":0.7,"evidence":["evidence 1"],"category":"configuration|bug|user-error|unknown"},"nextBestAction":{"recommendation":"what to do next","confidence":0.85,"reasoning":"why this is the best action","category":"respond|escalate|investigate|resolve","actions":[{"id":"nba-1","label":"action label","chatPrompt":"prompt","variant":"primary","requiresHitl":false}]},"slaRisk":null}`;

    // Collect the full response
    let responseText = "";
    for await (const event of provider.streamCompletion(
      [
        {
          role: "system",
          content: getPrompt("ticket_brief_system"),
        },
        { role: "user", content: prompt },
      ],
      [], // no tools needed for briefing
      { apiKey, model, maxTokens: 800 },
    )) {
      if (event.type === "text_delta") {
        responseText += event.text;
      }
    }

    // Parse AI response
    let aiData: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(jsonMatch?.[0] ?? responseText);
    } catch {
      aiData = {
        summary: rawBriefing.description.slice(0, 300) || rawBriefing.subject,
        sentiment: "neutral",
        suggestedActions: [],
      };
    }

    const validSentiments = ["positive", "neutral", "negative", "angry"];
    const enrichedBriefing = {
      ...rawBriefing,
      summary: String(aiData.summary ?? rawBriefing.subject),
      sentiment: validSentiments.includes(aiData.sentiment as string)
        ? aiData.sentiment
        : "neutral",
      confidenceScore:
        typeof aiData.confidenceScore === "number" ? aiData.confidenceScore : 0,
      evidence: Array.isArray(aiData.evidence) ? aiData.evidence : [],
      suggestedActions: Array.isArray(aiData.suggestedActions)
        ? (aiData.suggestedActions as Array<Record<string, unknown>>).slice(
            0,
            6,
          )
        : [],
      rootCause: aiData.rootCause ?? null,
      nextBestAction: aiData.nextBestAction ?? null,
      slaRisk: aiData.slaRisk ?? null,
      relatedArticles: Array.isArray(aiData.relatedArticles)
        ? aiData.relatedArticles
        : [],
      linkedJiraIssues,
      aiEnriched: true,
    };

    briefingCache.set(id, { data: enrichedBriefing, createdAt: Date.now() });
    return NextResponse.json(enrichedBriefing);
  } catch (error) {
    // LLM failed — return raw briefing
    const fallbackBriefing = {
      ...rawBriefing,
      summary:
        rawBriefing.description.slice(0, 300) ||
        `Ticket from ${rawBriefing.requester}: ${rawBriefing.subject}`,
      sentiment: "neutral" as const,
      suggestedActions: [],
      relatedArticles: [],
      linkedJiraIssues,
      aiEnriched: false,
      aiError: error instanceof Error ? error.message : "LLM unavailable",
    };
    briefingCache.set(id, { data: fallbackBriefing, createdAt: Date.now() });
    return NextResponse.json(fallbackBriefing);
  }
}
