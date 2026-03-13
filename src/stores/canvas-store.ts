import { create } from "zustand";
import type {
  CanvasSectionId,
  SectionState,
  NextBestAction,
  TicketIntelligence,
  CustomerIntelligence,
  RootCauseSignal,
  SimilarCase,
  SuggestedAction,
  TimelineEvent,
  TroubleshootingStep,
  ResolutionInsight,
  TicketReadiness,
  CaseClassification,
  DiagnosticTool,
  ExpertSwarming,
  CommunicationTemplate,
  KBArticleDraft,
  IncidentSignal,
  ResolutionWorkflow,
  ResolutionStage,
  ResolutionModule,
  SelfServiceResolution,
  KnownIssueResolution,
  ServiceRequestSummary,
  ResolutionSummary,
  CommunicationDockTab,
  // Deprecated — still used by consumers during migration
  CanvasTabId,
  BriefingData,
} from "@/types/canvas";

// ─── Section Defaults ───────────────────────────────────────────────────

const SECTION_IDS: CanvasSectionId[] = [
  "next-best-action",
  "ticket-intelligence",
  "customer-intelligence",
  "root-cause",
  "similar-cases",
  "suggested-actions",
  "response-draft",
  "diagnostics",
  "ticket-timeline",
  // Resolution Intelligence Engine
  "resolution-insights",
  "ticket-readiness",
  "case-classification",
  "troubleshooting-tools",
  "expert-swarming",
  "customer-communication",
  "knowledge-capture",
  "incident-detection",
  // Adaptive workflow
  "resolution-summary",
];

function defaultSectionState(): SectionState {
  return {
    visible: false,
    collapsed: false,
    loading: false,
    error: null,
    lastUpdated: null,
  };
}

function createDefaultSections(): Record<CanvasSectionId, SectionState> {
  const sections = {} as Record<CanvasSectionId, SectionState>;
  for (const id of SECTION_IDS) {
    sections[id] = defaultSectionState();
  }
  return sections;
}

// ─── Workflow Helpers ──────────────────────────────────────────────────

/** 4-stage adaptive workflow: stage → default section to scroll to */
const STAGE_TO_SECTION: Record<ResolutionStage, CanvasSectionId> = {
  intake: "ticket-readiness",
  classification: "case-classification",
  resolution: "troubleshooting-tools", // Default; actual section depends on activeModule
  capture: "knowledge-capture",
};

/** Resolution module → sections that belong to it */
const MODULE_SECTIONS: Record<ResolutionModule, CanvasSectionId[]> = {
  "self-service": ["similar-cases"],
  "service-request": ["suggested-actions"],
  "known-issue": ["root-cause"],
  troubleshooting: ["troubleshooting-tools", "root-cause", "diagnostics"],
  swarming: ["expert-swarming"],
};

/** All section IDs that belong to any resolution module */
const ALL_RESOLUTION_SECTIONS: CanvasSectionId[] = [
  ...new Set(Object.values(MODULE_SECTIONS).flat()),
];

// ─── Stage-Aware Layout Rules ──────────────────────────────────────────

type SectionVisibility = "primary" | "visible" | "collapsed" | "hidden";

/**
 * Defines which sections are shown/hidden/collapsed at each workflow stage.
 * - "primary": shown expanded with loading skeleton (about to receive data)
 * - "visible": shown expanded (has or will have data)
 * - "collapsed": shown header-only (click to expand for reference)
 * - unlisted sections default to "hidden"
 *
 * Module-managed sections (troubleshooting-tools, root-cause, diagnostics, etc.)
 * are controlled by setResolutionModule() during the resolution stage.
 */
const STAGE_SECTION_VISIBILITY: Record<
  ResolutionStage,
  Partial<Record<CanvasSectionId, SectionVisibility>>
