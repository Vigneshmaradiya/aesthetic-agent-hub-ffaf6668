import { create } from "zustand";

export type HitlMode = "autonomous" | "supervised";

export interface PendingAction {
  id: string;
  description: string;
  tool: string;
  args: Record<string, unknown>;
  risk: "low" | "medium" | "high";
  createdAt: Date;
}

interface HitlState {
  mode: HitlMode;
  pendingActions: PendingAction[];

  setMode: (mode: HitlMode) => void;
  addPendingAction: (action: PendingAction) => void;
  approveAction: (id: string) => PendingAction | undefined;
  rejectAction: (id: string) => void;
  clearPending: () => void;
}

export const useHitlStore = create<HitlState>((set, get) => ({
  mode: "supervised",
  pendingActions: [],

  setMode: (mode) => set({ mode }),

  addPendingAction: (action) =>
    set((state) => ({
      pendingActions: [...state.pendingActions, action],
    })),

  approveAction: (id) => {
    const action = get().pendingActions.find((a) => a.id === id);
    if (action) {
      set((state) => ({
        pendingActions: state.pendingActions.filter((a) => a.id !== id),
      }));
    }
    return action;
  },

  rejectAction: (id) =>
    set((state) => ({
      pendingActions: state.pendingActions.filter((a) => a.id !== id),
    })),

  clearPending: () => set({ pendingActions: [] }),
}));
