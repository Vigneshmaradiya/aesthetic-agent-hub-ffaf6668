import { useCanvasStore } from "@/stores/canvas-store";
import type {
  TroubleshootingStep,
  RootCauseSignal,
  SimilarCase,
  NextBestAction,
  ReadinessField,
  ReadinessCheck,
  CaseCategory,
  IncidentSeverity,
  ResolutionModule,
} from "@/types/canvas";

/**
 * Parse the finalized assistant message for structured canvas data.
 * Called after finalizeStream when a complete assistant message is available.
 */
export function parseAssistantResponseForCanvas(content: string): void {
  parseTroubleshootingSteps(content);
  parseDraftResponse(content);
  parseNextBestAction(content);
  parseRootCause(content);
  parseSimilarCases(content);
  parseTicketReadiness(content);
  parseCaseClassification(content);
  parseResolutionInsights(content);
  parseIncidentDetection(content);
  parseKnowledgeArticleDraft(content);
  // Adaptive workflow parsers
  parseSuggestedReply(content);
  parseResolutionSummary(content);
}

/**
 * Detect troubleshooting steps in the assistant's response.
 */
function parseTroubleshootingSteps(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Troubleshooting|Steps|Resolution Steps|Diagnostic Steps|Next Steps)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1];
  const stepRegex = /^\d+\.\s+\*{0,2}([^*\n:–—-]+)\*{0,2}\s*[:\-–—]\s*(.+)/gm;

  const steps: TroubleshootingStep[] = [];
  let stepMatch;
  let index = 0;

  while ((stepMatch = stepRegex.exec(sectionContent)) !== null) {
    steps.push({
      id: `ts-${Date.now()}-${index++}`,
      title: stepMatch[1].trim(),
      description: stepMatch[2].trim(),
      status: "pending",
    });
  }

  if (steps.length > 0) {
    const store = useCanvasStore.getState();
    store.clearTroubleshootingSteps();
    for (const step of steps) {
      store.addTroubleshootingStep(step);
    }
    store.showSection("root-cause");
    store.setScrollToSection("root-cause");
  }
}

/**
 * Detect a draft response section and populate the Response section.
 */
function parseDraftResponse(content: string): void {
  // Find the start of any draft-related heading, then capture everything until
  // a non-draft heading or end of content. Matches any "### Draft ..." heading
  // (e.g. "Draft Reply", "Draft Internal Note", "Draft Message") as well as
  // "Suggested Reply/Response", "Customer Response", and "Auto-Reply".
  const startRegex =
    /#{1,3}\s*(?:Draft\s+\w[^\n]*|Suggested (?:Reply|Response)[^\n]*|Customer Response[^\n]*|Auto-Reply[^\n]*)/i;
  const startMatch = content.match(startRegex);
  if (!startMatch) return;

  // Capture from after the first draft heading to the next non-draft heading
  const afterHeading = content.slice(startMatch.index! + startMatch[0].length);

  // Strip any additional draft sub-headings and normalize runs of 3+ newlines
  const cleaned = afterHeading
    .replace(
      /^#{1,3}\s*(?:Draft\s+\w[^\n]*|Suggested (?:Reply|Response)[^\n]*|Customer Response[^\n]*|Auto-Reply[^\n]*)\n/gim,
      "",
    )
    .replace(/\n{3,}/g, "\n\n");

  // Take content until the next non-draft heading, horizontal rule, or triple newline
  const endMatch = cleaned.match(
    /\n#{1,3}\s+(?!Draft|Suggested|Customer Response|Auto-Reply)|\n---|\n\n\n/,
  );
  const draft = endMatch
    ? cleaned.slice(0, endMatch.index).trim()
    : cleaned.trim();

  if (draft.length < 10) return;

  const store = useCanvasStore.getState();
  store.setDraftResponse(draft);
  store.showSection("response-draft");
  // Also route to Communication Dock so the engineer can edit/send directly
  store.setSuggestedDraft(draft);
  store.setCommunicationDockExpanded(true);
}

/**
 * Detect a recommended action section in the assistant's response.
 */
