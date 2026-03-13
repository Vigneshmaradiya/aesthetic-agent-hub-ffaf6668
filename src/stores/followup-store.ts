import { create } from "zustand";
import type { FollowUpState, FollowUpConfig } from "@/lib/followup/types";

interface FollowUpStoreState {
  /** Per-ticket follow-up states. */
  states: Record<string, FollowUpState>;
  /** Current follow-up configuration (fetched from server). */
  config: FollowUpConfig | null;

  /** Set the state for a specific ticket. */
  setTicketState: (ticketId: string, state: FollowUpState) => void;

  /** Remove follow-up state for a ticket. */
  clearTicketState: (ticketId: string) => void;

  /** Set all follow-up states (bulk update from server). */
  setAllStates: (states: FollowUpState[]) => void;

  /** Set the configuration. */
  setConfig: (config: FollowUpConfig) => void;

  /** Clear all state. */
  clearAll: () => void;
}

export const useFollowUpStore = create<FollowUpStoreState>((set) => ({
  states: {},
  config: null,

  setTicketState: (ticketId, state) =>
    set((s) => ({
      states: { ...s.states, [ticketId]: state },
    })),

  clearTicketState: (ticketId) =>
    set((s) => {
      const { [ticketId]: _, ...rest } = s.states;
      return { states: rest };
    }),

  setAllStates: (states) =>
    set({
      states: Object.fromEntries(states.map((s) => [s.ticketId, s])),
    }),

  setConfig: (config) => set({ config }),

  clearAll: () => set({ states: {}, config: null }),
}));