> = {
  intake: {
    "ticket-readiness": "primary",
    "ticket-intelligence": "primary",
    "customer-intelligence": "primary",
    "ticket-timeline": "visible",
  },
  classification: {
    "case-classification": "primary",
    "resolution-insights": "primary",
    "next-best-action": "primary",
    "similar-cases": "visible",
    "ticket-intelligence": "visible",
    "ticket-readiness": "collapsed",
    "customer-intelligence": "collapsed",
    "ticket-timeline": "visible",
  },
  resolution: {
    "resolution-insights": "visible",
    "next-best-action": "visible",
    "similar-cases": "visible",
    "ticket-intelligence": "collapsed",
    "case-classification": "collapsed",
    "incident-detection": "visible",
    "ticket-timeline": "visible",
    // Module sections (troubleshooting-tools, root-cause, etc.) managed by setResolutionModule
  },
  capture: {
    "knowledge-capture": "primary",
    "resolution-summary": "primary",
    "ticket-intelligence": "collapsed",
    "case-classification": "collapsed",
    "ticket-timeline": "visible",
  },
};

/** Human-readable short names for each section (used by SectionNavBar chips). */
export const SECTION_DISPLAY_NAMES: Partial<Record<CanvasSectionId, string>> = {
  "ticket-readiness": "Readiness",
  "ticket-intelligence": "Intel",
  "customer-intelligence": "Customer",
  "case-classification": "Classification",
  "resolution-insights": "Insights",
  "next-best-action": "Next Action",
  "similar-cases": "Similar",
  "root-cause": "Root Cause",
  "troubleshooting-tools": "Investigate",
  diagnostics: "Diagnostics",
  "expert-swarming": "Swarming",
  "suggested-actions": "Actions",
  "incident-detection": "Incidents",
  "ticket-timeline": "Timeline",
  "knowledge-capture": "Capture",
  "resolution-summary": "Summary",
};

/** Fixed section order for the Context tab (all data-bearing sections) */
export const CONTEXT_TAB_SECTIONS: CanvasSectionId[] = [
  "ticket-intelligence",
  "ticket-readiness",
  "resolution-insights",
  "next-best-action",
  "troubleshooting-tools",
  "expert-swarming",
  "ticket-timeline",
];

/**
 * Compute section states for a given stage layout.
 * During resolution stage, module-managed sections are left untouched
 * (they are controlled by setResolutionModule).
 */
function computeStageLayout(
  currentSections: Record<CanvasSectionId, SectionState>,
  stage: ResolutionStage,
): Record<CanvasSectionId, SectionState> {
  const visibility = STAGE_SECTION_VISIBILITY[stage];
  const updated = { ...currentSections };

  for (const id of SECTION_IDS) {
    // During resolution stage, skip module-managed sections
    if (
      stage === "resolution" &&
      (ALL_RESOLUTION_SECTIONS as string[]).includes(id)
    ) {
      continue;
    }

    const rule: SectionVisibility = visibility[id] ?? "hidden";
    switch (rule) {
      case "primary":
        updated[id] = {
          ...updated[id],
          visible: true,
          collapsed: false,
          // Only show loading skeleton if section has no data yet
          loading: updated[id].lastUpdated === null,
        };
        break;
      case "visible":
        updated[id] = { ...updated[id], visible: true, collapsed: false };
        break;
      case "collapsed":
        updated[id] = { ...updated[id], visible: true, collapsed: true };
        break;
      case "hidden":
      default:
        updated[id] = { ...updated[id], visible: false };
        break;
    }
  }

  return updated;
}

function defaultWorkflow(): ResolutionWorkflow {
  return {
    currentStage: "intake",
    completedStages: [],
    activeModule: null,
    swarmingActive: false,
  };
}

// ─── Tab-to-Section Mapping (migration helper) ──────────────────────────

const TAB_TO_SECTION: Record<CanvasTabId, CanvasSectionId> = {
  briefing: "ticket-intelligence",
  troubleshooting: "root-cause",
  response: "response-draft",
  logs: "diagnostics",
};

// ─── Store Interface ────────────────────────────────────────────────────

interface CanvasState {
  // Core state
  activeTicketId: string | null;
  sections: Record<CanvasSectionId, SectionState>;
  scrollToSection: CanvasSectionId | null;

