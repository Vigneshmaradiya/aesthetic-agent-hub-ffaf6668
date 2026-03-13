import { NextRequest, NextResponse } from "next/server";
import {
  getFollowUpConfig,
  updateFollowUpConfig,
  resetFollowUpConfig,
} from "@/lib/followup/engine";
import type { FollowUpConfig } from "@/lib/followup/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/followup/config
 * Returns the current follow-up configuration.
 */
export async function GET() {
  return NextResponse.json({ config: getFollowUpConfig() });
}

/**
 * PUT /api/followup/config
 * Update follow-up configuration.
 *
 * Body: { config: Partial<FollowUpConfig> } — partial update
 * Body: { reset: true }                      — reset to defaults
 */
export async function PUT(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;

  if (body.reset === true) {
    const config = resetFollowUpConfig();
    return NextResponse.json({ config });
  }

  const updates = body.config as Partial<FollowUpConfig> | undefined;
  if (!updates || typeof updates !== "object") {
    return NextResponse.json(
      { error: "config object is required." },
      { status: 400 },
    );
  }

  const config = updateFollowUpConfig(updates);
  return NextResponse.json({ config });
}
