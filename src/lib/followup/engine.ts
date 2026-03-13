/* ──────────────────────────────────────────────────────────────────────────
 * Follow-Up Engine — Automated follow-up state machine
 *
 * State is stored in-memory using the globalThis pattern.
 * The workflow: Awaiting Response → reminder1 → reminder2 → close_suggest
 * Agent must approve each action (HITL pattern).
 * ──────────────────────────────────────────────────────────────────────── */

import type { FollowUpState, FollowUpConfig, FollowUpStage } from "./types";

// ─── globalThis persistence ─────────────────────────────────────────────

const CONFIG_KEY = "__nexus_followup_config__";
const STATE_KEY = "__nexus_followup_states__";

function getConfig(): FollowUpConfig {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[CONFIG_KEY]) {
    g[CONFIG_KEY] = { ...DEFAULT_CONFIG };
  }
  return g[CONFIG_KEY] as FollowUpConfig;
}

function setConfigGlobal(config: FollowUpConfig): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g[CONFIG_KEY] = config;
}

function getStatesMap(): Map<string, FollowUpState> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = new Map<string, FollowUpState>();
  }
  return g[STATE_KEY] as Map<string, FollowUpState>;
}

// ─── Default Configuration ──────────────────────────────────────────────

const DEFAULT_CONFIG: FollowUpConfig = {
  firstReminderHours: 48,
  secondReminderHours: 48,
  closeSuggestHours: 48,
  firstReminderTemplate:
    "Hi {{requester_name}},\n\nJust checking in on this ticket. Do you have any updates on the issue, or has it been resolved on your end?\n\nPlease let us know so we can continue to assist you.\n\nBest regards",
  secondReminderTemplate:
    "Hi {{requester_name}},\n\nWe haven't heard back from you regarding this ticket. If you're still experiencing the issue, please provide an update so we can help.\n\nIf we don't hear from you, we'll close this ticket in the next few days.\n\nBest regards",
  closeSuggestTemplate:
    "Hi {{requester_name}},\n\nSince we haven't received a response, we'll be closing this ticket. If you need further assistance, please feel free to reopen it or create a new ticket.\n\nThank you for your patience.",
};

// ─── Config CRUD ────────────────────────────────────────────────────────

export function getFollowUpConfig(): FollowUpConfig {
  return { ...getConfig() };
}

export function updateFollowUpConfig(
  updates: Partial<FollowUpConfig>,
): FollowUpConfig {
  const current = getConfig();
  const updated = { ...current, ...updates };
  setConfigGlobal(updated);
  return updated;
}

export function resetFollowUpConfig(): FollowUpConfig {
  setConfigGlobal({ ...DEFAULT_CONFIG });
  return { ...DEFAULT_CONFIG };
}

// ─── State Management ───────────────────────────────────────────────────

export function getFollowUpState(ticketId: string): FollowUpState | null {
  return getStatesMap().get(ticketId) ?? null;
}

export function getAllFollowUpStates(): FollowUpState[] {
  return Array.from(getStatesMap().values());
}

export function initFollowUp(ticketId: string): FollowUpState {
  const state: FollowUpState = {
    ticketId,
    stage: "none",
    awaitingSince: new Date().toISOString(),
    followUpCount: 0,
    closeApproved: false,
  };
  getStatesMap().set(ticketId, state);
  return state;
}

export function clearFollowUp(ticketId: string): void {
  getStatesMap().delete(ticketId);
}

// ─── State Machine ──────────────────────────────────────────────────────

const STAGE_ORDER: FollowUpStage[] = [
  "none",
  "reminder1",
  "reminder2",
  "close_suggest",
];

/**
 * Determine the next action for a ticket's follow-up workflow.
 * Returns the next stage and the message template to use,
 * or null if no action is due yet.
 */
export function getNextAction(ticketId: string): {
  nextStage: FollowUpStage;
  template: string;
  hoursUntilDue: number;
} | null {
  const state = getStatesMap().get(ticketId);
  if (!state) return null;

  const config = getConfig();
  const now = Date.now();

  const currentIdx = STAGE_ORDER.indexOf(state.stage);
  if (currentIdx >= STAGE_ORDER.length - 1) return null; // Already at close_suggest

  const nextStage = STAGE_ORDER[currentIdx + 1];
  const referenceTime = state.lastFollowUpAt || state.awaitingSince;
  const refMs = new Date(referenceTime).getTime();

  let waitHours: number;
  let template: string;

  switch (nextStage) {
    case "reminder1":
      waitHours = config.firstReminderHours;
      template = config.firstReminderTemplate;
      break;
    case "reminder2":
      waitHours = config.secondReminderHours;
      template = config.secondReminderTemplate;
      break;
    case "close_suggest":
      waitHours = config.closeSuggestHours;
      template = config.closeSuggestTemplate;
      break;
    default:
      return null;
  }

  const dueMs = refMs + waitHours * 60 * 60 * 1000;
  const hoursUntilDue = Math.max(0, (dueMs - now) / (60 * 60 * 1000));

  return { nextStage, template, hoursUntilDue };
}

/**
 * Advance a ticket to the next follow-up stage.
 * Called after agent approves the action (HITL).
 */
export function advanceFollowUp(ticketId: string): FollowUpState | null {
  const state = getStatesMap().get(ticketId);
  if (!state) return null;

  const currentIdx = STAGE_ORDER.indexOf(state.stage);
  if (currentIdx >= STAGE_ORDER.length - 1) return state;

  const nextStage = STAGE_ORDER[currentIdx + 1];
  const updated: FollowUpState = {
    ...state,
    stage: nextStage,
    lastFollowUpAt: new Date().toISOString(),
    followUpCount: state.followUpCount + 1,
    closeApproved: nextStage === "close_suggest" ? false : state.closeApproved,
  };

  getStatesMap().set(ticketId, updated);
  return updated;
}

/**
 * Mark a close suggestion as approved by the agent.
 */
export function approveClose(ticketId: string): FollowUpState | null {
  const state = getStatesMap().get(ticketId);
  if (!state || state.stage !== "close_suggest") return null;

  const updated: FollowUpState = {
    ...state,
    closeApproved: true,
  };
  getStatesMap().set(ticketId, updated);
  return updated;
}