  // Focused canvas: which single section is displayed full-height
  focusedSection: CanvasSectionId | null;

  // Section data (original)
  nextBestAction: NextBestAction | null;
  ticketIntelligence: TicketIntelligence | null;
  customerIntelligence: CustomerIntelligence | null;
  rootCauseSignals: RootCauseSignal[];
  similarCases: SimilarCase[];
  suggestedActions: SuggestedAction[];
  draftResponse: string;
  troubleshootingSteps: TroubleshootingStep[];
  timelineEvents: TimelineEvent[];

  // Section data (Resolution Intelligence Engine)
  resolutionInsights: ResolutionInsight | null;
  ticketReadiness: TicketReadiness | null;
  caseClassification: CaseClassification | null;
  diagnosticTools: DiagnosticTool[];
  expertSwarming: ExpertSwarming | null;
  communicationTemplates: CommunicationTemplate[];
  kbArticleDraft: KBArticleDraft | null;
  incidentSignals: IncidentSignal[];

  // Adaptive resolution module data
  selfServiceResolution: SelfServiceResolution | null;
  knownIssueResolution: KnownIssueResolution | null;
  serviceRequestSummary: ServiceRequestSummary | null;
  resolutionSummary: ResolutionSummary | null;

  // Step annotations — persisted in store so they survive re-mounts
  stepAnnotations: Record<string, string>;

  // Communication dock state
  communicationDockExpanded: boolean;
  communicationDockTab: CommunicationDockTab;
  suggestedDraft: string | null;

  // Resolution workflow state
  resolutionWorkflow: ResolutionWorkflow;

  // Canvas view mode (workflow = stage-filtered, context = all data)
  canvasViewMode: "workflow" | "context";

  // Section state actions
  setSectionState: (
    id: CanvasSectionId,
    updates: Partial<SectionState>,
  ) => void;
  showSection: (id: CanvasSectionId) => void;
  hideSection: (id: CanvasSectionId) => void;
  toggleSection: (id: CanvasSectionId) => void;
  setScrollToSection: (id: CanvasSectionId | null) => void;

  // Ticket lifecycle
  loadTicket: (ticketId: string) => void;
  setActiveTicketId: (id: string | null) => void;

  // Data setters (original)
  setNextBestAction: (data: NextBestAction | null) => void;
  setTicketIntelligence: (data: TicketIntelligence | null) => void;
  setCustomerIntelligence: (data: CustomerIntelligence | null) => void;
  setRootCauseSignals: (signals: RootCauseSignal[]) => void;
  setSimilarCases: (cases: SimilarCase[]) => void;
  setSuggestedActions: (actions: SuggestedAction[]) => void;
  setDraftResponse: (draft: string) => void;
  setTimelineEvents: (events: TimelineEvent[]) => void;

  // Troubleshooting step actions
  addTroubleshootingStep: (step: TroubleshootingStep) => void;
  updateTroubleshootingStep: (
    id: string,
    updates: Partial<TroubleshootingStep>,
  ) => void;
  clearTroubleshootingSteps: () => void;

  // Step annotation actions
  setStepAnnotation: (stepId: string, text: string) => void;

  // Data setters (Resolution Intelligence Engine)
  setResolutionInsights: (data: ResolutionInsight | null) => void;
  setTicketReadiness: (data: TicketReadiness | null) => void;
  setCaseClassification: (data: CaseClassification | null) => void;
  setDiagnosticTools: (tools: DiagnosticTool[]) => void;
  updateDiagnosticTool: (id: string, updates: Partial<DiagnosticTool>) => void;
  setExpertSwarming: (data: ExpertSwarming | null) => void;
  setCommunicationTemplates: (templates: CommunicationTemplate[]) => void;
  setKBArticleDraft: (data: KBArticleDraft | null) => void;
  setIncidentSignals: (signals: IncidentSignal[]) => void;

