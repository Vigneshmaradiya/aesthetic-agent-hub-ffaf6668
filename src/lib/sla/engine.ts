/* ──────────────────────────────────────────────────────────────────────────
 * SLA Engine — Policy storage, timer computation, breach detection
 *
 * Policies are stored in-memory using the globalThis pattern (survives HMR).
 * No persistent storage per architecture constraints.
 * ──────────────────────────────────────────────────────────────────────── */

import type {
  SLAPolicy,
  SLAPriority,
  SLAPolicyType,
  SLATimer,
  SLABreachLevel,
  SLASummary,
} from "./types";

// ─── globalThis persistence (survives HMR in dev) ──────────────────────

const GLOBAL_KEY = "__nexus_sla_policies__";

function getPoliciesMap(): Map<string, SLAPolicy> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, SLAPolicy>();
    // Seed default policies on first access
    for (const p of DEFAULT_POLICIES) {
      (g[GLOBAL_KEY] as Map<string, SLAPolicy>).set(p.id, p);
    }
  }
  return g[GLOBAL_KEY] as Map<string, SLAPolicy>;
}

// ─── Default SLA Policies (from additional_features.md) ────────────────

const DEFAULT_POLICIES: SLAPolicy[] = [
  // First Response SLAs
  {
    id: "fr-high",
    name: "First Response — High",
    type: "first_response",
    priority: "high",
    targetMinutes: 45,
    enabled: true,
  },
  {
    id: "fr-medium",
    name: "First Response — Medium",
    type: "first_response",
    priority: "medium",
    targetMinutes: 240, // 4 hours
    enabled: true,
  },
  {
    id: "fr-low",
    name: "First Response — Low",
    type: "first_response",
    priority: "low",
    targetMinutes: 1440, // 24 hours
    enabled: true,
  },
  // Customer Update SLA (no update for > 2 days)
  {
    id: "cu-high",
    name: "Customer Update — High",
    type: "customer_update",
    priority: "high",
    targetMinutes: 1440, // 24 hours
    enabled: true,
  },
  {
    id: "cu-medium",
    name: "Customer Update — Medium",
    type: "customer_update",
    priority: "medium",
    targetMinutes: 2880, // 48 hours
    enabled: true,
  },
  {
    id: "cu-low",
    name: "Customer Update — Low",
    type: "customer_update",
    priority: "low",
    targetMinutes: 2880, // 48 hours
    enabled: true,
  },
];

// ─── Policy CRUD ────────────────────────────────────────────────────────

export function getAllPolicies(): SLAPolicy[] {
  return Array.from(getPoliciesMap().values());
}

export function getPolicy(id: string): SLAPolicy | undefined {
  return getPoliciesMap().get(id);
}

export function upsertPolicy(policy: SLAPolicy): void {
  getPoliciesMap().set(policy.id, policy);
}

export function deletePolicy(id: string): boolean {
  return getPoliciesMap().delete(id);
}

export function resetToDefaults(): void {
  const map = getPoliciesMap();
  map.clear();
  for (const p of DEFAULT_POLICIES) {
    map.set(p.id, p);
  }
}

// ─── Policy Matching ────────────────────────────────────────────────────

/**
 * Find all active policies that apply to a ticket's priority.
 */
export function getApplicablePolicies(priority: string): SLAPolicy[] {
  const normalizedPriority = normalizePriority(priority);
  return getAllPolicies().filter(
    (p) => p.enabled && p.priority === normalizedPriority,
  );
}

function normalizePriority(priority: string): SLAPriority {
  const lower = priority.toLowerCase();
  if (lower === "high" || lower === "urgent") return "high";
  if (lower === "medium" || lower === "normal") return "medium";
  return "low";
}

// ─── Timer Computation ──────────────────────────────────────────────────