function parseNextBestAction(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Recommended Action|Next Best Action|Suggested Action)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract confidence if present (e.g., "Confidence: 87%")
  const confidenceMatch = sectionContent.match(/confidence[:\s]+(\d+)%/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.7;

  // Extract category
  let category: NextBestAction["category"] = "respond";
  if (/escalat/i.test(sectionContent)) category = "escalate";
  else if (/investigat|diagnos/i.test(sectionContent)) category = "investigate";
  else if (/resolv|fix|close/i.test(sectionContent)) category = "resolve";

  // First line is the recommendation, rest is reasoning (preserve newlines for markdown)
  const lines = sectionContent.split("\n").filter((l) => l.trim());
  const recommendation =
    lines[0]?.replace(/^[-*]\s*/, "").trim() ?? sectionContent;
  const reasoning = lines.slice(1).join("\n").trim();

  const store = useCanvasStore.getState();
  store.setNextBestAction({
    recommendation,
    confidence,
    reasoning,
    category,
    actions: [],
  });
}

/**
 * Detect root cause analysis in the assistant's response.
 */
function parseRootCause(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Root Cause|Root-Cause|Underlying Issue|Primary Cause)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  const confidenceMatch = sectionContent.match(/confidence[:\s]+(\d+)%/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.6;

  // Extract evidence bullets
  const evidenceRegex = /^[-*]\s+(.+)/gm;
  const evidence: string[] = [];
  let evMatch;
  while ((evMatch = evidenceRegex.exec(sectionContent)) !== null) {
    evidence.push(evMatch[1].trim());
  }

  // First non-bullet line is description
  const description =
    sectionContent
      .split("\n")
      .find(
        (l) =>
          l.trim() && !l.trim().startsWith("-") && !l.trim().startsWith("*"),
      )
      ?.trim() ?? sectionContent.split("\n")[0].trim();

  const signal: RootCauseSignal = {
    description,
    confidence,
    evidence,
    category: "analysis",
  };

  const store = useCanvasStore.getState();
  store.setRootCauseSignals([signal]);
}

/**
 * Detect similar cases in the assistant's response.
 */
function parseSimilarCases(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Similar Cases|Related Tickets|Matching Tickets)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1];

  // Match patterns like "- #12345: Subject (similarity 85%, resolved)"
  const caseRegex = /[-*]\s*#?(\d+)[:\s]+([^(]+?)(?:\(([^)]+)\))?$/gm;
  const cases: SimilarCase[] = [];
  let caseMatch;

  while ((caseMatch = caseRegex.exec(sectionContent)) !== null) {
    const meta = caseMatch[3] ?? "";
    const similarityMatch = meta.match(/(\d+)%/);
    cases.push({
      ticketId: caseMatch[1],
      subject: caseMatch[2].trim(),
      status: /resolv|solved|closed/i.test(meta) ? "solved" : "open",
      resolution: "",
      similarity: similarityMatch ? parseInt(similarityMatch[1]) / 100 : 0.5,
      tags: [],
    });
  }

  if (cases.length > 0) {
    const store = useCanvasStore.getState();
    store.setSimilarCases(cases);
  }
}

// ─── Field name mapping for Ticket Readiness ──────────────────────────

const READINESS_FIELD_MAP: Record<string, ReadinessField> = {
  product: "product_module",
  product_module: "product_module",
  module: "product_module",
  error: "error_description",
  error_description: "error_description",
  description: "error_description",
  repro: "repro_steps",
  repro_steps: "repro_steps",
  reproduction: "repro_steps",
  reproduction_steps: "repro_steps",
  steps: "repro_steps",
  logs: "logs_attached",
  logs_attached: "logs_attached",
  log: "logs_attached",
  version: "version_info",
  version_info: "version_info",
  versions: "version_info",
};

/**
 * Detect ticket readiness assessment in the assistant's response.
 */