  // Adaptive module data setters
  setSelfServiceResolution: (data: SelfServiceResolution | null) => void;
  setKnownIssueResolution: (data: KnownIssueResolution | null) => void;
  setServiceRequestSummary: (data: ServiceRequestSummary | null) => void;
  setResolutionSummary: (data: ResolutionSummary | null) => void;

  // Communication dock actions
  setCommunicationDockExpanded: (expanded: boolean) => void;
  setCommunicationDockTab: (tab: CommunicationDockTab) => void;
  setSuggestedDraft: (draft: string | null) => void;

  // Workflow actions
  advanceStage: (stage: ResolutionStage) => void;
  setResolutionStage: (stage: ResolutionStage) => void;
  setResolutionModule: (module: ResolutionModule) => void;
  activateSwarming: () => void;

  // Stage layout actions
  applyStageLayout: (stage: ResolutionStage) => void;
  setCanvasViewMode: (mode: "workflow" | "context") => void;

  // Focused canvas actions
  setFocusedSection: (id: CanvasSectionId | null) => void;

  // Full reset
  clearCanvas: () => void;

  // ── Deprecated (migration shims) ────────────────────────────────────
  /** @deprecated Use ticketIntelligence instead. */
  briefingData: BriefingData | null;
  /** @deprecated Use showSection / sections visibility. */
  activeTab: CanvasTabId;
  /** @deprecated Use showSection instead. */
  setActiveTab: (tab: CanvasTabId) => void;
  /** @deprecated Alias for setActiveTab during migration. */
  syncFromUrl: (tab: CanvasTabId) => void;
  /** @deprecated Use setTicketIntelligence instead. */
  setBriefingData: (data: BriefingData | null) => void;
}

