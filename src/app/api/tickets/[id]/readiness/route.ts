import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callMCPTool } from "@/lib/mcp/client";
import type {
  TicketReadiness,
  ReadinessCheck,
  ReadinessField,
  ActionButton,
} from "@/types/canvas";

export const dynamic = "force-dynamic";

// In-memory cache
const readinessCache = new Map<string, { data: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/tickets/[id]/readiness
 * Evaluates ticket readiness by checking 5 criteria:
 * product_module, error_description, repro_steps, logs_attached, version_info.
 * Returns a score (0-100) and action buttons for missing fields.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check cache
  const cached = readinessCache.get(id);
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
    const customFields = Array.isArray(ticket.custom_fields)
      ? (ticket.custom_fields as Record<string, unknown>[])
      : [];
    const attachments = Array.isArray(ticket.attachments)
      ? (ticket.attachments as Record<string, unknown>[])
      : [];

    // ── Check 1: Product / Module ───────────────────────────────────
    const productModulePresent = checkProductModule(
      subject,
      description,
      tags,
      customFields,
    );

    // ── Check 2: Error Description ──────────────────────────────────
    const errorDescriptionPresent = description.trim().length > 20;

    // ── Check 3: Repro Steps ────────────────────────────────────────
    const reproStepsPresent = checkReproSteps(description);

    // ── Check 4: Logs Attached ──────────────────────────────────────
    const logsAttachedPresent = checkLogsAttached(description, attachments);

    // ── Check 5: Version Info ───────────────────────────────────────
    const versionInfoPresent = checkVersionInfo(
      subject,
      description,
      tags,
      customFields,
    );

    // Build readiness checks
    const checks: ReadinessCheck[] = [
      {
        field: "product_module" as ReadinessField,
        label: "Product / Module",
        present: productModulePresent,
        value: productModulePresent
          ? extractProductHint(subject, tags)
          : undefined,
        action: productModulePresent
          ? undefined
          : buildMissingFieldAction(
              "product_module",
              "Ask the customer which product or module is affected",
            ),
      },
      {
        field: "error_description" as ReadinessField,
        label: "Error Description",
        present: errorDescriptionPresent,
        value: errorDescriptionPresent
          ? description.slice(0, 80) + (description.length > 80 ? "..." : "")
          : undefined,
        action: errorDescriptionPresent
          ? undefined
          : buildMissingFieldAction(
              "error_description",
              "Ask the customer to describe the error or issue they are experiencing in detail",
            ),
      },
      {
        field: "repro_steps" as ReadinessField,
        label: "Reproduction Steps",
        present: reproStepsPresent,
        value: reproStepsPresent ? "Steps detected in description" : undefined,
        action: reproStepsPresent
          ? undefined
          : buildMissingFieldAction(
              "repro_steps",
              "Ask the customer to provide step-by-step instructions to reproduce the issue",
            ),
      },
      {
        field: "logs_attached" as ReadinessField,
        label: "Logs / Attachments",
        present: logsAttachedPresent,
        value: logsAttachedPresent
          ? attachments.length > 0
            ? `${attachments.length} attachment(s)`
            : "Log content in description"
          : undefined,
        action: logsAttachedPresent
          ? undefined
          : buildMissingFieldAction(
              "logs_attached",
              "Ask the customer to attach relevant log files, error screenshots, or stack traces",
            ),
      },
      {
        field: "version_info" as ReadinessField,
        label: "Version Information",
        present: versionInfoPresent,
        value: versionInfoPresent
          ? extractVersionHint(subject, description, tags)
          : undefined,
        action: versionInfoPresent
          ? undefined
          : buildMissingFieldAction(
              "version_info",
              "Ask the customer for the product version, build number, or environment details",
            ),
      },
    ];

    const presentCount = checks.filter((c) => c.present).length;
    const score = Math.round((presentCount / 5) * 100);
    const missingFields = checks.filter((c) => !c.present).map((c) => c.field);

    const result: TicketReadiness = {
      score,
      checks,
      missingFields,
    };

    readinessCache.set(id, { data: result, createdAt: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "readiness_check_failed", message },
      { status: 502 },
    );
  }
}

// ─── Helper: Check Product / Module ─────────────────────────────────

