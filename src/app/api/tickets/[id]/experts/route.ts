import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";
import type { ExpertSwarming, ExpertProfile } from "@/types/canvas";

export const dynamic = "force-dynamic";

// In-memory cache
const expertsCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/experts
 * Identifies subject-matter experts by analyzing assignees of similar
 * solved tickets in Zendesk and contributors found via SearchUnify.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check cache
  const cached = expertsCache.get(id);
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

  try {
    // Fetch ticket to get subject and tags
    const ticketResult = await callMCPTool(
      "zendesk",
      "get_ticket",
      { ticket_id: id },
      accessToken,
    );

    if (ticketResult.error) {
      return NextResponse.json(
        { error: "zendesk_unreachable" },
        { status: 502 },
      );
    }

    let ticket: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(ticketResult.content?.[0]?.text ?? "{}");
      ticket = parsed.ticket ?? parsed;
    } catch {
      /* empty */
    }

    const subject = String(ticket.subject ?? "");
    const tags = Array.isArray(ticket.tags) ? (ticket.tags as string[]) : [];

    // Build keyword query from subject
    const keywords = subject
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .join(" ");

    if (!keywords) {
      const emptyResult: ExpertSwarming = {
        suggestedExperts: [],
        reasoning: "Insufficient ticket information to identify experts",
      };
      expertsCache.set(id, { data: emptyResult, createdAt: Date.now() });
      return NextResponse.json(emptyResult);
    }

    // Search Zendesk for similar SOLVED tickets
    const solvedSearchResult = await callMCPTool(
      "zendesk",
      "search_tickets",
      { query: `status:solved ${keywords}`, limit: 20 },
      accessToken,
    ).catch(() => null);

    let solvedTickets: Record<string, unknown>[] = [];
    if (solvedSearchResult && !solvedSearchResult.error) {
      try {
        const parsed = JSON.parse(
          solvedSearchResult.content?.[0]?.text ?? "[]",
        );
        solvedTickets = Array.isArray(parsed)
          ? parsed
          : (parsed.results ?? parsed.tickets ?? []);
      } catch {
        /* empty */
      }
    }

    // Aggregate assignees — count how many similar tickets each resolved
    const assigneeMap = new Map<string, { count: number; tags: Set<string> }>();

    for (const t of solvedTickets) {
      const assignee = t.assignee as Record<string, unknown> | undefined;
      const assigneeName = String(
        assignee?.name ?? t.assignee_name ?? "",
      ).trim();
      if (!assigneeName || assigneeName === "Unknown" || assigneeName === "") {
        continue;
      }

      const entry = assigneeMap.get(assigneeName) ?? {
        count: 0,
        tags: new Set<string>(),
      };
      entry.count += 1;

      // Collect tags as expertise areas
      const tTags = Array.isArray(t.tags) ? (t.tags as string[]) : [];
      for (const tag of tTags.slice(0, 5)) {
        entry.tags.add(tag);
      }
      assigneeMap.set(assigneeName, entry);
    }

    // Also try SearchUnify to find additional contributor names
    const suResult = await callMCPTool("searchunify", "search", {
      searchString: keywords,
    }).catch(() => null);

    if (suResult && !suResult.error) {
      try {
        const parsed = JSON.parse(suResult.content?.[0]?.text ?? "[]");
        const suResults: Record<string, unknown>[] = Array.isArray(parsed)
          ? parsed
          : (parsed.results ?? parsed.hits ?? []);

        for (const r of suResults) {
          // Look for author/contributor names in SearchUnify results
          const author = String(
            r.author ?? r.contributor ?? r.resolved_by ?? "",
          ).trim();
          if (
            !author ||
            author === "Unknown" ||
            author === "undefined" ||
            author === ""
          ) {
            continue;
          }

          const entry = assigneeMap.get(author) ?? {
            count: 0,
            tags: new Set<string>(),
          };
          entry.count += 1;

          // Add source type as expertise hint
          const source = String(r.source ?? r.type ?? "").toLowerCase();
          if (source) entry.tags.add(source);

          assigneeMap.set(author, entry);
        }
      } catch {
        /* empty */
      }
    }

    // Build ExpertProfile[] from top 5 assignees
    const suggestedExperts: ExpertProfile[] = [...assigneeMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        expertise: [...data.tags].slice(0, 5),
        resolvedSimilar: data.count,
        availability: "available" as const, // Default; real availability requires presence API
      }));

    // Build reasoning
    const tagContext =
      tags.length > 0 ? ` (tags: ${tags.slice(0, 3).join(", ")})` : "";
    const reasoning =
      suggestedExperts.length > 0
        ? `Identified ${suggestedExperts.length} expert(s) based on ${solvedTickets.length} similar solved tickets${tagContext}` +
          (suResult && !suResult?.error
            ? " and SearchUnify discussion data"
            : "")
        : `No experts identified for this topic area${tagContext}`;

    // Suggest a Slack channel based on dominant tags
    const allExpertTags = suggestedExperts.flatMap((e) => e.expertise);
    const slackChannelSuggestion =
      allExpertTags.length > 0
        ? `#support-${allExpertTags[0].replace(/\s+/g, "-").toLowerCase()}`
        : undefined;

    const result: ExpertSwarming = {
      suggestedExperts,
      reasoning,
      slackChannelSuggestion,
    };

    expertsCache.set(id, { data: result, createdAt: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "expert_search_failed", message },
      { status: 502 },
    );
  }
}