// ─── Store Implementation ───────────────────────────────────────────────

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Core state
  activeTicketId: null,
  sections: createDefaultSections(),
  scrollToSection: null,

  // Section data (original)
  nextBestAction: null,
  ticketIntelligence: null,
  customerIntelligence: null,
  rootCauseSignals: [],
  similarCases: [],
  suggestedActions: [],
  draftResponse: "",
  troubleshootingSteps: [],
  timelineEvents: [],

  // Section data (Resolution Intelligence Engine)
  resolutionInsights: null,
  ticketReadiness: null,
  caseClassification: null,
  diagnosticTools: [],
  expertSwarming: null,
  communicationTemplates: [],
  kbArticleDraft: null,
  incidentSignals: [],

  // Adaptive resolution module data
  selfServiceResolution: null,
  knownIssueResolution: null,
  serviceRequestSummary: null,
  resolutionSummary: null,

  // Step annotations
  stepAnnotations: {},

  // Communication dock state
  communicationDockExpanded: false,
  communicationDockTab: "reply" as CommunicationDockTab,
  suggestedDraft: null,

  // Resolution workflow
  resolutionWorkflow: defaultWorkflow(),

  // Canvas view mode
  canvasViewMode: "workflow" as const,

  // Focused canvas
  focusedSection: null,

  // ── Section state actions ─────────────────────────────────────────────

  setSectionState: (id, updates) =>
    set((state) => ({
      sections: {
        ...state.sections,
        [id]: { ...state.sections[id], ...updates },
      },
    })),

  showSection: (id) =>
    set((state) => ({
      sections: {
        ...state.sections,
        [id]: { ...state.sections[id], visible: true },
      },
    })),

  hideSection: (id) =>
    set((state) => ({
      sections: {
        ...state.sections,
        [id]: { ...state.sections[id], visible: false },
      },
    })),

  toggleSection: (id) =>
    set((state) => ({
      sections: {
        ...state.sections,
        [id]: {
          ...state.sections[id],
          collapsed: !state.sections[id].collapsed,
        },
      },
    })),

  setScrollToSection: (id) =>
    set((state) => ({
      focusedSection: id,
      ...(id !== null
        ? {
            sections: {
              ...state.sections,
              [id]: { ...state.sections[id], collapsed: false },
            },
          }
        : {}),
    })),

  // ── Ticket lifecycle ──────────────────────────────────────────────────

  loadTicket: (ticketId) =>
    set({
      activeTicketId: ticketId,
      // Reset all data
      nextBestAction: null,
      ticketIntelligence: null,
      customerIntelligence: null,
      rootCauseSignals: [],
      similarCases: [],
      suggestedActions: [],
      draftResponse: "",
      troubleshootingSteps: [],
      timelineEvents: [],
      // Reset Resolution Intelligence data
      resolutionInsights: null,
      ticketReadiness: null,
      caseClassification: null,
      diagnosticTools: [],
      expertSwarming: null,
      communicationTemplates: [],
      kbArticleDraft: null,
      incidentSignals: [],
      // Reset adaptive module data
      selfServiceResolution: null,
      knownIssueResolution: null,
      serviceRequestSummary: null,
      resolutionSummary: null,
      // Reset communication dock
      communicationDockExpanded: false,
      suggestedDraft: null,
      resolutionWorkflow: defaultWorkflow(),
      canvasViewMode: "workflow" as const,
      briefingData: null,
      // Reset step annotations
      stepAnnotations: {},
      // Focused canvas: start on intel (first section with immediate data)
      focusedSection: "ticket-intelligence" as CanvasSectionId,
      // Apply intake stage layout (primary sections show as loading)
      sections: computeStageLayout(createDefaultSections(), "intake"),
    }),

  setActiveTicketId: (id) => set({ activeTicketId: id }),

  // ── Data setters (original) ──────────────────────────────────────────

  setNextBestAction: (data) =>
    set((state) => ({
      nextBestAction: data,
      sections: {
        ...state.sections,
        "next-best-action": {
          ...state.sections["next-best-action"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["next-best-action"].lastUpdated,
        },
      },
    })),

  setTicketIntelligence: (data) =>
    set((state) => ({
      ticketIntelligence: data,
      activeTicketId: data?.ticketId ?? state.activeTicketId,
      // Also maintain deprecated briefingData
      briefingData: data
        ? {
            ticketId: data.ticketId,
            subject: data.subject,
            priority: data.priority,
            requester: data.requester,
            summary: data.summary,
            sentiment: data.sentiment,
            relatedArticles: data.relatedArticles,
            suggestedActions: [],
          }
        : null,
      sections: {
        ...state.sections,
        "ticket-intelligence": {
          ...state.sections["ticket-intelligence"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["ticket-intelligence"].lastUpdated,
        },
      },
    })),

  setCustomerIntelligence: (data) =>
    set((state) => ({
      customerIntelligence: data,
      sections: {
        ...state.sections,
        "customer-intelligence": {
          ...state.sections["customer-intelligence"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["customer-intelligence"].lastUpdated,
        },
      },
    })),

  setRootCauseSignals: (signals) =>
    set((state) => ({
      rootCauseSignals: signals,
      sections: {
        ...state.sections,
        "root-cause": {
          ...state.sections["root-cause"],
          visible: signals.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            signals.length > 0
              ? new Date()
              : state.sections["root-cause"].lastUpdated,
        },
      },
    })),

  setSimilarCases: (cases) =>
    set((state) => ({
      similarCases: cases,
      sections: {
        ...state.sections,
        "similar-cases": {
          ...state.sections["similar-cases"],
          visible: cases.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            cases.length > 0
              ? new Date()
              : state.sections["similar-cases"].lastUpdated,
        },
        // Also surface the Insights chip when similar cases are found
        "resolution-insights": {
          ...state.sections["resolution-insights"],
          visible: cases.length > 0 || state.sections["resolution-insights"].visible,
          loading: false,
          lastUpdated:
            cases.length > 0
              ? (state.sections["resolution-insights"].lastUpdated ?? new Date())
              : state.sections["resolution-insights"].lastUpdated,
        },
      },
    })),

  setSuggestedActions: (actions) =>
    set((state) => ({
      suggestedActions: actions,
      sections: {
        ...state.sections,
        "suggested-actions": {
          ...state.sections["suggested-actions"],
          visible: actions.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            actions.length > 0
              ? new Date()
              : state.sections["suggested-actions"].lastUpdated,
        },
      },
    })),

  setDraftResponse: (draft) =>
    set((state) => ({
      draftResponse: draft,
      sections: {
        ...state.sections,
        "response-draft": {
          ...state.sections["response-draft"],
          visible: draft.length > 0 || state.sections["response-draft"].visible,
          loading: false,
          error: null,
          lastUpdated:
            draft.length > 0
              ? new Date()
              : state.sections["response-draft"].lastUpdated,
        },
      },
    })),

  setTimelineEvents: (events) =>
    set((state) => ({
      timelineEvents: events,
      sections: {
        ...state.sections,
        "ticket-timeline": {
          ...state.sections["ticket-timeline"],
          visible: events.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            events.length > 0
              ? new Date()
              : state.sections["ticket-timeline"].lastUpdated,
        },
      },
    })),

  // ── Troubleshooting step actions ──────────────────────────────────────

  addTroubleshootingStep: (step) =>
    set((state) => ({
      troubleshootingSteps: [...state.troubleshootingSteps, step],
      sections: {
        ...state.sections,
        "root-cause": {
          ...state.sections["root-cause"],
          visible: true,
          loading: false,
        },
      },
    })),

  updateTroubleshootingStep: (id, updates) =>
    set((state) => ({
      troubleshootingSteps: state.troubleshootingSteps.map((step) =>
        step.id === id ? { ...step, ...updates } : step,
      ),
    })),

  clearTroubleshootingSteps: () => set({ troubleshootingSteps: [] }),

  setStepAnnotation: (stepId, text) =>
    set((state) => {
      const next = { ...state.stepAnnotations };
      if (text.trim()) {
        next[stepId] = text;
      } else {
        delete next[stepId];
      }
      return { stepAnnotations: next };
    }),

  // ── Data setters (Resolution Intelligence Engine) ─────────────────────

  setResolutionInsights: (data) =>
    set((state) => ({
      resolutionInsights: data,
      sections: {
        ...state.sections,
        "resolution-insights": {
          ...state.sections["resolution-insights"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["resolution-insights"].lastUpdated,
        },
      },
    })),

  setTicketReadiness: (data) =>
    set((state) => ({
      ticketReadiness: data,
      sections: {
        ...state.sections,
        "ticket-readiness": {
          ...state.sections["ticket-readiness"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["ticket-readiness"].lastUpdated,
        },
      },
    })),

  setCaseClassification: (data) =>
    set((state) => ({
      caseClassification: data,
      sections: {
        ...state.sections,
        "case-classification": {
          ...state.sections["case-classification"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["case-classification"].lastUpdated,
        },
      },
    })),

  setDiagnosticTools: (tools) =>
    set((state) => ({
      diagnosticTools: tools,
      sections: {
        ...state.sections,
        "troubleshooting-tools": {
          ...state.sections["troubleshooting-tools"],
          visible: tools.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            tools.length > 0
              ? new Date()
              : state.sections["troubleshooting-tools"].lastUpdated,
        },
      },
    })),

  updateDiagnosticTool: (id, updates) =>
    set((state) => ({
      diagnosticTools: state.diagnosticTools.map((tool) =>
        tool.id === id ? { ...tool, ...updates } : tool,
      ),
    })),

  setExpertSwarming: (data) =>
    set((state) => ({
      expertSwarming: data,
      sections: {
        ...state.sections,
        "expert-swarming": {
          ...state.sections["expert-swarming"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["expert-swarming"].lastUpdated,
        },
      },
    })),

  setCommunicationTemplates: (templates) =>
    set((state) => ({
      communicationTemplates: templates,
      sections: {
        ...state.sections,
        "customer-communication": {
          ...state.sections["customer-communication"],
          visible: templates.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            templates.length > 0
              ? new Date()
              : state.sections["customer-communication"].lastUpdated,
        },
      },
    })),

  setKBArticleDraft: (data) =>
    set((state) => ({
      kbArticleDraft: data,
      sections: {
        ...state.sections,
        "knowledge-capture": {
          ...state.sections["knowledge-capture"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["knowledge-capture"].lastUpdated,
        },
      },
    })),

  setIncidentSignals: (signals) =>
    set((state) => ({
      incidentSignals: signals,
      sections: {
        ...state.sections,
        "incident-detection": {
          ...state.sections["incident-detection"],
          visible: signals.length > 0,
          loading: false,
          error: null,
          lastUpdated:
            signals.length > 0
              ? new Date()
              : state.sections["incident-detection"].lastUpdated,
        },
      },
    })),

  // ── Workflow actions ─────────────────────────────────────────────────

  advanceStage: (stage) =>
    set((state) => {
      const sectionId = STAGE_TO_SECTION[stage];
      // Apply stage layout: show/hide/collapse sections per stage rules
      const sections = computeStageLayout(state.sections, stage);
      // Ensure the focus target section is visible and loading
      sections[sectionId] = {
        ...sections[sectionId],
        visible: true,
        loading: true,
      };
      return {
        resolutionWorkflow: {
          ...state.resolutionWorkflow,
          currentStage: stage,
          completedStages: [
            ...new Set([
              ...state.resolutionWorkflow.completedStages,
              state.resolutionWorkflow.currentStage,
            ]),
          ],
        },
        sections,
        focusedSection: sectionId,
      };
    }),

  setResolutionStage: (stage) =>
    set((state) => ({
      resolutionWorkflow: {
        ...state.resolutionWorkflow,
        currentStage: stage,
      },
    })),

  setResolutionModule: (module) =>
    set((state) => {
      const sectionIds = MODULE_SECTIONS[module];
      // Hide all resolution-related sections first
      const updatedSections = { ...state.sections };
      for (const id of ALL_RESOLUTION_SECTIONS) {
        updatedSections[id] = {
          ...updatedSections[id],
          visible: false,
        };
      }
      // Show only the relevant module's sections as loading
      for (const id of sectionIds) {
        updatedSections[id] = {
          ...updatedSections[id],
          visible: true,
          loading: true,
        };
      }
      return {
        resolutionWorkflow: {
          ...state.resolutionWorkflow,
          activeModule: module,
        },
        sections: updatedSections,
        focusedSection: sectionIds[0],
      };
    }),

  activateSwarming: () =>
    set((state) => ({
      resolutionWorkflow: {
        ...state.resolutionWorkflow,
        swarmingActive: true,
      },
      sections: {
        ...state.sections,
        "expert-swarming": {
          ...state.sections["expert-swarming"],
          visible: true,
          loading: true,
        },
      },
      focusedSection: "expert-swarming" as CanvasSectionId,
    })),

  // ── Stage layout actions ─────────────────────────────────────────────

  applyStageLayout: (stage) =>
    set((state) => ({
      sections: computeStageLayout(state.sections, stage),
    })),

  setCanvasViewMode: (mode) => {
    if (mode === "context") {
      // Expand all data-bearing sections for context view
      const state = get();
      const updated = { ...state.sections };
      for (const id of SECTION_IDS) {
        if (updated[id].lastUpdated !== null) {
          updated[id] = { ...updated[id], collapsed: false };
        }
      }
      set({ canvasViewMode: mode, sections: updated });
    } else {
      // Switching back to workflow — re-apply current stage layout
      set({ canvasViewMode: mode });
      const stage = get().resolutionWorkflow.currentStage;
      set((state) => ({
        sections: computeStageLayout(state.sections, stage),
      }));
    }
  },

  // ── Focused canvas actions ──────────────────────────────────────────

  setFocusedSection: (id) =>
    set((state) => ({
      focusedSection: id,
      ...(id !== null
        ? {
            sections: {
              ...state.sections,
              [id]: { ...state.sections[id], collapsed: false },
            },
          }
        : {}),
    })),

  // ── Adaptive module data setters ──────────────────────────────────────

  setSelfServiceResolution: (data) =>
    set((state) => ({
      selfServiceResolution: data,
      sections: {
        ...state.sections,
        "similar-cases": {
          ...state.sections["similar-cases"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["similar-cases"].lastUpdated,
        },
      },
    })),

  setKnownIssueResolution: (data) =>
    set((state) => ({
      knownIssueResolution: data,
      sections: {
        ...state.sections,
        "root-cause": {
          ...state.sections["root-cause"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["root-cause"].lastUpdated,
        },
      },
    })),

  setServiceRequestSummary: (data) =>
    set((state) => ({
      serviceRequestSummary: data,
      sections: {
        ...state.sections,
        "suggested-actions": {
          ...state.sections["suggested-actions"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["suggested-actions"].lastUpdated,
        },
      },
    })),

  setResolutionSummary: (data) =>
    set((state) => ({
      resolutionSummary: data,
      sections: {
        ...state.sections,
        "resolution-summary": {
          ...state.sections["resolution-summary"],
          visible: data !== null,
          loading: false,
          error: null,
          lastUpdated: data
            ? new Date()
            : state.sections["resolution-summary"].lastUpdated,
        },
      },
    })),

  // ── Communication dock actions ──────────────────────────────────────

  setCommunicationDockExpanded: (expanded) =>
    set({ communicationDockExpanded: expanded }),

  setCommunicationDockTab: (tab) => set({ communicationDockTab: tab }),

  setSuggestedDraft: (draft) => set({ suggestedDraft: draft }),

  // ── Full reset ────────────────────────────────────────────────────────

  clearCanvas: () =>
    set({
      activeTicketId: null,
      sections: createDefaultSections(),
      scrollToSection: null,
      focusedSection: null,
      nextBestAction: null,
      ticketIntelligence: null,
      customerIntelligence: null,
      rootCauseSignals: [],
      similarCases: [],
      suggestedActions: [],
      draftResponse: "",
      troubleshootingSteps: [],
      timelineEvents: [],
      // Resolution Intelligence Engine
      resolutionInsights: null,
      ticketReadiness: null,
      caseClassification: null,
      diagnosticTools: [],
      expertSwarming: null,
      communicationTemplates: [],
      kbArticleDraft: null,
      incidentSignals: [],
      // Adaptive module data
      selfServiceResolution: null,
      knownIssueResolution: null,
      serviceRequestSummary: null,
      resolutionSummary: null,
      // Communication dock
      communicationDockExpanded: false,
      suggestedDraft: null,
      resolutionWorkflow: defaultWorkflow(),
      canvasViewMode: "workflow" as const,
      briefingData: null,
      activeTab: "briefing" as CanvasTabId,
      // Step annotations
      stepAnnotations: {},
    }),

  // ── Deprecated (migration shims) ──────────────────────────────────────

  briefingData: null,
  activeTab: "briefing" as CanvasTabId,

  setActiveTab: (tab) => {
    const sectionId = TAB_TO_SECTION[tab];
    const state = get();
    set({
      activeTab: tab,
      sections: {
        ...state.sections,
        [sectionId]: { ...state.sections[sectionId], visible: true },
      },
      focusedSection: sectionId,
    });
  },

  syncFromUrl: (tab) => {
    get().setActiveTab(tab);
  },

  setBriefingData: (data) => {
    set((state) => ({
      briefingData: data,
      activeTicketId: data?.ticketId ?? state.activeTicketId,
    }));
    // Also set ticket intelligence when briefing data is set
    if (data) {
      const intel: TicketIntelligence = {
        ticketId: data.ticketId,
        subject: data.subject,
        priority: data.priority,
        status: "open",
        requester: data.requester,
        assignee: "",
        summary: data.summary,
        sentiment: data.sentiment,
        confidenceScore: 0,
        evidence: [],
        tags: [],
        relatedArticles: data.relatedArticles,
        linkedJiraIssues: [],
        slaRisk: null,
        createdAt: "",
        updatedAt: "",
      };
      get().setTicketIntelligence(intel);
    }
  },
}));
