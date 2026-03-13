import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

interface TimelineEvent {
  id: string;
  type: "customer_reply" | "agent_reply" | "status_change" | "internal_note";
  author: string;
  timestamp: string;
  text: string;
}

/**
 * GET /api/tickets/[id]/timeline
 * Fetches ticket comments and maps them to timeline events.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let accessToken: string | undefined;
  try {
    const session = await auth();
    accessToken = session?.accessToken ?? undefined;
  } catch {
    // No session
  }

  try {
    const result = await callMCPTool(
      "zendesk",
      "get_ticket_comments",
      { ticket_id: id },
      accessToken,
    );

    if (result.error) {
      return NextResponse.json(
        { events: [], error: "zendesk_unreachable", message: result.error },
        { status: 502 },
      );
    }

    const rawText = result.content?.[0]?.text ?? "[]";
    let rawComments: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(rawText);
      rawComments = Array.isArray(parsed)
        ? parsed
        : (parsed.comments ?? parsed.results ?? []);
    } catch {
      rawComments = [];
    }

    const events: TimelineEvent[] = rawComments.map(
      (comment: Record<string, unknown>, index: number) => {
        const isPublic = comment.public !== false;
        const authorName = String(
          (comment.author as Record<string, unknown>)?.name ??
            comment.author_name ??
            comment.author_id ??
            "Unknown",
        );

        // Determine event type based on comment properties
        let type: TimelineEvent["type"];
        if (!isPublic) {
          type = "internal_note";
        } else if (
          comment.author_role === "end-user" ||
          comment.via_channel === "web" ||
          comment.is_requester
        ) {
          type = "customer_reply";
        } else {
          type = "agent_reply";
        }

        const createdAt = String(
          comment.created_at ?? new Date().toISOString(),
        );

        return {
          id: String(comment.id ?? `evt-${index}`),
          type,
          author: authorName,
          timestamp: formatRelativeTime(createdAt),
          text: truncateText(
            String(comment.body ?? comment.plain_body ?? ""),
            300,
          ),
        };
      },
    );

    return NextResponse.json({ events, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { events: [], error: "zendesk_unreachable", message },
      { status: 502 },
    );
  }
}

function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return isoDate;
  }
}

function truncateText(text: string, maxLen: number): string {
  // Strip HTML tags
  const clean = text.replace(/<[^>]*>/g, "").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + "...";
}