/**
 * Compute breach level based on remaining percentage of target time.
 * - breached: past deadline (remaining <= 0)
 * - critical: < 15% remaining
 * - warning: < 40% remaining
 * - safe: >= 40% remaining
 */
export function computeBreachLevel(
  remainingMinutes: number,
  targetMinutes: number,
): SLABreachLevel {
  if (remainingMinutes <= 0) return "breached";
  const pct = remainingMinutes / targetMinutes;
  if (pct < 0.15) return "critical";
  if (pct < 0.4) return "warning";
  return "safe";
}

/**
 * Compute SLA timers for a ticket given its timestamps and applicable policies.
 */
export function computeTimers(params: {
  ticketId: string;
  priority: string;
  createdAt: string;
  /** Timestamp of the first agent reply, if any. */
  firstResponseAt?: string;
  /** Timestamp of the most recent customer-facing update. */
  lastCustomerUpdateAt?: string;
  /** Whether the ticket is already resolved/closed. */
  isResolved?: boolean;
}): SLATimer[] {
  const {
    ticketId,
    priority,
    createdAt,
    firstResponseAt,
    lastCustomerUpdateAt,
    isResolved,
  } = params;

  // Resolved tickets have no active SLA timers
  if (isResolved) return [];

  const policies = getApplicablePolicies(priority);
  const now = Date.now();
  const timers: SLATimer[] = [];

  for (const policy of policies) {
    let startedAt: string;
    let fulfilled = false;

    switch (policy.type) {
      case "first_response":
        startedAt = createdAt;
        fulfilled = !!firstResponseAt;
        break;
      case "customer_update":
        // Clock starts from the last customer update, or ticket creation
        startedAt = lastCustomerUpdateAt || createdAt;
        break;
      case "next_reply":
        // Similar to customer_update
        startedAt = lastCustomerUpdateAt || createdAt;
        break;
      case "resolution":
        startedAt = createdAt;
        break;
      default:
        continue;
    }

    // Skip fulfilled SLAs (e.g., first response already sent)
    if (fulfilled) continue;

    const startMs = new Date(startedAt).getTime();
    if (isNaN(startMs)) continue;

    const deadlineMs = startMs + policy.targetMinutes * 60 * 1000;
    const remainingMinutes = Math.round((deadlineMs - now) / (60 * 1000));
    const breachLevel = computeBreachLevel(remainingMinutes, policy.targetMinutes);

    timers.push({
      policyId: policy.id,
      policyName: policy.name,
      policyType: policy.type,
      ticketId,
      startedAt,
      deadline: new Date(deadlineMs).toISOString(),
      remainingMinutes,
      breachLevel,
      fulfilled: false,
    });
  }

  return timers;
}

/**
 * Get the most urgent timer for a ticket (closest to breach / already breached).
 */
export function getMostUrgentTimer(timers: SLATimer[]): SLATimer | null {
  if (timers.length === 0) return null;
  return timers.reduce((most, t) =>
    t.remainingMinutes < most.remainingMinutes ? t : most,
  );
}

/**
 * Format remaining minutes as human-readable string.
 */
export function formatRemaining(minutes: number): string {
  if (minutes <= 0) {
    const over = Math.abs(minutes);
    if (over < 60) return `${over}m overdue`;
    if (over < 1440) return `${Math.floor(over / 60)}h overdue`;
    return `${Math.floor(over / 1440)}d overdue`;
  }
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days}d ${hours}h`;
}

/**
 * Compute a summary of SLA status across multiple tickets' timers.
 */
export function computeSummary(allTimers: SLATimer[]): SLASummary {
  const active = allTimers.filter((t) => !t.fulfilled);
  return {
    totalActive: active.length,
    breached: active.filter((t) => t.breachLevel === "breached").length,
    critical: active.filter((t) => t.breachLevel === "critical").length,
    warning: active.filter((t) => t.breachLevel === "warning").length,
    safe: active.filter((t) => t.breachLevel === "safe").length,
  };
}
