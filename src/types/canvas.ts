/* ──────────────────────────────────────────────────────────────────────────
 * Canvas Section Types — Resolution Intelligence Engine
 *
 * The canvas is a vertical stack of collapsible sections that appear
 * dynamically as data arrives. Sections map to the 4-stage adaptive
 * resolution workflow (Intake → Classification → Resolution → Capture)
 * plus cross-cutting intelligence panels.
 * ──────────────────────────────────────────────────────────────────────── */

// ─── Section IDs ────────────────────────────────────────────────────────

export type CanvasSectionId =
  | "next-best-action"
  | "ticket-intelligence"
  | "customer-intelligence"
  | "root-cause"
  | "similar-cases"
  | "suggested-actions"
  | "response-draft"
  | "diagnostics"
  | "ticket-timeline"
  // Resolution Intelligence Engine additions
  | "resolution-insights"
  | "ticket-readiness"
  | "case-classification"
  | "troubleshooting-tools"
  | "expert-swarming"
  | "customer-communication"
  | "knowledge-capture"
  | "incident-detection"
  // Adaptive workflow additions
  | "resolution-summary";

// ─── Section State ──────────────────────────────────────────────────────

export interface SectionState {
  visible: boolean;
  collapsed: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// ─── Resolution Workflow ────────────────────────────────────────────────

/** 4-stage adaptive workflow: Intake → Classification → Resolution → Capture */
export type ResolutionStage =
  | "intake"
  | "classification"
  | "resolution"
  | "capture";

/**
 * Resolution module — determines which UI module renders in the Resolution stage.
 * Selected dynamically based on CaseCategory after classification.
 */
export type ResolutionModule =
  | "self-service" // KB article → send to customer
  | "service-request" // Summary → create Jira
  | "known-issue" // Linked issue + workaround + status
  | "troubleshooting" // Diagnostics + root cause + confidence
  | "swarming"; // Experts (activates within troubleshooting when confidence low)

export interface ResolutionWorkflow {
  currentStage: ResolutionStage;
  completedStages: ResolutionStage[];
  /** Which resolution module is currently active in the Resolution stage */
  activeModule: ResolutionModule | null;
  /** Whether swarming overlay is active (within troubleshooting) */
  swarmingActive: boolean;
}

// ─── Next Best Action ───────────────────────────────────────────────────

export type ActionCategory = "respond" | "escalate" | "investigate" | "resolve";

export interface ActionButton {
  id: string;
  label: string;
  /** MCP tool to invoke via tool-bridge (e.g., "zendesk__update_ticket") */
  mcpTool?: string;
  /** Arguments for the MCP tool */
  mcpArgs?: Record<string, unknown>;
  /** Chat prompt to send instead of an MCP tool call */
  chatPrompt?: string;
  variant: "primary" | "secondary" | "ghost";
  requiresHitl: boolean;
}

export interface NextBestAction {
  recommendation: string;
  confidence: number;
  reasoning: string;
  category: ActionCategory;
  actions: ActionButton[];
}

// ─── Ticket Intelligence ────────────────────────────────────────────────

export type SentimentValue = "positive" | "neutral" | "negative" | "angry";

export type SLARiskLevel = "low" | "medium" | "high" | "breach";

export interface SLARisk {
  breachesIn: string;
  riskLevel: SLARiskLevel;
  policyName: string;
}

export interface LinkedJiraIssue {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  url: string;
}

export interface TicketIntelligence {
  ticketId: string;
  subject: string;
  priority: string;
  status: string;
  requester: string;
  assignee: string;
  summary: string;
  sentiment: SentimentValue;
  confidenceScore: number;
  evidence: string[];
  tags: string[];
  relatedArticles: Array<{
    title: string;
    url: string;
    relevance: number;
    sourceId: string;
  }>;
  /** Linked JIRA issues from engineering teams */
  linkedJiraIssues: LinkedJiraIssue[];
  slaRisk: SLARisk | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Customer Intelligence ──────────────────────────────────────────────

export interface CustomerIntelligence {
  name: string;
  email: string;
  org: string;
  tier: string;
  openTickets: number;
  totalTickets: number;
  sentiment: SentimentValue;
  tags: string[];
  /** Annual Recurring Revenue */
  arr?: number;
  /** Recent high-priority incidents */
  recentIncidents?: Array<{
    id: string;
    title: string;
    date: string;
    status: string;
  }>;
}

// ─── Root Cause ─────────────────────────────────────────────────────────

export interface RootCauseSignal {
  description: string;
  confidence: number;
  evidence: string[];
  category: string;
}

// ─── Similar Cases ──────────────────────────────────────────────────────

export interface SimilarCase {
  ticketId: string;
  subject: string;
  status: string;
  resolution: string;
  similarity: number;
  tags: string[];
  /** Where the case was found */
  source?: "zendesk" | "searchunify";
  /** Link to related KB article */
  kbArticleUrl?: string;
  /** Agent who resolved */
  resolvedBy?: string;
  /** Time to resolution */
  resolutionTime?: string;
}

// ─── Suggested Actions ──────────────────────────────────────────────────

export interface SuggestedAction {
  id: string;
  label: string;
  mcpTool?: string;
  mcpArgs?: Record<string, unknown>;
  chatPrompt?: string;
}

// ─── Timeline ───────────────────────────────────────────────────────────

export type TimelineEventType =
  | "customer_reply"
  | "agent_reply"
  | "status_change"
  | "internal_note"
  | "assignment_change"
  | "priority_change"
  | "escalation";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  author: string;
  timestamp: string;
  text: string;
  metadata?: Record<string, string>;
}

// ─── Troubleshooting (reused as-is in root-cause section) ───────────────

export interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  result?: string;
  citation?: string;
}

