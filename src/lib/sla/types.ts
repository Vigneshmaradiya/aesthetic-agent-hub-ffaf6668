/* ──────────────────────────────────────────────────────────────────────────
 * SLA Types — Policy definitions, timer state, and breach levels
 * ──────────────────────────────────────────────────────────────────────── */

/** The type of SLA policy (what event triggers the timer). */
export type SLAPolicyType =
  | "first_response"    // Time until first agent reply
  | "next_reply"        // Time until next agent reply after customer message
  | "customer_update"   // Max time without any customer-facing update
  | "resolution";       // Total time to resolve the ticket

/** Priority levels used for SLA policy matching. */
export type SLAPriority = "high" | "medium" | "low";

/** Breach severity for display purposes. */
export type SLABreachLevel = "safe" | "warning" | "critical" | "breached";

/** A single SLA policy rule (e.g., "First response for high priority = 45 min"). */
export interface SLAPolicy {
  id: string;
  name: string;
  type: SLAPolicyType;
  priority: SLAPriority;
  /** Target time in minutes. */
  targetMinutes: number;
  /** Whether this policy is currently active. */
  enabled: boolean;
}

/** Computed SLA timer state for a specific ticket + policy. */
export interface SLATimer {
  policyId: string;
  policyName: string;
  policyType: SLAPolicyType;
  ticketId: string;
  /** When the SLA clock started (ISO timestamp). */
  startedAt: string;
  /** Target deadline (ISO timestamp). */
  deadline: string;
  /** Minutes remaining (negative = breached). */
  remainingMinutes: number;
  /** Current breach level based on remaining time. */
  breachLevel: SLABreachLevel;
  /** Whether the SLA has been fulfilled (e.g., first response was sent). */
  fulfilled: boolean;
}

/** Summary of SLA status across all tickets for the dashboard. */
export interface SLASummary {
  totalActive: number;
  breached: number;
  critical: number;
  warning: number;
  safe: number;
}
