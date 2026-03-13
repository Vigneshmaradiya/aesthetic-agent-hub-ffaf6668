/* ──────────────────────────────────────────────────────────────────────────
 * Follow-Up Types — Automated follow-up management
 * ──────────────────────────────────────────────────────────────────────── */

/** Stages in the automated follow-up workflow. */
export type FollowUpStage =
  | "none"       // No follow-up needed
  | "reminder1"  // 1st follow-up sent
  | "reminder2"  // 2nd follow-up sent
  | "close_suggest"; // Suggest closing the ticket

/** Per-ticket follow-up state. */
export interface FollowUpState {
  ticketId: string;
  stage: FollowUpStage;
  /** When the ticket entered "Awaiting Customer Response" status. */
  awaitingSince: string;
  /** When the last follow-up was sent. */
  lastFollowUpAt?: string;
  /** Number of follow-ups sent so far. */
  followUpCount: number;
  /** Whether the agent has approved the close suggestion. */
  closeApproved: boolean;
}

/** Configurable timings for the follow-up workflow. */
export interface FollowUpConfig {
  /** Hours to wait before sending the 1st follow-up. */
  firstReminderHours: number;
  /** Hours to wait after 1st follow-up before sending 2nd. */
  secondReminderHours: number;
  /** Hours to wait after 2nd follow-up before suggesting close. */
  closeSuggestHours: number;
  /** Template for the 1st follow-up message. */
  firstReminderTemplate: string;
  /** Template for the 2nd follow-up message. */
  secondReminderTemplate: string;
  /** Template for the close suggestion message. */
  closeSuggestTemplate: string;
}
