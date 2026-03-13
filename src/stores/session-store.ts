import { create } from "zustand";

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export type TicketingProvider = "zendesk" | "salesforce" | null;

interface SessionState {
  sessionId: string;
  startedAt: Date;
  panelRatio: number; // 0.0 to 1.0, default 0.4
  mcpConnections: Record<string, ConnectionStatus>;
  isOmniBarOpen: boolean;
  showMorningBrief: boolean;
  showMCPPanel: boolean;
  llmProvider: string | null;
  llmModel: string | null;
  ticketingProvider: TicketingProvider;
  userName: string | null;
  userEmail: string | null;

  setPanelRatio: (ratio: number) => void;
  setMcpConnection: (service: string, status: ConnectionStatus) => void;
  toggleOmniBar: () => void;
  openOmniBar: () => void;
  closeOmniBar: () => void;
  setShowMorningBrief: (show: boolean) => void;
  setShowMCPPanel: (show: boolean) => void;
  setLlmProvider: (provider: string) => void;
  setLlmModel: (model: string) => void;
  setTicketingProvider: (provider: TicketingProvider) => void;
  setUserInfo: (name: string | null, email: string | null) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: crypto.randomUUID(),
  startedAt: new Date(),
  panelRatio: 0.4,
  mcpConnections: {},
  isOmniBarOpen: false,
  showMorningBrief: true,
  showMCPPanel: false,
  llmProvider: null,
  llmModel: null,
  ticketingProvider: null,
  userName: null,
  userEmail: null,

  setPanelRatio: (ratio) =>
    set({ panelRatio: Math.max(0.2, Math.min(0.8, ratio)) }),

  setMcpConnection: (service, status) =>
    set((state) => ({
      mcpConnections: { ...state.mcpConnections, [service]: status },
    })),

  toggleOmniBar: () =>
    set((state) => ({ isOmniBarOpen: !state.isOmniBarOpen })),

  openOmniBar: () => set({ isOmniBarOpen: true }),
  closeOmniBar: () => set({ isOmniBarOpen: false }),

  setShowMorningBrief: (show) => set({ showMorningBrief: show }),
  setShowMCPPanel: (show) => set({ showMCPPanel: show }),

  setLlmProvider: (provider) => set({ llmProvider: provider }),
  setLlmModel: (model) => set({ llmModel: model }),

  setTicketingProvider: (provider) => set({ ticketingProvider: provider }),
  setUserInfo: (name, email) => set({ userName: name, userEmail: email }),

  resetSession: () =>
    set({
      sessionId: crypto.randomUUID(),
      startedAt: new Date(),
      mcpConnections: {},
      llmProvider: null,
      llmModel: null,
      ticketingProvider: null,
      userName: null,
      userEmail: null,
      showMorningBrief: true,
    }),
}));
