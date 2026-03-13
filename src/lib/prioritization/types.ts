/* ──────────────────────────────────────────────────────────────────────────
 * Prioritization Types — Rule definitions and scoring
 * ──────────────────────────────────────────────────────────────────────── */

/** A natural-language prioritization rule defined by the agent. */
export interface PrioritizationRule {
  id: string;
  /** Human-readable label (e.g., "Enterprise Accounts First"). */
  label: string;
  /** Natural-language description of the rule. */
  prompt: string;
  /** Weight multiplier (1.0 = normal, higher = more important). */
  weight: number;
  /** Whether this rule is currently active. */
  enabled: boolean;
  /** ISO timestamp of when the rule was created. */
  createdAt: string;
}

/** Score assigned to a ticket by the prioritization engine. */
export interface TicketScore {
  ticketId: string;
  /** Composite score (higher = more urgent). */
  score: number;
  /** Which rules contributed and how much. */
  ruleContributions: Array<{
    ruleId: string;
    ruleLabel: string;
    contribution: number;
  }>;
}
