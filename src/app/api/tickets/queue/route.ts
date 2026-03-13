import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";
import { getUsers, getOrganizations } from "@/lib/zendesk/api";

export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ─── Types ──────────────────────────────────────────────────────────

type TicketStatus = "new" | "open" | "pending" | "hold" | "solved" | "closed";

type MappedTicket = {
  id: string;
  subject: string;
  priority: "high" | "medium" | "low";
  status: TicketStatus;
  requester: { name: string; email: string };
  organization?: string;
  createdAt: string;
  tags: string[];
  sentiment?: "positive" | "neutral" | "negative" | "angry";
  lastCommentIsCustomer?: boolean;
  /** @internal — stripped before response */
  _requesterId?: number;
  /** @internal — stripped before response */
  _organizationId?: number;
};

const DEFAULT_QUERY_MINE = "status<solved assignee:me";
const DEFAULT_QUERY_ALL = "status<solved";
const MAX_QUERY_LENGTH = 500;

/**
 * GET /api/tickets/queue
 * Fetches open/pending tickets assigned to the current user from Zendesk MCP.
 * Sorted by priority (desc), then date (older first).
 * Enriched with requester names, org names, sentiment, and awaiting-reply flag.
 *
 * Supports an optional `query` search param for custom agent views.
 * If omitted, falls back to the default system query.
 */
