import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/[id]
 * Fetches a single ticket's details from Zendesk MCP.
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
      "get_ticket",
      { ticket_id: id },
      accessToken,
    );

    if (result.error) {
      return NextResponse.json(
        { error: "zendesk_unreachable", message: result.error },
        { status: 502 },
      );
    }

    const rawText = result.content?.[0]?.text ?? "{}";
    let ticket: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawText);
      ticket = parsed.ticket ?? parsed;
    } catch {
      ticket = {};
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "zendesk_unreachable", message },
      { status: 502 },
    );
  }
}
