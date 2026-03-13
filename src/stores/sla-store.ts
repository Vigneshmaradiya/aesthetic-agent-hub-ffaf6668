import { create } from "zustand";
import type { SLATimer, SLASummary } from "@/lib/sla/types";
import {
  computeTimers,
  getMostUrgentTimer,
  computeBreachLevel,
  computeSummary,
} from "@/lib/sla/engine";

interface SLAState {
  /** Active SLA timers keyed by ticketId. */
  timersByTicket: Record<string, SLATimer[]>;

  /** Computed summary across all tracked tickets. */
  summary: SLASummary;

  /** Compute and store timers for a ticket. */
  computeForTicket: (params: {
    ticketId: string;
    priority: string;
    createdAt: string;
    firstResponseAt?: string;
    lastCustomerUpdateAt?: string;
    isResolved?: boolean;
  }) => void;

  /** Get the most urgent timer for a specific ticket. */
  getMostUrgent: (ticketId: string) => SLATimer | null;

  /** Remove timers for a ticket (e.g., when ticket is resolved). */
  clearTicket: (ticketId: string) => void;

  /** Clear all tracked timers. */
  clearAll: () => void;

  /** Recompute remaining times for all tracked tickets (call on interval). */
  tick: () => void;
}

const emptySummary: SLASummary = {
  totalActive: 0,
  breached: 0,
  critical: 0,
  warning: 0,
  safe: 0,
};

export const useSLAStore = create<SLAState>((set, get) => ({
  timersByTicket: {},
  summary: emptySummary,

  computeForTicket: (params) => {
    const timers = computeTimers(params);
    set((state) => {
      const updated = { ...state.timersByTicket, [params.ticketId]: timers };
      return {
        timersByTicket: updated,
        summary: computeSummary(Object.values(updated).flat()),
      };
    });
  },

  getMostUrgent: (ticketId) => {
    const timers = get().timersByTicket[ticketId];
    return timers ? getMostUrgentTimer(timers) : null;
  },

  clearTicket: (ticketId) =>
    set((state) => {
      const { [ticketId]: _, ...rest } = state.timersByTicket;
      return {
        timersByTicket: rest,
        summary: computeSummary(Object.values(rest).flat()),
      };
    }),

  clearAll: () => set({ timersByTicket: {}, summary: emptySummary }),

  tick: () =>
    set((state) => {
      const now = Date.now();
      const updated: Record<string, SLATimer[]> = {};

      for (const [ticketId, timers] of Object.entries(state.timersByTicket)) {
        updated[ticketId] = timers.map((t) => {
          const deadlineMs = new Date(t.deadline).getTime();
          const startMs = new Date(t.startedAt).getTime();
          const targetMinutes = (deadlineMs - startMs) / (60 * 1000);
          const remainingMinutes = Math.round((deadlineMs - now) / (60 * 1000));
          const breachLevel = computeBreachLevel(remainingMinutes, targetMinutes);
          return { ...t, remainingMinutes, breachLevel };
        });
      }

      return {
        timersByTicket: updated,
        summary: computeSummary(Object.values(updated).flat()),
      };
    }),
}));