function parseTicketReadiness(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Ticket Readiness|Intake Validation|Readiness Assessment)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract readiness score
  const scoreMatch = sectionContent.match(/(?:score|readiness)[:\s]+(\d+)%/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

  // Extract checklist items: lines matching "- ✓ field_name: ..." or "- ✗ field_name: ..."
  const checkRegex = /^[-*]\s*([✓✗])\s+([^:]+):\s*(.*)$/gm;
  const checks: ReadinessCheck[] = [];
  const missingFields: ReadinessField[] = [];
  let checkMatch;

  while ((checkMatch = checkRegex.exec(sectionContent)) !== null) {
    const present = checkMatch[1] === "✓";
    const rawField = checkMatch[2].trim().toLowerCase().replace(/\s+/g, "_");
    const field = READINESS_FIELD_MAP[rawField];
    if (!field) continue;

    checks.push({
      field,
      label: checkMatch[2].trim(),
      present,
      value: checkMatch[3].trim() || undefined,
    });

    if (!present) {
      missingFields.push(field);
    }
  }

  if (checks.length > 0 || score > 0) {
    const store = useCanvasStore.getState();
    store.setTicketReadiness({ score, checks, missingFields });
    store.showSection("ticket-readiness");
  }
}

/**
 * Detect case classification in the assistant's response.
 */
function parseCaseClassification(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Case Classification|Case Type|Classification)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract the first non-empty line — this is the primary classification
  // statement (e.g. "Unknown Issue — Confidence: 85%"). Matching against the
  // full section text causes false positives when the LLM explains *why* a
  // category was ruled out (e.g. "Not Self-Service: ...").
  const firstLine =
    sectionContent.split("\n").find((l) => l.trim().length > 0) ?? "";

  let category: CaseCategory = "unknown_issue";
  if (/self[- ]?service/i.test(firstLine)) {
    category = "self_service";
  } else if (/service[- ]?request/i.test(firstLine)) {
    category = "service_request";
  } else if (/feature[- ]?request/i.test(firstLine)) {
    category = "feature_request";
  } else if (/bug|known[- ]?issue/i.test(firstLine)) {
    category = "bug_known_issue";
  } else if (/unknown[- ]?issue|troubleshoot/i.test(firstLine)) {
    category = "unknown_issue";
  }

  // Extract confidence
  const confidenceMatch = sectionContent.match(/confidence[:\s]+(\d+)%/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.7;

  // Remaining text as reasoning (first non-empty, non-bullet line after category/confidence)
  const reasoning = sectionContent
    .split("\n")
    .filter(
      (l) =>
        l.trim() &&
        !l.trim().startsWith("-") &&
        !l.trim().startsWith("*") &&
        !/confidence[:\s]+\d+%/i.test(l),
    )
    .join(" ")
    .trim();

  const store = useCanvasStore.getState();
  store.setCaseClassification({
    category,
    confidence,
    reasoning,
    suggestedActions: [],
  });
  store.showSection("case-classification");
}

/**
 * Detect resolution insights in the assistant's response.
 */
function parseResolutionInsights(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Resolution Insights|SearchUnify Insights|Resolution Intelligence)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract similar cases count
  const countMatch = sectionContent.match(/(\d+)\s+similar\s+cases?/i);
  const similarCasesCount = countMatch ? parseInt(countMatch[1]) : 0;

  // Extract resolution list items with frequencies
  const resolutionRegex = /^[-*]\s+(.+?)(?:\s*[:(]\s*(\d+)%?\s*\)?)?$/gm;
  const commonResolutions: Array<{ description: string; frequency: number }> =
    [];
  let resMatch;
  while ((resMatch = resolutionRegex.exec(sectionContent)) !== null) {
    // Skip lines that look like engineering issues
    if (/[A-Z]+-\d+/.test(resMatch[1])) continue;
    commonResolutions.push({
      description: resMatch[1].trim(),
      frequency: resMatch[2] ? parseInt(resMatch[2]) / 100 : 0,
    });
  }

  // Extract engineering issue references (JIRA-123, PROJ-456 patterns)
  const issueRegex = /([A-Z]+-\d+)/g;
  const relatedEngineeringIssues: Array<{
    id: string;
    title: string;
    status: string;
  }> = [];
  const seenIds = new Set<string>();
  let issueMatch;
  while ((issueMatch = issueRegex.exec(sectionContent)) !== null) {
    const id = issueMatch[1];
    if (!seenIds.has(id)) {
      seenIds.add(id);
      relatedEngineeringIssues.push({ id, title: "", status: "unknown" });
    }
  }

  if (
    similarCasesCount > 0 ||
    commonResolutions.length > 0 ||
    relatedEngineeringIssues.length > 0
  ) {
    const store = useCanvasStore.getState();
    store.setResolutionInsights({
      similarCasesCount,
      commonResolutions,
      relatedEngineeringIssues,
      confidence: 0.7,
      evidenceSources: [],
    });
    store.showSection("resolution-insights");
  }
}

