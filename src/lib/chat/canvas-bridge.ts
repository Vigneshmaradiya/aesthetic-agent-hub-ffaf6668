import { useCanvasStore } from "@/stores/canvas-store";
import { useSLAStore } from "@/stores/sla-store";
import type {
  TicketIntelligence,
  SentimentValue,
  NextBestAction,
  RootCauseSignal,
  SimilarCase,
  CustomerIntelligence,
  TimelineEvent,
  ResolutionInsight,
  TicketReadiness,
  CaseClassification,
  ExpertSwarming,
  CaseCategory,
  ResolutionModule,
  SelfServiceResolution,
  KnownIssueResolution,
  LinkedJiraIssue,
  EvidenceSource,
} from "@/types/canvas";

/**
 * Fire all background canvas fetches for a ticket.
 * Used by the Dive-In flow (TriageCard) which already sets ticket
 * intelligence from triage card data but needs the remaining enrichments.
 *
 * Does NOT call fetchAIEnrichment — the caller is expected to handle
 * the /brief fetch separately (TriageCard already does this).
 */
export function fetchCanvasEnrichments(ticketId: string): void {
  fetchSimilarCases(ticketId);
  fetchCustomerIntelligence(ticketId);
  fetchTimeline(ticketId);
  fetchResolutionInsights(ticketId);
  fetchTicketReadiness(ticketId);
}

/**
 * Handle a tool_result SSE event and populate canvas if applicable.
 * Called from both useSSE hook and triggerChatAction.
 */
export function handleToolResultForCanvas(
  toolName: string,
  result: unknown,
): void {
  if (toolName === "zendesk__get_ticket") {
    handleTicketResult(result);
  } else if (toolName === "zendesk__get_ticket_comments") {
    handleTicketComments(result);
  } else if (toolName === "zendesk__create_ticket_comment") {
    handleCreatedComment(result);
  } else if (toolName === "searchunify__search") {
    handleSearchUnifyResult(result);
  } else if (toolName === "jira-onprem__get_issue") {
    handleJiraIssueResult(result);
  } else if (toolName === "jira-onprem__search_issues") {
    handleJiraSearchResult(result);
  }
}

/**
 * Parse a get_ticket result and populate the canvas.
 * Two-phase: show raw ticket data immediately, then fetch AI enrichment.
 */
function handleTicketResult(result: unknown): void {
  const store = useCanvasStore.getState();

  let ticketData: Record<string, unknown>;
  try {
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    ticketData = (raw?.ticket ?? raw) as Record<string, unknown>;
  } catch {
    return;
  }

  if (!ticketData?.id) return;

  const ticketId = String(ticketData.id);

  // Build minimal ticket intelligence from the raw ticket
  const intel: TicketIntelligence = {
    ticketId,
    subject: String(ticketData.subject ?? "Untitled"),
    priority: String(ticketData.priority ?? "normal"),
    status: String(ticketData.status ?? "open"),
    requester: String(
      (ticketData.requester as Record<string, unknown>)?.name ??
        ticketData.requester_name ??
        "Unknown",
    ),
    assignee: String(
      (ticketData.assignee as Record<string, unknown>)?.name ??
        ticketData.assignee_name ??
        "",
    ),
    summary: String(ticketData.description ?? "").slice(0, 300),
    sentiment: "neutral",
    confidenceScore: 0,
    evidence: [],
    tags: Array.isArray(ticketData.tags) ? (ticketData.tags as string[]) : [],
    relatedArticles: [],
    linkedJiraIssues: [],
    slaRisk: null,
    createdAt: String(ticketData.created_at ?? ""),
    updatedAt: String(ticketData.updated_at ?? ""),
  };

  // Load ticket clears everything and sets sections loading
  store.loadTicket(ticketId);
  store.setTicketIntelligence(intel);

  // Compute SLA timers for this ticket
  computeSLAForTicket(intel);

  // Fire parallel background fetches
  fetchAIEnrichment(ticketId);
  fetchSimilarCases(ticketId);
  fetchCustomerIntelligence(ticketId);
  fetchTimeline(ticketId);

  // Resolution Intelligence Engine fetches
  fetchResolutionInsights(ticketId);
  fetchTicketReadiness(ticketId);

  // Set initial workflow stage
  store.setResolutionStage("intake");
}

/**
 * Handle ticket comments and update timeline.
 */
