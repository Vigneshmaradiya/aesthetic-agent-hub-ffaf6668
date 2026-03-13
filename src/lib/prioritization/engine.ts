/* ──────────────────────────────────────────────────────────────────────────
 * Prioritization Engine — Rule storage and ticket scoring
 *
 * Rules are stored in-memory using the globalThis pattern (survives HMR).
 * LLM-based scoring is handled by the API route, not here.
 * ──────────────────────────────────────────────────────────────────────── */

import type { PrioritizationRule } from "./types";

// ─── globalThis persistence ─────────────────────────────────────────────

const GLOBAL_KEY = "__nexus_prioritization_rules__";

function getRulesMap(): Map<string, PrioritizationRule> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, PrioritizationRule>();
    // Seed default rules
    for (const r of DEFAULT_RULES) {
      (g[GLOBAL_KEY] as Map<string, PrioritizationRule>).set(r.id, r);
    }
  }
  return g[GLOBAL_KEY] as Map<string, PrioritizationRule>;
}

// ─── Default Rules ──────────────────────────────────────────────────────

const DEFAULT_RULES: PrioritizationRule[] = [
  {
    id: "pr-sla-breach",
    label: "SLA Breach Risk",
    prompt: "Prioritize tickets that are close to or have already breached their SLA deadlines.",
    weight: 2.0,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "pr-negative-sentiment",
    label: "Negative Sentiment",
    prompt: "Prioritize tickets where the customer sentiment is angry or negative.",
    weight: 1.5,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "pr-awaiting-reply",
    label: "Awaiting Agent Reply",
    prompt: "Prioritize tickets where the last comment is from the customer and they are waiting for an agent reply.",
    weight: 1.3,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

// ─── Rule CRUD ──────────────────────────────────────────────────────────

export function getAllRules(): PrioritizationRule[] {
  return Array.from(getRulesMap().values());
}

export function getActiveRules(): PrioritizationRule[] {
  return getAllRules().filter((r) => r.enabled);
}

export function getRule(id: string): PrioritizationRule | undefined {
  return getRulesMap().get(id);
}

export function upsertRule(rule: PrioritizationRule): void {
  getRulesMap().set(rule.id, rule);
}

export function deleteRule(id: string): boolean {
  return getRulesMap().delete(id);
}

export function resetToDefaults(): void {
  const map = getRulesMap();
  map.clear();
  for (const r of DEFAULT_RULES) {
    map.set(r.id, r);
  }
}

// ─── Build LLM Prompt ──────────────────────────────────────────────────

/**
 * Build the system prompt for LLM-based ticket scoring.
 * The LLM receives the active rules and a batch of tickets,
 * then returns scores for each ticket.
 */
export function buildScoringPrompt(
  rules: PrioritizationRule[],
): string {
  const ruleDescriptions = rules
    .map((r, i) => `${i + 1}. "${r.label}" (weight: ${r.weight}): ${r.prompt}`)
    .join("\n");

  return `You are a ticket prioritization engine. Score each ticket based on the prioritization rules below.

## Active Prioritization Rules
${ruleDescriptions}

## Scoring Instructions
- For each ticket, evaluate how well it matches each rule on a 0-10 scale.
- Multiply by the rule's weight.
- Sum all weighted scores for the ticket's composite score.
- Return ONLY valid JSON (no markdown, no code blocks).

## Response Format
{"scores":[{"ticketId":"123","score":85.5,"ruleContributions":[{"ruleId":"pr-sla-breach","ruleLabel":"SLA Breach Risk","contribution":40}]}]}`;
}