/**
 * Detect incident detection signals in the assistant's response.
 */
function parseIncidentDetection(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Incident Detection|Incident Signal|Pattern Detection)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract pattern description (first non-bullet line)
  const patternDescription =
    sectionContent
      .split("\n")
      .find(
        (l) =>
          l.trim() && !l.trim().startsWith("-") && !l.trim().startsWith("*"),
      )
      ?.trim() ?? "";

  // Extract affected ticket IDs (# followed by digits)
  const ticketIdRegex = /#(\d{3,})/g;
  const affectedTicketIds: string[] = [];
  const seenTicketIds = new Set<string>();
  let tidMatch;
  while ((tidMatch = ticketIdRegex.exec(sectionContent)) !== null) {
    if (!seenTicketIds.has(tidMatch[1])) {
      seenTicketIds.add(tidMatch[1]);
      affectedTicketIds.push(tidMatch[1]);
    }
  }

  // Extract severity from keywords
  let severity: IncidentSeverity = "medium";
  if (/\bcritical\b/i.test(sectionContent)) severity = "critical";
  else if (/\bhigh\b/i.test(sectionContent)) severity = "high";
  else if (/\blow\b/i.test(sectionContent)) severity = "low";

  // Extract confidence
  const confidenceMatch = sectionContent.match(/confidence[:\s]+(\d+)%/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.6;

  if (patternDescription || affectedTicketIds.length > 0) {
    const store = useCanvasStore.getState();
    store.setIncidentSignals([
      {
        patternDescription,
        affectedTicketIds,
        severity,
        confidence,
        suggestedAction: {
          id: `incident-action-${Date.now()}`,
          label: "Investigate Incident",
          chatPrompt: "Investigate the detected incident pattern in detail.",
          variant: "primary",
          requiresHitl: false,
        },
      },
    ]);
    store.showSection("incident-detection");
  }
}

/**
 * Detect knowledge article draft in the assistant's response.
 */
function parseKnowledgeArticleDraft(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Knowledge Article Draft|KB Article Draft|Knowledge Base Draft)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract structured fields
  const titleMatch = sectionContent.match(/Title[:\s]+(.+)/i);
  const problemMatch = sectionContent.match(
    /Problem[:\s]+([\s\S]*?)(?=Root Cause[:\s]|Resolution Steps[:\s]|Versions?[:\s]|Affected[:\s]|$)/i,
  );
  const rootCauseMatch = sectionContent.match(
    /Root Cause[:\s]+([\s\S]*?)(?=Resolution Steps[:\s]|Versions?[:\s]|Affected[:\s]|$)/i,
  );

  // Extract resolution steps (numbered list)
  const stepsMatch = sectionContent.match(
    /Resolution Steps[:\s]+([\s\S]*?)(?=Versions?[:\s]|Affected[:\s]|$)/i,
  );
  const resolutionSteps: string[] = [];
  if (stepsMatch) {
    const stepRegex = /^\d+\.\s+(.+)/gm;
    let stepMatch;
    while ((stepMatch = stepRegex.exec(stepsMatch[1])) !== null) {
      resolutionSteps.push(stepMatch[1].trim());
    }
  }

  // Extract affected versions
  const versionsMatch = sectionContent.match(
    /(?:Versions?|Affected)[:\s]+([\s\S]*?)$/i,
  );
  const affectedVersions: string[] = [];
  if (versionsMatch) {
    const versionRegex = /[-*]\s+(.+)/gm;
    let vMatch;
    while ((vMatch = versionRegex.exec(versionsMatch[1])) !== null) {
      affectedVersions.push(vMatch[1].trim());
    }
    // If no bullet items, treat the whole line as a single version
    if (affectedVersions.length === 0) {
      const inlineVersions = versionsMatch[1]
        .trim()
        .split(/[,;]/)
        .map((v) => v.trim())
        .filter(Boolean);
      affectedVersions.push(...inlineVersions);
    }
  }

  const title = titleMatch?.[1]?.trim() ?? "";
  const problem = problemMatch?.[1]?.trim() ?? "";
  const rootCause = rootCauseMatch?.[1]?.trim() ?? "";

  if (title || problem || resolutionSteps.length > 0) {
    const store = useCanvasStore.getState();
    store.setKBArticleDraft({
      title,
      problem,
      rootCause,
      resolutionSteps,
      affectedVersions,
      tags: [],
      status: "draft",
    });
    store.showSection("knowledge-capture");
  }
}