function handleTicketComments(result: unknown): void {
  try {
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    const comments = (raw?.comments ?? raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(comments)) return;

    const events: TimelineEvent[] = comments.map((c, i) => ({
      id: String(c.id ?? `comment-${i}`),
      type: (c.public === false
        ? "internal_note"
        : "customer_reply") as TimelineEvent["type"],
      author: String(
        (c.author as Record<string, unknown>)?.name ??
          c.author_name ??
          "Unknown",
      ),
      timestamp: String(c.created_at ?? ""),
      text: String(c.body ?? c.plain_body ?? "").slice(0, 500),
    }));

    const store = useCanvasStore.getState();
    store.setTimelineEvents(events);
  } catch {
    // Best-effort
  }
}

/**
 * Handle a newly created comment and append it to the timeline.
 * Also re-fetches the full timeline to ensure consistency.
 */
function handleCreatedComment(result: unknown): void {
  try {
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    // The result may be { comment: {...} } or the comment directly
    const comment = (raw?.comment ?? raw?.audit?.events?.[0] ?? raw) as Record<
      string,
      unknown
    >;
    if (!comment || typeof comment !== "object") return;

    const store = useCanvasStore.getState();
    if (!store.activeTicketId) return;

    // Append the new comment to the existing timeline immediately
    const newEvent: TimelineEvent = {
      id: String(comment.id ?? `created-${Date.now()}`),
      type: (comment.public === false
        ? "internal_note"
        : "agent_reply") as TimelineEvent["type"],
      author: String(
        (comment.author as Record<string, unknown>)?.name ??
          comment.author_name ??
          store.ticketIntelligence?.requester ??
          "Agent",
      ),
      timestamp: String(comment.created_at ?? new Date().toISOString()),
      text: String(comment.body ?? comment.plain_body ?? "").slice(0, 500),
    };

    const existingEvents = store.timelineEvents;
    // Avoid duplicates by checking ID
    const isDuplicate = existingEvents.some((e) => e.id === newEvent.id);
    if (!isDuplicate) {
      store.setTimelineEvents([...existingEvents, newEvent]);
    }

    // Also re-fetch the full timeline for consistency
    fetchTimeline(store.activeTicketId);
  } catch {
    // Best-effort — still try to refresh timeline
    const store = useCanvasStore.getState();
    if (store.activeTicketId) {
      fetchTimeline(store.activeTicketId);
    }
  }
}

/**
 * Fetch AI-enriched briefing and update the store.
 */
async function fetchAIEnrichment(ticketId: string): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("next-best-action", { loading: true });
  store.setSectionState("suggested-actions", { loading: true });

  try {
    const response = await fetch(`/api/tickets/${ticketId}/brief`);
    if (!response.ok) return;

    const enriched = (await response.json()) as Record<string, unknown>;

    // Only update if still viewing the same ticket
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    const validSentiments = ["positive", "neutral", "negative", "angry"];

    // Parse linked JIRA issues from brief response
    const briefJiraIssues: LinkedJiraIssue[] = Array.isArray(
      enriched.linkedJiraIssues,
    )
      ? (enriched.linkedJiraIssues as Array<Record<string, unknown>>).map(
          (j) => ({
            key: String(j.key ?? ""),
            summary: String(j.summary ?? j.key ?? ""),
            status: String(j.status ?? "Open"),
            priority: String(j.priority ?? ""),
            assignee: String(j.assignee ?? "Unassigned"),
            url: String(j.url ?? ""),
          }),
        )
      : [];

    // Update ticket intelligence with enriched data
    if (current.ticketIntelligence) {
      current.setTicketIntelligence({
        ...current.ticketIntelligence,
        summary: String(enriched.summary ?? current.ticketIntelligence.summary),
        sentiment: validSentiments.includes(enriched.sentiment as string)
          ? (enriched.sentiment as SentimentValue)
          : current.ticketIntelligence.sentiment,
        confidenceScore:
          typeof enriched.confidenceScore === "number"
            ? enriched.confidenceScore
            : current.ticketIntelligence.confidenceScore,
        evidence: Array.isArray(enriched.evidence)
          ? (enriched.evidence as string[])
          : current.ticketIntelligence.evidence,
        relatedArticles: Array.isArray(enriched.relatedArticles)
          ? (enriched.relatedArticles as TicketIntelligence["relatedArticles"])
          : current.ticketIntelligence.relatedArticles,
        linkedJiraIssues:
          briefJiraIssues.length > 0
            ? briefJiraIssues
            : current.ticketIntelligence.linkedJiraIssues,
        slaRisk: enriched.slaRisk
          ? (enriched.slaRisk as TicketIntelligence["slaRisk"])
          : current.ticketIntelligence.slaRisk,
      });
    }

    // Set next best action if provided
    if (enriched.nextBestAction) {
      current.setNextBestAction(enriched.nextBestAction as NextBestAction);
    } else {
      current.setSectionState("next-best-action", { loading: false });
    }

    // Set root cause if provided
    if (enriched.rootCause) {
      current.setRootCauseSignals([enriched.rootCause as RootCauseSignal]);

      // Auto-activate swarming when confidence is low + priority is high
      const rootCause = enriched.rootCause as RootCauseSignal;
      const ticket = current.ticketIntelligence;
      if (
        rootCause.confidence < 0.5 &&
        (ticket?.priority === "high" || ticket?.priority === "urgent")
      ) {
        const latest = useCanvasStore.getState();
        latest.activateSwarming();
        fetchExperts(ticketId);
      }
    }

    // Set suggested actions if provided
    if (Array.isArray(enriched.suggestedActions)) {
      const actions = (
        enriched.suggestedActions as Array<Record<string, unknown>>
      ).map((a, i) => ({
        id: String(a.id ?? `sa-${i}`),
        label: String(a.label ?? a),
        mcpTool: a.mcpTool as string | undefined,
        mcpArgs: a.mcpArgs as Record<string, unknown> | undefined,
        chatPrompt: a.chatPrompt as string | undefined,
      }));
      current.setSuggestedActions(actions);
    } else {
      current.setSectionState("suggested-actions", { loading: false });
    }

    // Merge linked JIRA issues into resolution insights
    if (Array.isArray(enriched.linkedJiraIssues)) {
      mergeJiraIssuesIntoInsights(
        enriched.linkedJiraIssues as Array<Record<string, unknown>>,
      );
    }
  } catch {
    const current = useCanvasStore.getState();
    current.setSectionState("next-best-action", { loading: false });
    current.setSectionState("suggested-actions", { loading: false });
  }
}

