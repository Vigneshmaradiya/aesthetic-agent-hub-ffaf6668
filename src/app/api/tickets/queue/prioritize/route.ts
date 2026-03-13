import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableProviders,
  getDefaultModelForProvider,
} from "@/lib/llm/models";
import { getLLMProvider } from "@/lib/llm/provider-factory";
import type { LLMProviderName } from "@/lib/llm/types";
import { getActiveRules, buildScoringPrompt } from "@/lib/prioritization/engine";
import type { TicketScore } from "@/lib/prioritization/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/tickets/queue/prioritize
 * Score and re-rank a batch of tickets using active prioritization rules + LLM.
 *
 * Body: { tickets: Array<{ id, subject, priority, status, requester, createdAt, tags, sentiment? }> }
 * Returns: { scores: TicketScore[], rankedIds: string[] }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const tickets = body.tickets as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(tickets) || tickets.length === 0) {
    return NextResponse.json(
      { error: "tickets array is required and must not be empty." },
      { status: 400 },
    );
  }

  const activeRules = getActiveRules();
  if (activeRules.length === 0) {
    // No rules — return tickets in their original order
    const rankedIds = tickets.map((t) => String(t.id));
    return NextResponse.json({ scores: [], rankedIds });
  }

  // Check LLM availability
  const env = process.env;
  const availableProviders = getAvailableProviders(env);

  if (availableProviders.length === 0) {
    // No LLM — return original order
    const rankedIds = tickets.map((t) => String(t.id));
    return NextResponse.json({ scores: [], rankedIds, aiScored: false });
  }

  try {
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

    const systemPrompt = buildScoringPrompt(activeRules);

    // Build concise ticket summaries for the LLM
    const ticketSummaries = tickets
      .map(
        (t) =>
          `- ID: ${t.id}, Subject: "${t.subject}", Priority: ${t.priority}, Status: ${t.status}, Requester: ${(t.requester as Record<string, unknown>)?.name ?? "Unknown"}, Created: ${t.createdAt}, Tags: [${(t.tags as string[])?.join(", ") ?? ""}], Sentiment: ${t.sentiment ?? "unknown"}`,
      )
      .join("\n");

    const userPrompt = `Score these tickets:\n\n${ticketSummaries}`;

    let responseText = "";
    for await (const event of provider.streamCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      [],
      { apiKey, model, maxTokens: 1000 },
    )) {
      if (event.type === "text_delta") {
        responseText += event.text;
      }
    }

    // Parse LLM response
    let scores: TicketScore[] = [];
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? responseText) as Record<
        string,
        unknown
      >;
      scores = Array.isArray(parsed.scores)
        ? (parsed.scores as TicketScore[])
        : [];
    } catch {
      // Fall through to default order
    }

    // Sort by score descending
    const scoreMap = new Map(scores.map((s) => [s.ticketId, s.score]));
    const rankedIds = tickets
      .map((t) => String(t.id))
      .sort((a, b) => (scoreMap.get(b) ?? 0) - (scoreMap.get(a) ?? 0));

    return NextResponse.json({ scores, rankedIds, aiScored: true });
  } catch (error) {
    const rankedIds = tickets.map((t) => String(t.id));
    return NextResponse.json({
      scores: [],
      rankedIds,
      aiScored: false,
      aiError: error instanceof Error ? error.message : "LLM unavailable",
    });
  }
}
