import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";
import {
  getAvailableProviders,
  getDefaultModelForProvider,
} from "@/lib/llm/models";
import { getLLMProvider } from "@/lib/llm/provider-factory";
import type { LLMProviderName } from "@/lib/llm/types";
import { getPrompt } from "@/lib/prompts/prompt-registry";
import type {
  CaseClassification,
  CaseCategory,
  ActionButton,
} from "@/types/canvas";

export const dynamic = "force-dynamic";

// In-memory cache
const classifyCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/classify
 * Classifies a ticket into one of five categories using LLM analysis:
 *   self_service | service_request | feature_request | bug_known_issue | unknown_issue
 * Falls back to heuristic classification when no LLM is available.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check cache
  const cached = classifyCache.get(id);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  let accessToken: string | undefined;
  try {
    const session = await auth();
    accessToken = session?.accessToken ?? undefined;
  } catch {
    // No session
  }

  try {
    // Fetch ticket
    const ticketResult = await callMCPTool(
      "zendesk",
      "get_ticket",
      { ticket_id: id },
      accessToken,
    );

    if (ticketResult.error) {
      return NextResponse.json(
        { error: "zendesk_unreachable" },
        { status: 502 },
      );
    }

    let ticket: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(ticketResult.content?.[0]?.text ?? "{}");
      ticket = parsed.ticket ?? parsed;
    } catch {
      /* empty */
    }

    const subject = String(ticket.subject ?? "");
    const description = String(ticket.description ?? "");
    const tags = Array.isArray(ticket.tags) ? (ticket.tags as string[]) : [];

    // Search SearchUnify for matching KB articles (shared client, no accessToken)
    const searchQuery = subject
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .join(" ");

    let kbArticlesFound = false;
    let kbCount = 0;
    if (searchQuery) {
      const suResult = await callMCPTool("searchunify", "search", {
        searchString: searchQuery,
      }).catch(() => null);

      if (suResult && !suResult.error) {
        try {
          const parsed = JSON.parse(suResult.content?.[0]?.text ?? "[]");
          const results = Array.isArray(parsed)
            ? parsed
            : (parsed.results ?? parsed.hits ?? []);
          kbCount = results.length;
          kbArticlesFound = kbCount > 0;
        } catch {
          /* empty */
        }
      }
    }

    // Try LLM classification
    const env = process.env;
    const availableProviders = getAvailableProviders(env);

    if (availableProviders.length > 0) {
      try {
        const result = await classifyWithLLM(
          id,
          subject,
          description,
          tags,
          kbArticlesFound,
          kbCount,
          availableProviders,
          env,
        );
        classifyCache.set(id, { data: result, createdAt: Date.now() });
        return NextResponse.json(result);
      } catch (error) {
        console.error(
          `[classify] LLM failed for ticket ${id}:`,
          error instanceof Error ? error.message : error,
        );
        // Fall through to heuristic
      }
    }

    // Heuristic fallback
    const result = classifyHeuristic(
      subject,
      description,
      tags,
      kbArticlesFound,
    );
    classifyCache.set(id, { data: result, createdAt: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "classification_failed", message },
      { status: 502 },
    );
  }
}

// ─── LLM Classification ────────────────────────────────────────────

async function classifyWithLLM(
  ticketId: string,
  subject: string,
  description: string,
  tags: string[],
  kbArticlesFound: boolean,
  kbCount: number,
  availableProviders: LLMProviderName[],
  env: Record<string, string | undefined>,
): Promise<CaseClassification> {
  const providerName: LLMProviderName =
    (env.LLM_DEFAULT_PROVIDER as LLMProviderName) ?? availableProviders[0];
  const apiKey =
    env[
      providerName === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : providerName === "openai"
          ? "OPENAI_API_KEY"
          : "GOOGLE_AI_API_KEY"
    ] ?? "";
  const model =
    env.LLM_DEFAULT_MODEL || getDefaultModelForProvider(providerName);

  const provider = getLLMProvider(providerName);

  const prompt = `Classify this support ticket into exactly ONE category and respond with ONLY valid JSON (no markdown, no code blocks):

Ticket #${ticketId}: ${subject}
Tags: ${tags.join(", ") || "none"}
Description: ${description.slice(0, 600)}
KB articles found: ${kbArticlesFound ? `Yes (${kbCount} matches)` : "No"}

Categories:
- "self_service": The issue can be resolved by the customer using existing KB articles or documentation
- "service_request": A configuration change, access request, data operation, or routine service task
- "feature_request": An enhancement request or new capability suggestion
- "bug_known_issue": A bug report, defect, error, or known issue with a known root cause
- "unknown_issue": An issue that requires investigation — no clear root cause or matching known issue

Respond with this exact JSON structure:
{"category":"one_of_the_four_categories","confidence":0.85,"reasoning":"1-2 sentence explanation","suggestedActions":[{"id":"ca-1","label":"action label","chatPrompt":"what to do","variant":"primary","requiresHitl":false}]}`;

  let responseText = "";
  for await (const event of provider.streamCompletion(
    [
      {
        role: "system",
        content: getPrompt("ticket_classify_system"),
      },
      { role: "user", content: prompt },
    ],
    [],
    { apiKey, model, maxTokens: 300 },
  )) {
    if (event.type === "text_delta") {
      responseText += event.text;
    }
  }

  // Parse LLM response
  let aiData: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    aiData = JSON.parse(jsonMatch?.[0] ?? responseText);
  } catch {
    // If JSON parsing fails, fall back to heuristic
    return classifyHeuristic(subject, description, tags, kbArticlesFound);
  }

  const validCategories: CaseCategory[] = [
    "self_service",
    "service_request",
    "feature_request",
    "bug_known_issue",
    "unknown_issue",
  ];
  const category = validCategories.includes(aiData.category as CaseCategory)
    ? (aiData.category as CaseCategory)
    : "unknown_issue";

  const suggestedActions = Array.isArray(aiData.suggestedActions)
    ? (aiData.suggestedActions as ActionButton[]).slice(0, 4)
    : buildDefaultActions(category);

  return {
    category,
    confidence:
      typeof aiData.confidence === "number"
        ? Math.min(Math.max(aiData.confidence, 0), 1)
        : 0.7,
    reasoning: String(aiData.reasoning ?? "Classified by AI analysis"),
    suggestedActions,
  };
}

