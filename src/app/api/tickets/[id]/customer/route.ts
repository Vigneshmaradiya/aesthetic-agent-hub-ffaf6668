import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

// In-memory cache
const customerCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/customer
 * Fetches customer profile based on the ticket requester.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check cache
  const cached = customerCache.get(id);
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
    // Get the ticket to find the requester
    const ticketResult = await callMCPTool(
      "zendesk",
      "get_ticket",
      { ticket_id: id },
      accessToken,
    );

    if (ticketResult.error || ticketResult.isError) {
      return NextResponse.json(
        { error: "zendesk_unreachable" },
        { status: 502 },
      );
    }

    let ticket: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(ticketResult.content?.[0]?.text ?? "{}");
      ticket = parsed.ticket ?? parsed;
      // Detect MCP-level error wrapped in content (e.g. auth failure)
      if (
        !parsed.ticket &&
        typeof parsed.error === "string" &&
        !parsed.requester_id
      ) {
        return NextResponse.json(
          { error: "zendesk_unreachable" },
          { status: 502 },
        );
      }
    } catch {
      /* empty */
    }

    // Extract requester from enriched ticket (MCP embeds requester from side-loaded users)
    const requester = ticket.requester as Record<string, unknown> | undefined;
    // Also check side-loaded users array for requester info
    let parsedUsers: Record<string, unknown>[] = [];
    try {
      const parsed = JSON.parse(ticketResult.content?.[0]?.text ?? "{}");
      parsedUsers = Array.isArray(parsed.users) ? parsed.users : [];
    } catch {
      /* empty */
    }
    const requesterId = String(requester?.id ?? ticket.requester_id ?? "");
    // If requester wasn't enriched, find from side-loaded users
    const resolvedRequester =
      requester ??
      parsedUsers.find((u) => String(u.id) === requesterId) ??
      undefined;

    if (!requesterId) {
      return NextResponse.json({ error: "no_requester" }, { status: 404 });
    }

    // Search for other tickets by this requester
    const searchResult = await callMCPTool(
      "zendesk",
      "search_tickets",
      { query: `requester_id:${requesterId}`, limit: 50 },
      accessToken,
    ).catch(() => null);

    let customerTickets: Record<string, unknown>[] = [];
    if (searchResult && !searchResult.error) {
      try {
        const parsed = JSON.parse(searchResult.content?.[0]?.text ?? "[]");
        customerTickets = Array.isArray(parsed)
          ? parsed
          : (parsed.results ?? parsed.tickets ?? []);
      } catch {
        /* empty */
      }
    }

    const openTickets = customerTickets.filter(
      (t) => t.status !== "solved" && t.status !== "closed",
    ).length;

    // Determine sentiment from recent tickets
    const recentStatuses = customerTickets
      .slice(0, 10)
      .map((t) => String(t.priority ?? "normal"));
    const urgentCount = recentStatuses.filter(
      (s) => s === "urgent" || s === "high",
    ).length;
    const sentiment =
      urgentCount >= 3 ? "angry" : urgentCount >= 1 ? "negative" : "neutral";

    // Collect unique tags
    const allTags = customerTickets.flatMap((t) =>
      Array.isArray(t.tags) ? (t.tags as string[]) : [],
    );
    const tagCounts = new Map<string, number>();
    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Resolve organization name from enriched ticket data
    const org = String(
      resolvedRequester?.organization_name ?? ticket.organization_name ?? "",
    );
    const tier = topTags.includes("enterprise")
      ? "Enterprise"
      : topTags.includes("premium")
        ? "Premium"
        : customerTickets.length > 20
          ? "Premium"
          : "Standard";

    // Extract ARR from tags or custom_fields (look for tags matching arr_* pattern)
    const arrTag = allTags.find((t) => /^arr_/i.test(t));
    let arr: number | undefined;
    if (arrTag) {
      const arrValue = Number(
        arrTag.replace(/^arr_/i, "").replace(/[^0-9.]/g, ""),
      );
      if (!isNaN(arrValue) && arrValue > 0) {
        arr = arrValue;
      }
    }
    // Fallback: estimate based on tier if no explicit arr tag
    if (arr === undefined) {
      const ticketTags = Array.isArray(ticket.tags)
        ? (ticket.tags as string[])
        : [];
      const ticketArrTag = ticketTags.find((t) => /^arr_/i.test(t));
      if (ticketArrTag) {
        const arrValue = Number(
          ticketArrTag.replace(/^arr_/i, "").replace(/[^0-9.]/g, ""),
        );
        if (!isNaN(arrValue) && arrValue > 0) {
          arr = arrValue;
        }
      }
      // Check custom fields for ARR
      if (arr === undefined) {
        const customFields = Array.isArray(ticket.custom_fields)
          ? (ticket.custom_fields as Record<string, unknown>[])
          : [];
        for (const field of customFields) {
          const fieldId = String(field.id ?? field.name ?? "").toLowerCase();
          if (fieldId.includes("arr") || fieldId.includes("revenue")) {
            const val = Number(field.value);
            if (!isNaN(val) && val > 0) {
              arr = val;
              break;
            }
          }
        }
      }
      // Default based on tier
      if (arr === undefined) {
        switch (tier) {
          case "Enterprise":
            arr = 100000;
            break;
          case "Premium":
            arr = 25000;
            break;
          default:
            arr = 5000;
            break;
        }
      }
    }

    // Build recentIncidents from customerTickets: urgent/high priority in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentIncidents = customerTickets
      .filter((t) => {
        const priority = String(t.priority ?? "").toLowerCase();
        if (priority !== "urgent" && priority !== "high") return false;
        const createdAt = t.created_at ?? t.createdAt;
        if (!createdAt) return false;
        const ticketDate = new Date(String(createdAt));
        return ticketDate >= thirtyDaysAgo;
      })
      .slice(0, 10)
      .map((t) => ({
        id: String(t.id ?? ""),
        title: String(t.subject ?? "Untitled"),
        date: String(t.created_at ?? t.createdAt ?? ""),
        status: String(t.status ?? "open"),
      }));

    const result = {
      name: String(
        resolvedRequester?.name ?? ticket.requester_name ?? "Unknown",
      ),
      email: String(resolvedRequester?.email ?? ticket.requester_email ?? ""),
      org,
      tier,
      openTickets,
      totalTickets: customerTickets.length,
      sentiment,
      tags: topTags,
      arr,
      recentIncidents,
    };

    customerCache.set(id, { data: result, createdAt: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "customer_fetch_failed", message },
      { status: 502 },
    );
  }
}