// ─── Adaptive Workflow Parsers ─────────────────────────────────────────

/**
 * Detect a suggested reply section and populate the Communication Dock.
 */
function parseSuggestedReply(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Draft\s+\w[^\n]*|Suggested (?:Reply|Response)[^\n]*|Customer Response[^\n]*|Auto-Reply[^\n]*)\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const draft = match[1].trim();
  if (draft.length < 10) return;

  const store = useCanvasStore.getState();
  store.setSuggestedDraft(draft);
  store.setCommunicationDockExpanded(true);
}

/**
 * Detect a resolution summary section and populate the Resolution Summary.
 */
function parseResolutionSummary(content: string): void {
  const sectionRegex =
    /#{1,3}\s*(?:Resolution Summary|Resolution Outcome)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\n\n|$)/i;
  const match = content.match(sectionRegex);
  if (!match) return;

  const sectionContent = match[1].trim();
  if (sectionContent.length < 10) return;

  // Extract root cause (first non-bullet line or "Root Cause:" field)
  const rootCauseMatch = sectionContent.match(
    /(?:Root Cause|Cause)[:\s]+([\s\S]*?)(?=Resolution Steps|Steps Taken|Resolved Via|$)/i,
  );
  const rootCause =
    rootCauseMatch?.[1]?.trim() ??
    sectionContent
      .split("\n")
      .find((l) => l.trim() && !l.trim().startsWith("-"))
      ?.trim() ??
    "";

  // Extract resolution steps (numbered list)
  const stepsMatch = sectionContent.match(
    /(?:Resolution Steps|Steps Taken)[:\s]+([\s\S]*?)(?=Resolved Via|Time|$)/i,
  );
  const resolutionSteps: string[] = [];
  if (stepsMatch) {
    const stepRegex = /^\d+\.\s+(.+)/gm;
    let stepMatch;
    while ((stepMatch = stepRegex.exec(stepsMatch[1])) !== null) {
      resolutionSteps.push(stepMatch[1].trim());
    }
  }

  // Extract resolvedVia
  const VALID_MODULES: ResolutionModule[] = [
    "self-service",
    "service-request",
    "known-issue",
    "troubleshooting",
    "swarming",
  ];
  let resolvedVia: ResolutionModule = "troubleshooting";
  const resolvedViaMatch = sectionContent.match(/Resolved Via[:\s]+([^\n]+)/i);
  if (resolvedViaMatch) {
    const raw = resolvedViaMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
    if (VALID_MODULES.includes(raw as ResolutionModule)) {
      resolvedVia = raw as ResolutionModule;
    }
  }

  // Extract time to resolve
  const timeMatch = sectionContent.match(
    /(?:Time to Resolve|TTR|Resolution Time)[:\s]+([^\n]+)/i,
  );
  const timeToResolve = timeMatch?.[1]?.trim();

  if (rootCause || resolutionSteps.length > 0) {
    const store = useCanvasStore.getState();
    store.setResolutionSummary({
      rootCause,
      resolutionSteps,
      resolvedVia,
      timeToResolve,
    });
    store.showSection("resolution-summary");
  }
}