// ─── Heuristic Classification ──────────────────────────────────────

function classifyHeuristic(
  subject: string,
  description: string,
  tags: string[],
  kbArticlesFound: boolean,
): CaseClassification {
  const combined = `${subject} ${description} ${tags.join(" ")}`.toLowerCase();

  // Feature request signals
  const featureKeywords = [
    "feature request",
    "enhancement",
    "would be nice",
    "it would be great",
    "can you add",
    "please add",
    "suggestion",
    "new feature",
    "improvement",
    "wish list",
  ];
  if (featureKeywords.some((kw) => combined.includes(kw))) {
    return {
      category: "feature_request",
      confidence: 0.65,
      reasoning:
        "Ticket contains feature request language (heuristic classification)",
      suggestedActions: buildDefaultActions("feature_request"),
    };
  }

  // Bug / known issue signals
  const bugKeywords = [
    "bug",
    "error",
    "crash",
    "broken",
    "not working",
    "fails",
    "failure",
    "exception",
    "defect",
    "regression",
    "stack trace",
    "500 error",
    "404",
    "timeout",
    "null pointer",
  ];
  if (bugKeywords.some((kw) => combined.includes(kw))) {
    return {
      category: "bug_known_issue",
      confidence: 0.6,
      reasoning:
        "Ticket contains bug/error indicators (heuristic classification)",
      suggestedActions: buildDefaultActions("bug_known_issue"),
    };
  }

  // Service request signals
  const serviceKeywords = [
    "access",
    "permission",
    "configure",
    "setup",
    "reset password",
    "enable",
    "disable",
    "provision",
    "onboard",
    "data export",
    "data import",
    "migration",
  ];
  if (serviceKeywords.some((kw) => combined.includes(kw))) {
    return {
      category: "service_request",
      confidence: 0.55,
      reasoning:
        "Ticket contains service request keywords (heuristic classification)",
      suggestedActions: buildDefaultActions("service_request"),
    };
  }

  // Self-service if KB articles exist
  if (kbArticlesFound) {
    return {
      category: "self_service",
      confidence: 0.5,
      reasoning:
        "Matching KB articles found; customer may be able to self-resolve (heuristic classification)",
      suggestedActions: buildDefaultActions("self_service"),
    };
  }

  // Default to unknown issue (requires investigation)
  return {
    category: "unknown_issue",
    confidence: 0.3,
    reasoning:
      "No strong signals detected; requires investigation (heuristic classification)",
    suggestedActions: buildDefaultActions("unknown_issue"),
  };
}

// ─── Default Actions Per Category ──────────────────────────────────

function buildDefaultActions(category: CaseCategory): ActionButton[] {
  switch (category) {
    case "self_service":
      return [
        {
          id: "cls-ss-1",
          label: "Find KB Article",
          chatPrompt:
            "Search the knowledge base for articles that could help the customer resolve this issue",
          variant: "primary",
          requiresHitl: false,
        },
        {
          id: "cls-ss-2",
          label: "Draft Self-Service Reply",
          chatPrompt:
            "Draft a reply pointing the customer to relevant self-service resources",
          variant: "secondary",
          requiresHitl: false,
        },
      ];
    case "service_request":
      return [
        {
          id: "cls-sr-1",
          label: "Check Requirements",
          chatPrompt:
            "Determine what information is needed to fulfill this service request",
          variant: "primary",
          requiresHitl: false,
        },
        {
          id: "cls-sr-2",
          label: "Draft Acknowledgment",
          chatPrompt:
            "Draft an acknowledgment reply confirming receipt of the service request and outlining next steps",
          variant: "secondary",
          requiresHitl: false,
        },
      ];
    case "feature_request":
      return [
        {
          id: "cls-fr-1",
          label: "Log Feature Request",
          chatPrompt:
            "Summarize this feature request for the product team, including the use case and business impact",
          variant: "primary",
          requiresHitl: false,
        },
        {
          id: "cls-fr-2",
          label: "Draft Response",
          chatPrompt:
            "Draft a reply acknowledging the feature request and explaining the feedback process",
          variant: "secondary",
          requiresHitl: false,
        },
      ];
    case "bug_known_issue":
      return [
        {
          id: "cls-bi-1",
          label: "Check Known Issues",
          chatPrompt:
            "Search for known issues or existing bug reports that match this ticket",
          variant: "primary",
          requiresHitl: false,
        },
        {
          id: "cls-bi-2",
          label: "Gather Diagnostics",
          chatPrompt:
            "Determine what diagnostic information is needed to investigate this bug",
          variant: "secondary",
          requiresHitl: false,
        },
      ];
    case "unknown_issue":
      return [
        {
          id: "cls-ui-1",
          label: "Start Troubleshooting",
          chatPrompt:
            "Begin troubleshooting this ticket by gathering diagnostics, checking logs, and performing root cause analysis",
          variant: "primary",
          requiresHitl: false,
        },
        {
          id: "cls-ui-2",
          label: "Search for Similar Cases",
          chatPrompt:
            "Search for similar resolved tickets to identify potential solutions or patterns",
          variant: "secondary",
          requiresHitl: false,
        },
      ];
  }
}