function checkProductModule(
  subject: string,
  description: string,
  tags: string[],
  customFields: Record<string, unknown>[],
): boolean {
  // Check custom fields for product/module values
  const productFieldIds = ["product", "module", "component", "product_name"];
  for (const field of customFields) {
    const fieldId = String(field.id ?? field.name ?? "").toLowerCase();
    if (productFieldIds.some((p) => fieldId.includes(p)) && field.value) {
      return true;
    }
  }

  // Check tags for product-like names (common patterns)
  const productTags = tags.filter(
    (t) =>
      ![
        "urgent",
        "high",
        "normal",
        "low",
        "open",
        "pending",
        "solved",
      ].includes(t.toLowerCase()),
  );
  if (productTags.length > 0) return true;

  // Check subject/description for product mentions
  const combined = `${subject} ${description}`.toLowerCase();
  const productKeywords = [
    "module",
    "product",
    "component",
    "service",
    "feature",
    "platform",
    "dashboard",
    "api",
    "sdk",
    "plugin",
    "integration",
  ];
  return productKeywords.some((kw) => combined.includes(kw));
}

function extractProductHint(subject: string, tags: string[]): string {
  // Return first meaningful tag or truncated subject
  const meaningfulTags = tags.filter(
    (t) =>
      ![
        "urgent",
        "high",
        "normal",
        "low",
        "open",
        "pending",
        "solved",
      ].includes(t.toLowerCase()),
  );
  if (meaningfulTags.length > 0) return meaningfulTags[0];
  return subject.slice(0, 50);
}

// ─── Helper: Check Repro Steps ──────────────────────────────────────

function checkReproSteps(description: string): boolean {
  const lower = description.toLowerCase();

  // Check for explicit repro step headers
  const reproPatterns = [
    "steps to reproduce",
    "how to reproduce",
    "reproduction steps",
    "repro steps",
    "to reproduce",
    "steps:",
  ];
  if (reproPatterns.some((p) => lower.includes(p))) return true;

  // Check for numbered steps (e.g., "1. " "2. " "3. ")
  const numberedSteps = description.match(/\b\d+\.\s+/g);
  if (numberedSteps && numberedSteps.length >= 2) return true;

  // Check for bullet steps
  const bulletSteps = description.match(/^\s*[-*]\s+/gm);
  if (bulletSteps && bulletSteps.length >= 3) return true;

  return false;
}

// ─── Helper: Check Logs / Attachments ───────────────────────────────

function checkLogsAttached(
  description: string,
  attachments: Record<string, unknown>[],
): boolean {
  // Has actual file attachments
  if (attachments.length > 0) return true;

  // Check for log-like content in description
  const logPatterns = [
    /\b(ERROR|WARN|FATAL|EXCEPTION|CRITICAL)\b/,
    /\bat\s+[\w$.]+\([\w.]+:\d+\)/, // stack trace pattern
    /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/, // timestamp pattern
    /\bstack\s*trace\b/i,
    /\btraceback\b/i,
    /\bException\b/,
    /\bSegmentation fault\b/i,
  ];

  return logPatterns.some((p) => p.test(description));
}

// ─── Helper: Check Version Info ─────────────────────────────────────

function checkVersionInfo(
  subject: string,
  description: string,
  tags: string[],
  customFields: Record<string, unknown>[],
): boolean {
  // Check custom fields
  const versionFieldIds = ["version", "build", "release", "environment"];
  for (const field of customFields) {
    const fieldId = String(field.id ?? field.name ?? "").toLowerCase();
    if (versionFieldIds.some((v) => fieldId.includes(v)) && field.value) {
      return true;
    }
  }

  const combined = `${subject} ${description} ${tags.join(" ")}`;

  // Check for version patterns
  const versionPatterns = [
    /\bv\d+(\.\d+)*/i, // v1, v2.1, v3.2.1
    /\b\d+\.\d+\.\d+\b/, // 1.2.3 semver-like
    /\bversion\s*[:=]?\s*\S+/i, // "version: X" or "version X"
    /\bbuild\s*[:=#]?\s*\d+/i, // "build: 123"
    /\brelease\s*[:=]?\s*\S+/i, // "release: X"
  ];

  return versionPatterns.some((p) => p.test(combined));
}

function extractVersionHint(
  subject: string,
  description: string,
  tags: string[],
): string {
  const combined = `${subject} ${description} ${tags.join(" ")}`;
  const match = combined.match(
    /\b(v\d+(?:\.\d+)*|\d+\.\d+\.\d+(?:[.-]\w+)?)\b/i,
  );
  return match ? match[0] : "Version detected";
}

// ─── Helper: Build Missing Field Action ─────────────────────────────

function buildMissingFieldAction(
  field: string,
  chatPrompt: string,
): ActionButton {
  return {
    id: `readiness-${field}`,
    label: `Request ${field.replace(/_/g, " ")}`,
    chatPrompt,
    variant: "secondary",
    requiresHitl: false,
  };
}
