import { NextRequest, NextResponse } from "next/server";
import {
  getAllRules,
  upsertRule,
  deleteRule,
  resetToDefaults,
} from "@/lib/prioritization/engine";
import type { PrioritizationRule } from "@/lib/prioritization/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/prioritization/rules
 * Returns all prioritization rules.
 */
export async function GET() {
  return NextResponse.json({ rules: getAllRules() });
}

/**
 * PUT /api/prioritization/rules
 * Upsert a single rule or reset all to defaults.
 *
 * Body: { rule: PrioritizationRule } — upsert one rule
 * Body: { reset: true }              — reset all to defaults
 */
export async function PUT(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;

  if (body.reset === true) {
    resetToDefaults();
    return NextResponse.json({ rules: getAllRules() });
  }

  const rule = body.rule as PrioritizationRule | undefined;
  if (!rule?.id || !rule.prompt) {
    return NextResponse.json(
      { error: "Invalid rule: id and prompt are required." },
      { status: 400 },
    );
  }

  // Set defaults
  if (!rule.label) rule.label = rule.prompt.slice(0, 50);
  if (!rule.weight) rule.weight = 1.0;
  if (rule.enabled === undefined) rule.enabled = true;
  if (!rule.createdAt) rule.createdAt = new Date().toISOString();

  upsertRule(rule);
  return NextResponse.json({ rule, rules: getAllRules() });
}

/**
 * DELETE /api/prioritization/rules
 * Delete a rule by ID.
 *
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const id = body.id as string | undefined;

  if (!id) {
    return NextResponse.json(
      { error: "Rule id is required." },
      { status: 400 },
    );
  }

  const deleted = deleteRule(id);
  if (!deleted) {
    return NextResponse.json(
      { error: `Rule ${id} not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ deleted: id, rules: getAllRules() });
}
