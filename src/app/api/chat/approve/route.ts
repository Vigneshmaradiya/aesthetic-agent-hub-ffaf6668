import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pendingApprovals } from "@/lib/llm/hitl-approvals";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  actionId: z.string().min(1),
  approved: z.boolean(),
});

/**
 * HITL Approval Endpoint.
 *
 * The agent loop registers a pending approval (Promise) in the shared
 * `pendingApprovals` Map when a tool call requires HITL approval.
 *
 * The client calls this endpoint to resolve that Promise, unblocking
 * the agent loop to either execute or skip the tool.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = approveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { actionId, approved } = parsed.data;
  const pending = pendingApprovals.get(actionId);

  if (!pending) {
    return NextResponse.json(
      {
        error:
          "No pending approval found for this action. It may have timed out.",
      },
      { status: 404 },
    );
  }

  // Clear the timeout and resolve the promise
  clearTimeout(pending.timeout);
  pending.resolve(approved);
  pendingApprovals.delete(actionId);

  return NextResponse.json({
    actionId,
    approved,
    message: approved ? "Action approved" : "Action rejected",
  });
}
