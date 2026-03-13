import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";
import type {
  ResolutionInsight,
  EvidenceSource,
  EvidenceSourceType,
} from "@/types/canvas";

export const dynamic = "force-dynamic";

// In-memory cache
const insightsCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/resolution-insights
 * Aggregates resolution intelligence from SearchUnify and Zendesk data:
 * similar case counts, common resolutions, related engineering issues,
 * confidence scoring, and evidence sources.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  // Check cache (skip if ?refresh=true)
  const cached = insightsCache.get(id);
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

  const fallback: ResolutionInsight = {
    similarCasesCount: 0,
    commonResolutions: [],
    relatedEngineeringIssues: [],
    confidence: 0,
    evidenceSources: [],
  };

  try {
    // Fetch the ticket to extract subject, description, tags
    const ticketResult = await callMCPTool(
      "zendesk",
      "get_ticket",
      { ticket_id: id },
      accessToken,
    );

    if (ticketResult.error) {
      insightsCache.set(id, { data: fallback, createdAt: Date.now() });
      return NextResponse.json(fallback);
    }

    let ticket: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(ticketResult.content?.[0]?.text ?? "{}");
      ticket = parsed.ticket ?? parsed;
    } catch {
      /* empty */
    }

    const subject = String(ticket.subject ?? "");
    const description = String(ticket.description ?? "");
    const tags = Array.isArray(ticket.tags) ? (ticket.tags as string[]) : [];

    // Build enriched search query: subject keywords + top tags + description phrases
    const subjectKeywords = subject
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);
    const tagKeywords = tags.slice(0, 3);
    const descriptionKeywords = description
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 5);
    const searchQuery = [
      ...new Set([...subjectKeywords, ...tagKeywords, ...descriptionKeywords]),
    ]
      .slice(0, 10)
      .join(" ");

    if (!searchQuery) {
      insightsCache.set(id, { data: fallback, createdAt: Date.now() });
      return NextResponse.json(fallback);
    }

    // Search SearchUnify + JIRA in parallel
    const [suResult, jiraSearchResult] = await Promise.all([
      callMCPTool("searchunify", "search", {
        searchString: searchQuery,
      }).catch(() => null),
      callMCPTool("jira-onprem", "search_issues", {
        jql: `text ~ "${id}" OR summary ~ "${searchQuery}"`,
        max_results: 10,
      }).catch(() => null),
    ]);

    let suResults: Record<string, unknown>[] = [];
    if (suResult && !suResult.error) {
      try {
        const parsed = JSON.parse(suResult.content?.[0]?.text ?? "[]");
        suResults = Array.isArray(parsed)
          ? parsed
          : (parsed.results ?? parsed.hits ?? []);
      } catch {
        /* empty */
      }
    }

    // Parse JIRA search results
    let jiraIssues: Array<{
      key: string;
      summary: string;
      status: string;
      priority: string;
      assignee: string;
      url: string;
    }> = [];
    if (jiraSearchResult && !jiraSearchResult.error) {
      try {
        const parsed = JSON.parse(jiraSearchResult.content?.[0]?.text ?? "{}");
        const issues = Array.isArray(parsed) ? parsed : (parsed.issues ?? []);
        jiraIssues = issues.map((issue: Record<string, unknown>) => ({
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

    // If both SearchUnify and JIRA returned nothing, return fallback
    if (suResults.length === 0 && jiraIssues.length === 0) {
      insightsCache.set(id, { data: fallback, createdAt: Date.now() });
      return NextResponse.json(fallback);
    }

    const similarCasesCount = suResults.length;

    // Extract common resolutions from result titles/snippets
    const resolutionMap = new Map<string, number>();
    for (const r of suResults) {
      const title = String(r.title ?? r.name ?? "").trim();
      const snippet = String(
        r.snippet ?? r.description ?? r.summary ?? "",
      ).trim();
      const text = title || snippet;
      if (!text) continue;

      // Normalize: lowercase, collapse whitespace
      const normalized = text.toLowerCase().replace(/\s+/g, " ").slice(0, 120);

      // Group by checking if a similar resolution already exists
      let matched = false;
      for (const [existing] of resolutionMap) {
        if (computeWordOverlap(existing, normalized) > 0.6) {
          resolutionMap.set(existing, (resolutionMap.get(existing) ?? 0) + 1);
          matched = true;
          break;
        }
      }
      if (!matched) {
        resolutionMap.set(normalized, 1);
      }
    }

    const commonResolutions = [...resolutionMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([description, frequency]) => ({
        description: description.charAt(0).toUpperCase() + description.slice(1),
        frequency,
      }));

    // ─── Engineering Issues: merge JIRA search + regex-extracted IDs ───

    // Start with JIRA issues found by direct search
    const engineeringIssues = new Map<
      string,
      { title: string; status: string; url?: string }
    >();

    for (const ji of jiraIssues) {
      if (ji.key) {
        engineeringIssues.set(ji.key, {
          title: ji.summary,
          status: ji.status,
          url: ji.url || undefined,
        });
      }
    }

    // Extract issue IDs from SearchUnify text + ticket text via regex
    const issuePattern = /\b([A-Z]+-\d+)\b/g;
    const regexExtractedIds = new Set<string>();

    for (const r of suResults) {
      const text = `${r.title ?? ""} ${r.snippet ?? ""} ${r.description ?? ""} ${r.body ?? ""}`;
      let match: RegExpExecArray | null;
      while ((match = issuePattern.exec(text)) !== null) {
        regexExtractedIds.add(match[1]);
      }
    }

    const ticketText = `${subject} ${description} ${tags.join(" ")}`;
    const ticketIssuePattern = /\b([A-Z]+-\d+)\b/g;
    let ticketMatch: RegExpExecArray | null;
    while ((ticketMatch = ticketIssuePattern.exec(ticketText)) !== null) {
      regexExtractedIds.add(ticketMatch[1]);
    }

    // For regex-extracted IDs not already in engineeringIssues, verify via JIRA
    const idsToVerify = [...regexExtractedIds].filter(
      (issueId) => !engineeringIssues.has(issueId),
    );

    if (idsToVerify.length > 0) {
      const verifyResults = await Promise.all(
        idsToVerify.slice(0, 5).map(async (issueId) => {
          try {
            const result = await callMCPTool("jira-onprem", "get_issue", {
              issue_key: issueId,
            });
            if (result.error) return null;
            const parsed = JSON.parse(result.content?.[0]?.text ?? "{}");
            return {
              key: String(parsed.key ?? issueId),
              summary: String(parsed.summary ?? issueId),
              status: String(parsed.status ?? "Open"),
              url: String(parsed.url ?? ""),
            };
          } catch {
            return null;
          }
        }),
      );

      for (const verified of verifyResults) {
        if (verified && !engineeringIssues.has(verified.key)) {
          engineeringIssues.set(verified.key, {
            title: verified.summary,
            status: verified.status,
            url: verified.url || undefined,
          });
        }
      }
    }

    const relatedEngineeringIssues = [...engineeringIssues.entries()]
      .slice(0, 10)
      .map(([issueId, info]) => ({
        id: issueId,
        title: info.title,
        status: info.status,
        url: info.url,
      }));

    // Compute confidence from average relevance scores
    const relevanceScores = suResults
      .map((r) => {
        const score = Number(r.relevance ?? r.score ?? r.confidence ?? 0);
        return isNaN(score) ? 0 : score;
      })
      .filter((s) => s > 0);

    let confidence = 0;
    if (relevanceScores.length > 0) {
      const avg =
        relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length;
      // Normalize: if scores are 0-1 use directly, if 0-100 divide by 100
      confidence = avg > 1 ? Math.min(avg / 100, 1) : Math.min(avg, 1);
    } else {
      // Heuristic: more results = higher confidence, capped at 0.7
      confidence = Math.min(0.3 + similarCasesCount * 0.05, 0.7);
    }
    confidence = Math.round(confidence * 100) / 100;

    // Build evidence sources from result metadata
    const evidenceSources: EvidenceSource[] = suResults
      .slice(0, 10)
      .map((r) => {
        const source = String(
          r.source ?? r.type ?? r.content_type ?? "",
        ).toLowerCase();
        let type: EvidenceSourceType = "kb";
        if (source.includes("ticket") || source.includes("zendesk")) {
          type = "ticket";
        } else if (source.includes("jira")) {
          type = "jira";
        } else if (source.includes("slack")) {
          type = "slack";
        } else if (source.includes("incident")) {
          type = "incident";
        }

        return {
          type,
          title: String(r.title ?? r.name ?? "Untitled"),
          id: String(r.id ?? r.uid ?? r.url ?? ""),
          url: r.url ? String(r.url) : undefined,
        };
      });

    // Add JIRA evidence sources for each engineering issue found
    const jiraEvidenceSources: EvidenceSource[] = relatedEngineeringIssues.map(
      (issue) => ({
        type: "jira" as EvidenceSourceType,
        title: issue.title,
        id: issue.id,
        url: issue.url,
      }),
    );

    const result: ResolutionInsight = {
      similarCasesCount,
      commonResolutions,
      relatedEngineeringIssues,
      confidence,
      evidenceSources: [...evidenceSources, ...jiraEvidenceSources],
    };

    insightsCache.set(id, { data: result, createdAt: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[resolution-insights] Error for ticket ${id}:`, message);
    insightsCache.set(id, { data: fallback, createdAt: Date.now() });
    return NextResponse.json(fallback);
  }
}

/**
 * Compute word overlap ratio between two strings (0-1).
 * Used for grouping similar resolutions together.
 */
function computeWordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}