// ─── Resolution Insights ────────────────────────────────────────────────

export type EvidenceSourceType =
  | "ticket"
  | "kb"
  | "slack"
  | "jira"
  | "incident";

export interface EvidenceSource {
  type: EvidenceSourceType;
  title: string;
  id: string;
  url?: string;
}

export interface ResolutionInsight {
  similarCasesCount: number;
  commonResolutions: Array<{
    description: string;
    frequency: number;
  }>;
  relatedEngineeringIssues: Array<{
    id: string;
    title: string;
    status: string;
    url?: string;
  }>;
  confidence: number;
  evidenceSources: EvidenceSource[];
}

// ─── Ticket Readiness (Stage 1 — Intake) ───────────────────────────────

export type ReadinessField =
  | "product_module"
  | "error_description"
  | "repro_steps"
  | "logs_attached"
  | "version_info";

export interface ReadinessCheck {
  field: ReadinessField;
  label: string;
  present: boolean;
  value?: string;
  action?: ActionButton;
}

export interface TicketReadiness {
  score: number; // 0-100
  checks: ReadinessCheck[];
  missingFields: ReadinessField[];
}

// ─── Case Classification (Stage 2) ─────────────────────────────────────

export type CaseCategory =
  | "self_service"
  | "service_request"
  | "feature_request"
  | "bug_known_issue"
  | "unknown_issue";

export interface CaseClassification {
  category: CaseCategory;
  confidence: number;
  reasoning: string;
  suggestedActions: ActionButton[];
}

// ─── Diagnostic Tools (Resolution — Troubleshooting module) ─────────────

export type DiagnosticToolType =
  | "logs"
  | "diagnostics"
  | "deployments"
  | "metrics";

export type DiagnosticToolStatus =
  | "available"
  | "running"
  | "completed"
  | "failed";

export interface DiagnosticTool {
  id: string;
  label: string;
  description: string;
  type: DiagnosticToolType;
  status: DiagnosticToolStatus;
  result?: string;
  mcpTool?: string;
  mcpArgs?: Record<string, unknown>;
  chatPrompt?: string;
}

// ─── Expert Swarming (Resolution — Swarming module) ────────────────────

export type ExpertAvailability = "available" | "busy" | "offline";

export interface ExpertProfile {
  name: string;
  expertise: string[];
  resolvedSimilar: number;
  availability: ExpertAvailability;
  slackHandle?: string;
}

export interface ExpertSwarming {
  suggestedExperts: ExpertProfile[];
  reasoning: string;
  slackChannelSuggestion?: string;
}

// ─── Customer Communication (Communication Dock) ───────────────────────

export type CommunicationType =
  | "customer_reply"
  | "internal_note"
  | "escalation_message";

export type CommunicationTone = "empathetic" | "technical" | "escalation";

export interface CommunicationTemplate {
  id: string;
  type: CommunicationType;
  subject?: string;
  body: string;
  tone: CommunicationTone;
}

// ─── Knowledge Capture (Stage 4 — Capture) ─────────────────────────────

export type KBArticleStatus = "draft" | "ready_for_review";

export interface KBArticleDraft {
  title: string;
  problem: string;
  rootCause: string;
  resolutionSteps: string[];
  affectedVersions: string[];
  tags: string[];
  status: KBArticleStatus;
}

// ─── Incident Detection ────────────────────────────────────────────────

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface IncidentSignal {
  patternDescription: string;
  affectedTicketIds: string[];
  severity: IncidentSeverity;
  confidence: number;
  suggestedAction: ActionButton;
}

// ─── Adaptive Resolution Module Data ──────────────────────────────────

/** Data for the Self-Service resolution module (KB article answer). */
export interface SelfServiceResolution {
  articleTitle: string;
  articleUrl: string;
  articleSnippet: string;
  confidence: number;
  source: "searchunify" | "zendesk";
}

/** Data for the Known-Issue resolution module. */
export interface KnownIssueResolution {
  issueId: string;
  issueTitle: string;
  issueUrl?: string;
  status: "open" | "in_progress" | "resolved";
  workaround?: string;
  affectedVersions?: string[];
}

/** Data for the Service-Request resolution module. */
export interface ServiceRequestSummary {
  summary: string;
  requestType: string;
  suggestedAction: ActionButton;
}

/** Summary produced during the Capture stage after resolution. */
export interface ResolutionSummary {
  rootCause: string;
  resolutionSteps: string[];
  resolvedVia: ResolutionModule;
  timeToResolve?: string;
}

// ─── Communication Dock ──────────────────────────────────────────────

export type CommunicationDockTab = "reply" | "internal_note" | "escalation";

// ─── Deprecated Aliases (migration helpers) ─────────────────────────────

/** @deprecated Use CanvasSectionId. Will be removed after migration. */
export type CanvasTabId = "briefing" | "troubleshooting" | "response" | "logs";

/** @deprecated Use TicketIntelligence. Will be removed after migration. */
export interface BriefingData {
  ticketId: string;
  subject: string;
  priority: string;
  requester: string;
  summary: string;
  sentiment: SentimentValue;
  relatedArticles: Array<{
    title: string;
    url: string;
    relevance: number;
    sourceId: string;
  }>;
  suggestedActions: string[];
}