/**
 * Exported so canvas sections can trigger a manual refresh (bypasses cache).
 */
export function refreshSimilarCases(): void {
  const ticketId = useCanvasStore.getState().activeTicketId;
  if (ticketId) {
    void fetchSimilarCasesInternal(ticketId, true);
  }
}

/**
 * Fetch similar cases for the ticket.
 */
async function fetchSimilarCases(ticketId: string): Promise<void> {
  return fetchSimilarCasesInternal(ticketId, false);
}

async function fetchSimilarCasesInternal(
  ticketId: string,
  refresh: boolean,
): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("similar-cases", { loading: true });

  try {
    const url = refresh
      ? `/api/tickets/${ticketId}/similar?refresh=true`
      : `/api/tickets/${ticketId}/similar`;
    const response = await fetch(url);
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("similar-cases", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (Array.isArray(data.cases)) {
      current.setSimilarCases(data.cases as SimilarCase[]);
    } else {
      current.setSectionState("similar-cases", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("similar-cases", { loading: false });
  }
}

/**
 * Fetch customer intelligence for the ticket.
 */
async function fetchCustomerIntelligence(ticketId: string): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("customer-intelligence", { loading: true });

  try {
    const response = await fetch(`/api/tickets/${ticketId}/customer`);
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("customer-intelligence", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (data.name) {
      current.setCustomerIntelligence(data as unknown as CustomerIntelligence);
    } else {
      current.setSectionState("customer-intelligence", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("customer-intelligence", { loading: false });
  }
}

/**
 * Fetch timeline events for the ticket.
 */
async function fetchTimeline(ticketId: string): Promise<void> {
  try {
    const response = await fetch(`/api/tickets/${ticketId}/timeline`);
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("ticket-timeline", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (Array.isArray(data.events)) {
      current.setTimelineEvents(data.events as TimelineEvent[]);
    } else {
      current.setSectionState("ticket-timeline", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("ticket-timeline", { loading: false });
  }
}

/**
 * Fetch resolution insights for the ticket.
 */
async function fetchResolutionInsights(ticketId: string): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("resolution-insights", { loading: true });

  try {
    const response = await fetch(
      `/api/tickets/${ticketId}/resolution-insights`,
    );
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("resolution-insights", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (data.similarCasesCount !== undefined) {
      current.setResolutionInsights(data as unknown as ResolutionInsight);

      // Sync KB evidence sources into ticketIntelligence.relatedArticles so the
      // "Related Articles" row in Insights is populated even when the brief API
      // returns no relatedArticles (it currently hardcodes []).
      const insights = data as unknown as ResolutionInsight;
      const kbSources = (insights.evidenceSources ?? []).filter(
        (s) => s.type === "kb" && s.title,
      );
      if (kbSources.length > 0) {
        const latest = useCanvasStore.getState();
        if (latest.activeTicketId === ticketId && latest.ticketIntelligence) {
          const existingTitles = new Set(
            latest.ticketIntelligence.relatedArticles.map((a) =>
              a.title.toLowerCase(),
            ),
          );
          const newArticles = kbSources
            .filter((s) => !existingTitles.has(s.title.toLowerCase()))
            .map((s) => ({
              title: s.title,
              sourceId: s.id,
              url: s.url ?? "",
              relevance: insights.confidence > 0 ? insights.confidence : 0.5,
            }));
          if (newArticles.length > 0) {
            latest.setTicketIntelligence({
              ...latest.ticketIntelligence,
              relatedArticles: [
                ...latest.ticketIntelligence.relatedArticles,
                ...newArticles,
              ],
            });
          }
        }
      }
    } else {
      current.setSectionState("resolution-insights", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("resolution-insights", { loading: false });
  }
}

/**
 * Fetch ticket readiness assessment for the ticket.
 */
async function fetchTicketReadiness(ticketId: string): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("ticket-readiness", { loading: true });

  try {
    const response = await fetch(`/api/tickets/${ticketId}/readiness`);
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("ticket-readiness", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (data.score !== undefined) {
      const readinessData = data as unknown as TicketReadiness;
      current.setTicketReadiness(readinessData);

      // Always advance to classification after readiness assessment.
      // Readiness score is advisory (shown in the UI) — not a gate.
      // Low-readiness tickets still need classification to route properly.
      const current2 = useCanvasStore.getState();
      current2.advanceStage("classification");
      fetchCaseClassification(ticketId);
    } else {
      current.setSectionState("ticket-readiness", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("ticket-readiness", { loading: false });
  }
}

/**
 * Category → Resolution Module mapping.
 * Determines which adaptive module renders after classification.
 */
const CATEGORY_TO_MODULE: Record<CaseCategory, ResolutionModule> = {
  self_service: "self-service",
  service_request: "service-request",
  bug_known_issue: "known-issue",
  unknown_issue: "troubleshooting",
  feature_request: "service-request", // Feature requests use service-request flow
};

/**
 * Fetch case classification for the ticket.
 * After classification, auto-advance to Resolution stage and activate the
 * appropriate resolution module based on the case category.
 */
async function fetchCaseClassification(ticketId: string): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("case-classification", { loading: true });

  try {
    const response = await fetch(`/api/tickets/${ticketId}/classify`);
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("case-classification", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (data.category) {
      current.setCaseClassification(data as unknown as CaseClassification);

      // Check if the ticket is already resolved — skip to Capture stage
      const ticketStatus = current.ticketIntelligence?.status?.toLowerCase();
      const isAlreadyResolved =
        ticketStatus === "solved" ||
        ticketStatus === "closed" ||
        ticketStatus === "resolved";

      if (isAlreadyResolved) {
        // Ticket is already resolved — advance directly to Capture
        const current2 = useCanvasStore.getState();
        current2.advanceStage("resolution");
        // Still set the module for context (shows what resolution path was used)
        const resolvedModule =
          CATEGORY_TO_MODULE[data.category as CaseCategory] ??
          "troubleshooting";
        current2.setResolutionModule(resolvedModule);
        // Then immediately advance to capture
        const current3 = useCanvasStore.getState();
        current3.advanceStage("capture");
        return;
      }

      // Auto-advance workflow to the adaptive Resolution stage
      const current2 = useCanvasStore.getState();
      current2.advanceStage("resolution");

      // Route to the correct resolution module based on classification
      const resolvedModule =
        CATEGORY_TO_MODULE[data.category as CaseCategory] ?? "troubleshooting";
      current2.setResolutionModule(resolvedModule);

      // Fetch module-specific data
      if (resolvedModule === "self-service") {
        buildSelfServiceFromInsights(ticketId);
      }
      // troubleshooting / known-issue: root cause already fetched via /brief
      // service-request: suggested actions already fetched via /brief
    } else {
      current.setSectionState("case-classification", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("case-classification", { loading: false });
  }
}

/**
 * Build self-service resolution data from resolution insights.
 * Takes the top KB article from evidenceSources.
 */
function buildSelfServiceFromInsights(ticketId: string): void {
  const store = useCanvasStore.getState();
  if (store.activeTicketId !== ticketId) return;

  const insights = store.resolutionInsights;
  if (!insights?.evidenceSources?.length) return;

  // Find the first KB-type evidence source
  const kbSource = insights.evidenceSources.find((s) => s.type === "kb");
  if (!kbSource) return;

  const selfService: SelfServiceResolution = {
    articleTitle: kbSource.title,
    articleUrl: kbSource.url ?? "",
    articleSnippet: "",
    confidence: insights.confidence,
    source: "searchunify",
  };

  store.setSelfServiceResolution(selfService);
}

/**
 * Fetch expert suggestions for the ticket.
 * Exported so it can be triggered from the swarming stage or OmniBar commands.
 */
export async function fetchExperts(ticketId: string): Promise<void> {
  const store = useCanvasStore.getState();
  store.setSectionState("expert-swarming", { loading: true });

  try {
    const response = await fetch(`/api/tickets/${ticketId}/experts`);
    if (!response.ok) {
      useCanvasStore
        .getState()
        .setSectionState("expert-swarming", { loading: false });
      return;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const current = useCanvasStore.getState();
    if (current.activeTicketId !== ticketId) return;

    if (data.suggestedExperts) {
      current.setExpertSwarming(data as unknown as ExpertSwarming);
    } else {
      current.setSectionState("expert-swarming", { loading: false });
    }
  } catch {
    useCanvasStore
      .getState()
      .setSectionState("expert-swarming", { loading: false });
  }
}

/**
 * Handle SearchUnify search results from the agent's searchunify__search tool call.
 * Populates resolution insights if not yet set.
 */
function handleSearchUnifyResult(result: unknown): void {
  try {
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    const results: Record<string, unknown>[] = Array.isArray(raw)
      ? raw
      : (raw?.results ?? raw?.hits ?? raw?.items ?? []);
    if (!Array.isArray(results) || results.length === 0) return;

    const store = useCanvasStore.getState();
    if (!store.activeTicketId) return;

    // If we don't have resolution insights yet, build them from this search
    if (!store.resolutionInsights) {
      const evidenceSources = results.slice(0, 10).map((r) => ({
        type: "kb" as const,
        title: String(r.title ?? r.name ?? "Untitled"),
        id: String(r.id ?? r.uid ?? r.url ?? ""),
        url: r.url ? String(r.url) : undefined,
      }));

      const insight: ResolutionInsight = {
        similarCasesCount: results.length,
        commonResolutions: [],
        relatedEngineeringIssues: [],
        confidence: 0.6,
        evidenceSources,
      };
      store.setResolutionInsights(insight);
    }
  } catch {
    // Best-effort
  }
}

// ─── SLA Computation Helper ──────────────────────────────────────────

/**
 * Compute SLA timers for a ticket and store them in the SLA store.
 * Called when ticket intelligence is first set or updated.
 */
export function computeSLAForTicket(intel: TicketIntelligence): void {
  const resolvedStatuses = ["solved", "closed", "resolved"];
  const isResolved = resolvedStatuses.includes(intel.status.toLowerCase());

  useSLAStore.getState().computeForTicket({
    ticketId: intel.ticketId,
    priority: intel.priority,
    createdAt: intel.createdAt,
    isResolved,
  });
}

// ─── JIRA → Ticket Intelligence Helpers ─────────────────────────────

/**
 * Merge a single JIRA issue into ticketIntelligence.linkedJiraIssues.
 * Deduplicates by key.
 */
function mergeJiraIssueIntoIntelligence(issue: LinkedJiraIssue): void {
  const store = useCanvasStore.getState();
  if (!store.ticketIntelligence || !issue.key) return;

  const existing = store.ticketIntelligence.linkedJiraIssues ?? [];
  if (existing.some((j) => j.key === issue.key)) return; // already present

  store.setTicketIntelligence({
    ...store.ticketIntelligence,
    linkedJiraIssues: [...existing, issue],
  });
}

// ─── JIRA Tool Result Handlers ──────────────────────────────────────

/**
 * Deduplicate engineering issues by ID (keep first occurrence).
 */
function deduplicateIssues(
  issues: Array<{ id: string; title: string; status: string; url?: string }>,
): Array<{ id: string; title: string; status: string; url?: string }> {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

/**
 * Merge JIRA issues into the resolution insights store.
 * Works whether insights already exist or not.
 */
function mergeJiraIssuesIntoInsights(
  jiraIssues: Array<Record<string, unknown>>,
): void {
  if (jiraIssues.length === 0) return;

  const store = useCanvasStore.getState();
  if (!store.activeTicketId) return;

  const existing = store.resolutionInsights;

  const newEngineeringIssues = jiraIssues.map((j) => ({
    id: String(j.key ?? ""),
    title: String(j.summary ?? j.key ?? ""),
    status: String(j.status ?? "Open"),
    url: j.url ? String(j.url) : undefined,
  }));

  const newEvidenceSources: EvidenceSource[] = jiraIssues.map((j) => ({
    type: "jira" as const,
    title: String(j.summary ?? j.key ?? ""),
    id: String(j.key ?? ""),
    url: j.url ? String(j.url) : undefined,
  }));

  store.setResolutionInsights({
    similarCasesCount: existing?.similarCasesCount ?? 0,
    commonResolutions: existing?.commonResolutions ?? [],
    relatedEngineeringIssues: deduplicateIssues([
      ...(existing?.relatedEngineeringIssues ?? []),
      ...newEngineeringIssues,
    ]),
    confidence: existing?.confidence ?? 0,
    evidenceSources: [
      ...(existing?.evidenceSources ?? []),
      ...newEvidenceSources,
    ],
  });
}

/**
 * Handle a jira-onprem__get_issue tool result from the agent loop.
 * Updates resolution insights with the issue details, and optionally
 * sets knownIssueResolution if the issue looks like a known bug.
 */
function handleJiraIssueResult(result: unknown): void {
  try {
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    if (!raw || typeof raw !== "object") return;

    const store = useCanvasStore.getState();
    if (!store.activeTicketId) return;

    const issueKey = String((raw as Record<string, unknown>).key ?? "");
    const summary = String(
      (raw as Record<string, unknown>).summary ?? issueKey,
    );
    const status = String((raw as Record<string, unknown>).status ?? "Open");
    const url = (raw as Record<string, unknown>).url
      ? String((raw as Record<string, unknown>).url)
      : undefined;
    const issueType = String(
      (raw as Record<string, unknown>).type ?? "",
    ).toLowerCase();
    const description = String(
      (raw as Record<string, unknown>).description ?? "",
    );

    if (!issueKey) return;

    // Merge into resolution insights
    mergeJiraIssuesIntoInsights([{ key: issueKey, summary, status, url }]);

    // Also merge into ticket intelligence so Intel chip shows JIRA context
    mergeJiraIssueIntoIntelligence({
      key: issueKey,
      summary,
      status,
      priority: String((raw as Record<string, unknown>).priority ?? ""),
      assignee: String(
        (raw as Record<string, unknown>).assignee ?? "Unassigned",
      ),
      url: url ?? "",
    });

    // If this is a Bug type, also set it as a known issue resolution
    if (issueType === "bug" || issueType === "defect") {
      const knownIssue: KnownIssueResolution = {
        issueId: issueKey,
        issueTitle: summary,
        issueUrl: url,
        status:
          status.toLowerCase() === "in progress"
            ? "in_progress"
            : status.toLowerCase() === "resolved" ||
                status.toLowerCase() === "done" ||
                status.toLowerCase() === "closed"
              ? "resolved"
              : "open",
        workaround:
          description.length > 0 ? description.slice(0, 500) : undefined,
      };
      store.setKnownIssueResolution(knownIssue);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Handle a jira-onprem__search_issues tool result from the agent loop.
 * Merges found issues into resolution insights.
 */
function handleJiraSearchResult(result: unknown): void {
  try {
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    if (!raw || typeof raw !== "object") return;

    const issues = Array.isArray(raw)
      ? raw
      : (((raw as Record<string, unknown>).issues as
          | Array<Record<string, unknown>>
          | undefined) ?? []);
    if (!Array.isArray(issues) || issues.length === 0) return;

    const store = useCanvasStore.getState();
    if (!store.activeTicketId) return;

    mergeJiraIssuesIntoInsights(issues);

    // Also merge into ticket intelligence so Intel chip shows JIRA context
    for (const issue of issues) {
      mergeJiraIssueIntoIntelligence({
        key: String(issue.key ?? ""),
        summary: String(issue.summary ?? issue.key ?? ""),
        status: String(issue.status ?? "Open"),
        priority: String(issue.priority ?? ""),
        assignee: String(issue.assignee ?? "Unassigned"),
        url: issue.url ? String(issue.url) : "",
      });
    }
  } catch {
    // Best-effort
  }
}
