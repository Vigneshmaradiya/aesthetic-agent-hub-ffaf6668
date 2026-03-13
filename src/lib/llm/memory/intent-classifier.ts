/**
 * Lightweight intent classification for user messages.
 *
 * Uses keyword matching + patterns (fast path) to determine
 * what the user is trying to do. This drives proactive context
 * enrichment — e.g., auto-fetching a ticket when a ticket ID
 * is mentioned, or proactively searching KB for an error code.
 */

export type UserIntent =
  | "ticket_lookup"
  | "ticket_listing"
  | "ticket_update"
  | "kb_search"
  | "log_analysis"
  | "draft_response"
  | "general_question"
  | "escalation"
  | "status_check"
  | "greeting"
  | "readiness_check"
  | "classify_case"
  | "run_diagnostics"
  | "swarm_experts"
  | "generate_kb_article"
  | "detect_incident"
  | "unknown";

interface IntentPattern {
  intent: UserIntent;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "ticket_listing",
    patterns: [
      /(?:my|assigned to me)\s*tickets/i,
      /tickets?\s*(?:assigned|belonging)\s*to\s*me/i,
      /(?:recent|latest|new|open|pending)\s*tickets?(?!\s*\d)/i,
      /what(?:'s| is|'re| are)\s*(?:in )?my\s*(?:queue|tickets|workload)/i,
      /(?:show|list|get|fetch)\s*(?:my |all |recent |the )?tickets(?!\s*\d)/i,
      /how many tickets/i,
    ],
    keywords: [
      "my tickets",
      "assigned to me",
      "queue",
      "recent tickets",
      "list tickets",
      "open tickets",
    ],
  },
  {
    intent: "ticket_lookup",
    patterns: [
      /(?:#|ticket\s*)(\d{3,})/i,
      /look\s*(?:up|at|into)/i,
      /what(?:'s| is) (?:the |this )?ticket/i,
      /show me (?:the )?ticket/i,
      /get (?:the )?details/i,
      /pull up/i,
      /check (?:on )?ticket/i,
    ],
    keywords: ["ticket", "details", "info", "lookup", "fetch", "find ticket"],
  },
  {
    intent: "ticket_update",
    patterns: [
      /update (?:(?:the|this) )?(?:ticket|#?\d{3,})/i,
      /change (?:(?:the|this) )?(?:status|priority|assignee)/i,
      /(?:set|change|update)\b.*(?:priority|status|assignee)/i,
      /assign (?:to|this)/i,
      /close (?:(?:the|this) )?(?:ticket|issue|case)/i,
      /(?:close|resolve)\b.*(?:as |the |this )?(?:resolved|done|completed|fixed)/i,
      /reopen/i,
      /mark (?:as |this )?(?:resolved|closed|open|pending)/i,
      /add (?:a )?(?:comment|note|reply)/i,
      /respond to (?:the )?ticket/i,
    ],
    keywords: [
      "update",
      "change",
      "modify",
      "assign",
      "close",
      "reopen",
      "comment",
      "reply",
      "resolve",
      "priority",
    ],
  },
  {
    intent: "kb_search",
    patterns: [
      /search (?:the )?(?:kb|knowledge|docs|articles)/i,
      /(?:is there|do we have) (?:a |an )?(?:article|doc|guide)/i,
      /how (?:to|do|can)/i,
      /what (?:is|are|does)/i,
      /troubleshoot/i,
      /documentation/i,
    ],
    keywords: [
      "search",
      "knowledge base",
      "kb",
      "article",
      "docs",
      "documentation",
      "guide",
      "how to",
      "troubleshoot",
      "solution",
    ],
  },
  {
    intent: "log_analysis",
    patterns: [
      /(?:parse|analyze|check|look at) (?:the )?(?:logs?|error)/i,
      /log (?:file|entry|entries)/i,
      /stack\s*trace/i,
      /error\s*(?:log|message)/i,
    ],
    keywords: [
      "log",
      "logs",
      "parse",
      "error",
      "stack trace",
      "debug",
      "exception",
    ],
  },
  {
    intent: "draft_response",
    patterns: [
      /(?:draft|write|compose|prepare) (?:a )?(?:response|reply|message)/i,
      /help me (?:respond|reply|write)/i,
      /what (?:should|can) I (?:say|respond|reply)/i,
    ],
    keywords: ["draft", "compose", "write", "response", "reply", "template"],
  },
  {
    intent: "escalation",
    patterns: [
      /escalat/i,
      /(?:this is |it's )?urgent/i,
      /need (?:immediate|urgent)/i,
      /critical (?:issue|problem|bug)/i,
      /(?:p1|p0|sev1|sev0|severity 1)/i,
    ],
    keywords: ["escalate", "urgent", "critical", "severity", "p1", "p0"],
  },
  {
    intent: "status_check",
    patterns: [
      /(?:what(?:'s| is) the )?status/i,
      /how (?:are|is) (?:my |the )?(?:queue|tickets|workload)/i,
      /(?:any |new )?(?:pending|open|unresolved)/i,
      /my (?:queue|tickets|workload)/i,
    ],
    keywords: ["status", "queue", "pending", "open", "workload"],
  },
  {
    intent: "greeting",
    patterns: [/^(?:hi|hello|hey|good (?:morning|afternoon|evening))/i],
    keywords: [],
  },
  {
    intent: "readiness_check",
    patterns: [
      /readiness/i,
      /intake/i,
      /missing info/i,
      /validate.*ticket/i,
      /ticket.*complete/i,
    ],
    keywords: ["readiness", "intake", "missing", "incomplete", "validate"],
  },
  {
    intent: "classify_case",
    patterns: [
      /classify/i,
      /case type/i,
      /self.?service/i,
      /service request/i,
      /feature request/i,
      /\bbug\b/i,
    ],
    keywords: [
      "classify",
      "case type",
      "self-service",
      "service request",
      "feature request",
      "bug",
    ],
  },
  {
    intent: "run_diagnostics",
    patterns: [
      /diagnos/i,
      /troubleshoot/i,
      /check logs/i,
      /run.*diagnostic/i,
      /system metrics/i,
      /deployment/i,
    ],
    keywords: [
      "diagnose",
      "diagnostic",
      "troubleshoot",
      "metrics",
      "deployment",
      "health check",
    ],
  },
  {
    intent: "swarm_experts",
    patterns: [/expert/i, /swarm/i, /who.*solved/i, /find.*engineer/i],
    keywords: ["expert", "swarm", "specialist", "who solved", "find engineer"],
  },
  {
    intent: "generate_kb_article",
    patterns: [
      /knowledge.*article/i,
      /kb.*draft/i,
      /capture.*knowledge/i,
      /document.*resolution/i,
    ],
    keywords: [
      "knowledge article",
      "kb draft",
      "capture",
      "document resolution",
      "publish",
    ],
  },
  {
    intent: "detect_incident",
    patterns: [
      /incident/i,
      /pattern.*ticket/i,
      /surge/i,
      /outbreak/i,
      /multiple.*similar/i,
    ],
    keywords: ["incident", "pattern", "surge", "outbreak", "multiple tickets"],
  },
];

export interface ClassificationResult {
  intent: UserIntent;
  confidence: number; // 0-1
  /** Extracted entities (ticket IDs, error codes, etc.) */
  extractedTicketIds: string[];
  extractedErrorCodes: string[];
}

/**
 * Classify user input into an intent category.
 * Uses keyword matching and pattern matching (fast, no LLM call needed).
 *
 * @returns Classification result with intent, confidence, and extracted entities
 */
export function classifyIntent(input: string): ClassificationResult {
  const normalized = input.toLowerCase().trim();
  let bestIntent: UserIntent = "unknown";
  let bestScore = 0;

  // Extract entities regardless of intent
  const ticketIds = [
    ...new Set(
      Array.from(input.matchAll(/(?:#|ticket\s*)(\d{3,})/gi), (m) => m[1]),
    ),
  ];
  const errorCodes = [
    ...new Set(
      Array.from(
        input.matchAll(
          /(?:error|code|status)\s*[:=]?\s*(\d{3,5}|[A-Z_]{3,})/gi,
        ),
        (m) => m[1],
      ),
    ),
  ];

  for (const { intent, patterns, keywords } of INTENT_PATTERNS) {
    let score = 0;

    // Pattern matching (weighted higher)
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        score += 3;
      }
    }

    // Keyword matching
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // If we found ticket IDs but no better intent, default to ticket_lookup
  if (bestIntent === "unknown" && ticketIds.length > 0) {
    bestIntent = "ticket_lookup";
    bestScore = 2;
  }

  // Normalize confidence to 0-1 range
  const confidence = Math.min(bestScore / 6, 1);

  return {
    intent: bestIntent,
    confidence,
    extractedTicketIds: ticketIds,
    extractedErrorCodes: errorCodes,
  };
}