export async function GET(request: NextRequest) {
  // Check auth
  let accessToken: string | undefined;
  try {
    const session = await auth();
    accessToken = session?.accessToken ?? undefined;
  } catch {
    // No session
  }

  // Check if Zendesk is configured
  if (!process.env.ZENDESK_SUBDOMAIN && !process.env.MCP_ZENDESK_URL) {
    return NextResponse.json({
      tickets: [],
      error: "zendesk_not_configured",
      message:
        "Zendesk is not configured. Set ZENDESK_SUBDOMAIN and OAuth credentials in .env.local",
    });
  }

  // Read optional custom query from agent view bookmarks
  const customQuery = request.nextUrl.searchParams.get("query");
  const scope = request.nextUrl.searchParams.get("scope"); // "all" | "mine" (default)
  const defaultQuery =
    scope === "all" ? DEFAULT_QUERY_ALL : DEFAULT_QUERY_MINE;
  const query =
    customQuery && customQuery.length <= MAX_QUERY_LENGTH
      ? customQuery
      : defaultQuery;

  try {
    // Fetch all pages (Zendesk caps at 100 per page)
    const rawTickets = await fetchAllPages(query, accessToken);

    // Map to internal ticket format (preserving IDs for batch lookup)
    const tickets: MappedTicket[] = rawTickets.map(
      (t: Record<string, unknown>) => ({
        id: String(t.id ?? ""),
        subject: String(t.subject ?? "Untitled"),
        priority: normalizePriority(String(t.priority ?? "normal")),
        status: normalizeStatus(String(t.status ?? "open")),
        requester: {
          name: String(
            (t.requester as Record<string, unknown>)?.name ??
              t.requester_name ??
              "Unknown",
          ),
          email: String(
            (t.requester as Record<string, unknown>)?.email ??
              t.requester_email ??
              "",
          ),
        },
        createdAt: String(t.created_at ?? new Date().toISOString()),
        tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
        _requesterId:
          typeof t.requester_id === "number" ? t.requester_id : undefined,
        _organizationId:
          typeof t.organization_id === "number" ? t.organization_id : undefined,
      }),
    );

    // Sort: priority (high first) → date (older first)
    tickets.sort((a, b) => {
      const pDiff =
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Batch-resolve requester names + organization names (best-effort)
    const withRequesterInfo = await resolveRequesterInfo(tickets, accessToken);

    // Open/new tickets need a support engineer reply
    const enriched = withRequesterInfo.map((t) => ({
      ...t,
      lastCommentIsCustomer: t.status === "open" || t.status === "new",
    }));

    // Strip internal fields before returning
    const cleaned = enriched.map((t) =>
      Object.fromEntries(
        Object.entries(t).filter(
          ([k]) => k !== "_requesterId" && k !== "_organizationId",
        ),
      ),
    );

    return NextResponse.json({ tickets: cleaned, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      tickets: [],
      error: "zendesk_unreachable",
      message,
    });
  }
}

// ─── Pagination Helper ──────────────────────────────────────────────

const MAX_PER_PAGE = 100; // Zendesk caps at 100
const MAX_PAGES = 5; // Safety limit — 500 tickets max

/**
 * Fetch all pages of search results from Zendesk MCP.
 * Zendesk search_tickets returns max 100 per page, so we paginate
 * until we have all results or hit the safety cap.
 */
async function fetchAllPages(
  query: string,
  accessToken?: string,
): Promise<Record<string, unknown>[]> {
  const allTickets: Record<string, unknown>[] = [];
  let page = 1;
  let totalCount = Infinity;

  while (allTickets.length < totalCount && page <= MAX_PAGES) {
    const result = await callMCPTool(
      "zendesk",
      "search_tickets",
      { query, per_page: MAX_PER_PAGE, page },
      accessToken,
    );

    // Detect both network-level errors (result.error) and MCP tool-level
    // errors (result.isError — auth failures, Zendesk API errors, etc.)
    const toolErrorText =
      result.error ??
      (result.isError
        ? (() => {
            try {
              const parsed = JSON.parse(
                result.content?.[0]?.text ?? "{}",
              ) as Record<string, unknown>;
              return String(parsed.error ?? result.content?.[0]?.text ?? "");
            } catch {
              return result.content?.[0]?.text ?? "MCP tool error";
            }
          })()
        : null);

    if (toolErrorText) {
      // If first page fails, throw so caller returns zendesk_unreachable
      if (page === 1) {
        throw new Error(toolErrorText);
      }
      // Later pages fail → return what we have
      break;
    }

    const raw = JSON.parse(result.content?.[0]?.text ?? "{}");
    const pageResults: Record<string, unknown>[] = Array.isArray(raw)
      ? raw
      : (raw.results ?? raw.tickets ?? []);

    if (pageResults.length === 0) break;

    allTickets.push(...pageResults);

    // Zendesk search response includes `count` for total matching results
    if (typeof raw.count === "number") {
      totalCount = raw.count;
    } else {
      // No count info — assume single page
      break;
    }

    page++;
  }

  return allTickets;
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalizePriority(p: string): "high" | "medium" | "low" {
  const lower = p.toLowerCase();
  if (lower === "urgent" || lower === "high") return "high";
  if (lower === "normal" || lower === "medium") return "medium";
  return "low";
}

const VALID_STATUSES: TicketStatus[] = [
  "new",
  "open",
  "pending",
  "hold",
  "solved",
  "closed",
];

function normalizeStatus(s: string): TicketStatus {
  const lower = s.toLowerCase() as TicketStatus;
  return VALID_STATUSES.includes(lower) ? lower : "open";
}

// ─── Batch Requester + Organization Resolution ──────────────────────

/**
 * Batch-fetch requester names and organization names using Zendesk REST API.
 * Makes 2 API calls total: one for users, one for organizations.
 * Falls back gracefully on any failure (keeps "Unknown" names, omits org).
 */
async function resolveRequesterInfo(
  tickets: MappedTicket[],
  accessToken?: string,
): Promise<MappedTicket[]> {
  // Collect requester IDs that need resolution
  const idsToResolve = tickets
    .filter((t) => t.requester.name === "Unknown" && t._requesterId)
    .map((t) => t._requesterId!);

  if (idsToResolve.length === 0) return tickets;

  try {
    // Step 1: Batch-fetch users
    const { users } = await getUsers(idsToResolve, accessToken);
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Step 2: Batch-fetch organizations from user org IDs
    const orgIds = users
      .map((u) => u.organization_id)
      .filter((id): id is number => typeof id === "number" && id > 0);

    let orgMap = new Map<number, string>();
    if (orgIds.length > 0) {
      try {
        const { organizations } = await getOrganizations(orgIds, accessToken);
        orgMap = new Map(organizations.map((o) => [o.id, o.name]));
      } catch (error) {
        console.error(
          "[queue] Organization resolution failed:",
          error instanceof Error ? error.message : error,
        );
        // Continue without org names
      }
    }

    // Step 3: Merge into tickets
    return tickets.map((t) => {
      if (!t._requesterId) return t;
      const user = userMap.get(t._requesterId);
      if (!user) return t;

      const orgName = user.organization_id && orgMap.get(user.organization_id);

      return {
        ...t,
        requester: {
          name: user.name || t.requester.name,
          email: user.email || t.requester.email,
        },
        ...(orgName ? { organization: orgName } : {}),
      };
    });
  } catch (error) {
    console.error(
      "[queue] Requester info resolution failed:",
      error instanceof Error ? error.message : error,
    );
    return tickets; // Graceful degradation
  }
}
