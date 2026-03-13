import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

// In-memory cache
const similarCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/similar
 * Finds similar tickets by searching for the ticket subject/tags.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  // Check cache (skip if ?refresh=true)
  const cached = similarCache.get(id);
  if (!refresh && cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
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
    // First get the ticket to know what to search for
    const ticketResult = await callMCPTool(
      "zendesk",
      "get_ticket",
      { ticket_id: id },
      accessToken,
    );

    if (ticketResult.error) {
      return NextResponse.json(
        { cases: [], error: "zendesk_unreachable" },
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
    const description = String(ticket.description ?? "");

    // Build enriched query: subject keywords + top tags + description keywords
    const subjectKws = subject.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
    const tagKws = tags.slice(0, 3);
    const descKws = description.split(/\s+/).filter((w) => w.length > 4).slice(0, 4);
    const searchQuery = [...new Set([...subjectKws, ...tagKws, ...descKws])]
      .slice(0, 10)
      .join(" ");

    if (!searchQuery) {
      const result = { cases: [] };
      similarCache.set(id, { data: result, createdAt: Date.now() });
      return NextResponse.json(result);
    }

    const searchResult = await callMCPTool(
      "zendesk",
      "search_tickets",
      { query: searchQuery, limit: 10 },
      accessToken,
    ).catch(() => null);

    let tickets: Record<string, unknown>[] = [];
    if (searchResult && !searchResult.error) {
      try {
        const parsed = JSON.parse(searchResult.content?.[0]?.text ?? "[]");
        tickets = Array.isArray(parsed)
          ? parsed
          : (parsed.results ?? parsed.tickets ?? []);
      } catch {
        /* empty */
      }
    }

    // Filter out the current ticket and compute similarity (Zendesk cases)
    const zendeskCases = tickets
      .filter((t) => String(t.id) !== id)
      .slice(0, 10)
      .map((t) => {
        const tTags = Array.isArray(t.tags) ? (t.tags as string[]) : [];
        const tagOverlap = tags.filter((tag) => tTags.includes(tag)).length;
        const similarity = Math.min(
          0.95,
          0.4 + tagOverlap * 0.15 + (t.status === "solved" ? 0.1 : 0),
        );

        return {
          ticketId: String(t.id),
          subject: String(t.subject ?? "Untitled"),
          status: String(t.status ?? "open"),
          resolution: t.status === "solved" ? "Resolved" : "",
          similarity: Math.round(similarity * 100) / 100,
          tags: tTags.slice(0, 5),
          source: "zendesk" as const,
        };
      });

    // SearchUnify search for additional similar cases (shared client, no accessToken)
    interface SimilarCaseResult {
      ticketId: string;
      subject: string;
      status: string;
      resolution: string;
      similarity: number;
      tags: string[];
      source: "zendesk" | "searchunify";
      kbArticleUrl?: string;
    }
    let searchUnifyCases: SimilarCaseResult[] = [];
    try {
      const suResult = await callMCPTool("searchunify", "search", {
        searchString: searchQuery,
      });

      if (suResult && !suResult.error) {
        let suResults: Record<string, unknown>[] = [];
        try {
          const parsed = JSON.parse(suResult.content?.[0]?.text ?? "[]");
          suResults = Array.isArray(parsed)
            ? parsed
            : (parsed.results ?? parsed.hits ?? []);
        } catch {
          /* empty */
        }

        searchUnifyCases = suResults.slice(0, 10).map((r) => {
          const relevance = Number(r.relevance ?? r.score ?? 0);
          const similarity =
            relevance > 1
              ? Math.min(relevance / 100, 0.95)
              : relevance > 0
                ? Math.min(relevance, 0.95)
                : 0.4;

          return {
            ticketId: String(r.id ?? r.uid ?? ""),
            subject: String(r.title ?? r.name ?? "Untitled"),
            status: String(r.status ?? "unknown"),
            resolution: String(r.resolution ?? r.snippet ?? "").slice(0, 200),
            similarity: Math.round(similarity * 100) / 100,
            tags: Array.isArray(r.tags) ? (r.tags as string[]).slice(0, 5) : [],
            source: "searchunify" as const,
            kbArticleUrl: r.url ? String(r.url) : undefined,
          };
        });
      }
    } catch {
      // SearchUnify unavailable — continue with Zendesk results only
    }

    // Merge and deduplicate — skip SearchUnify cases if subject overlaps > 70% with any Zendesk case
    const mergedCases: SimilarCaseResult[] = [...zendeskCases];
    for (const suCase of searchUnifyCases) {
      const isDuplicate = zendeskCases.some(
        (zCase) => computeSubjectOverlap(zCase.subject, suCase.subject) > 0.7,
      );
      if (!isDuplicate) {
        mergedCases.push(suCase);
      }
    }

    // Sort all by similarity descending
    mergedCases.sort((a, b) => b.similarity - a.similarity);

    const result = { cases: mergedCases };
    similarCache.set(id, { data: result, createdAt: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { cases: [], error: "search_failed", message },
      { status: 502 },
    );
  }
}

/**
 * Compute word overlap ratio between two subject strings (0-1).
 * Used to deduplicate SearchUnify results that match Zendesk tickets.
 */
function computeSubjectOverlap(a: string, b: string): number {
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}
