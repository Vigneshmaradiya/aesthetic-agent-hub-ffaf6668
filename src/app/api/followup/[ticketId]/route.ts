import { NextRequest, NextResponse } from "next/server";
import {
  getFollowUpState,
  initFollowUp,
  getNextAction,
  advanceFollowUp,
  approveClose,
  clearFollowUp,
} from "@/lib/followup/engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/followup/[ticketId]
 * Get follow-up status for a ticket.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;

  const state = getFollowUpState(ticketId);
  if (!state) {
    return NextResponse.json({ state: null, nextAction: null });
  }

  const nextAction = getNextAction(ticketId);
  return NextResponse.json({ state, nextAction });
}

/**
 * POST /api/followup/[ticketId]
 * Perform follow-up actions on a ticket.
 *
 * Body: { action: "init" }      — start tracking follow-ups for this ticket
 * Body: { action: "advance" }   — advance to next follow-up stage (after HITL approval)
 * Body: { action: "approve_close" } — approve the close suggestion
 * Body: { action: "clear" }     — stop tracking (customer responded or ticket resolved)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const action = body.action as string;

  switch (action) {
    case "init": {
      const state = initFollowUp(ticketId);
      const nextAction = getNextAction(ticketId);
      return NextResponse.json({ state, nextAction });
    }
    case "advance": {
      const state = advanceFollowUp(ticketId);
      if (!state) {
        return NextResponse.json(
          { error: "No follow-up state found for this ticket." },
          { status: 404 },
        );
      }
      const nextAction = getNextAction(ticketId);
      return NextResponse.json({ state, nextAction });
    }
    case "approve_close": {
      const state = approveClose(ticketId);
      if (!state) {
        return NextResponse.json(
          { error: "Ticket is not in close_suggest stage." },
          { status: 400 },
        );
      }
      return NextResponse.json({ state });
    }
    case "clear": {
      clearFollowUp(ticketId);
      return NextResponse.json({ state: null });
    }
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}. Valid: init, advance, approve_close, clear` },
        { status: 400 },
      );
  }
}
