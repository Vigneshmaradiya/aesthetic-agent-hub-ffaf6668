import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSSEStream, SSE_HEADERS } from "@/lib/streaming/sse-server";
import { runAgentLoop, type UserIdentity } from "@/lib/llm/agent-loop";
import {
  getAvailableProviders,
  getDefaultModelForProvider,
} from "@/lib/llm/models";
import type { LLMMessage, LLMProviderName } from "@/lib/llm/types";
import type { HitlMode } from "@/stores/hitl-store";
import { pendingApprovals } from "@/lib/llm/hitl-approvals";
import { auth } from "@/lib/auth";
import { getAllMCPTokens } from "@/lib/auth/mcp-token-store";
import { getAdminMCPs, isAdminMCPConfigured } from "@/lib/mcp/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — accommodates HITL approval wait time

// ─── Request Schema ────────────────────────────────────────────

const canvasContextSchema = z
  .object({
    activeTicketId: z.string(),
    subject: z.string(),
    priority: z.string(),
    status: z.string(),
    requester: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).optional(),
    currentStage: z.string(),
    completedStages: z.array(z.string()),
  })
  .optional();

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  provider: z.enum(["anthropic", "openai", "google"]).optional(),
  model: z.string().min(1).optional(),
  hitlMode: z.enum(["supervised", "autonomous"]).optional(),
  /** Canvas state so the LLM knows which ticket is active. */
  canvasContext: canvasContextSchema,
  /** Connected MCP service IDs from client state. */
  connectedMCPs: z.array(z.string()).optional(),
  // Legacy: support single-message format for backward compat
  message: z.string().optional(),
});

// ─── Route Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    provider: requestedProvider,
    model: requestedModel,
    hitlMode,
    canvasContext,
    connectedMCPs: clientConnectedMCPs,
  } = parsed.data;

  // ── Extract user's Zendesk OAuth token + identity from session ──
  let zendeskAccessToken: string | undefined;
  let userIdentity: UserIdentity | undefined;
  try {
    const session = await auth();
    zendeskAccessToken = session?.accessToken ?? undefined;
    if (session?.user) {
      userIdentity = {
        zendeskUserId: session.user.id ?? undefined,
        name: session.user.name ?? undefined,
        email: session.user.email ?? undefined,
      };
    }
  } catch {
    // No session available — will use API token fallback if configured
  }

  // ── Build connected MCPs list and credentials map ────────
  // Start with admin MCPs that are configured
  const connectedMCPs: string[] = getAdminMCPs()
    .filter(isAdminMCPConfigured)
    .map((e) => e.id);

  // Add agent MCPs that have tokens
  let mcpCredentials: Record<string, string> = {};
  try {
    mcpCredentials = await getAllMCPTokens();
    connectedMCPs.push(...Object.keys(mcpCredentials));
  } catch {
    // Token reading failed — proceed with admin MCPs only
  }

  // Merge client-reported connected MCPs (dedup)
  if (clientConnectedMCPs) {
    for (const id of clientConnectedMCPs) {
      if (!connectedMCPs.includes(id)) {
        connectedMCPs.push(id);
      }
    }
  }

  // Build conversation history
  let conversationHistory: LLMMessage[];
  if (parsed.data.messages?.length) {
    conversationHistory = parsed.data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  } else if (parsed.data.message) {
    // Legacy single-message format
    conversationHistory = [{ role: "user", content: parsed.data.message }];
  } else {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 },
    );
  }

  // ── Resolve Provider ─────────────────────────────────────
  const env = process.env;
  const availableProviders = getAvailableProviders(env);

  if (availableProviders.length === 0) {
    return NextResponse.json(
      {
        error:
          "No LLM provider configured. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY",
      },
      { status: 503 },
    );
  }

  const provider: LLMProviderName =
    requestedProvider && availableProviders.includes(requestedProvider)
      ? requestedProvider
      : ((env.LLM_DEFAULT_PROVIDER as LLMProviderName) ??
        availableProviders[0]);

  const apiKeyMap: Record<LLMProviderName, string | undefined> = {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    google: env.GOOGLE_AI_API_KEY,
  };

  const apiKey = apiKeyMap[provider];
  if (!apiKey) {
    // Fallback to first available provider
    const fallback = availableProviders[0];
    const fallbackKey = apiKeyMap[fallback];
    if (!fallbackKey) {
      return NextResponse.json(
        { error: `No API key for provider: ${provider}` },
        { status: 503 },
      );
    }
    // Use fallback
    return handleChat(
      request,
      conversationHistory,
      fallback,
      getDefaultModelForProvider(fallback),
      fallbackKey,
      (hitlMode as HitlMode) ?? "supervised",
      zendeskAccessToken,
      userIdentity,
      canvasContext,
      connectedMCPs,
      mcpCredentials,
    );
  }

  const model =
    requestedModel ||
    env.LLM_DEFAULT_MODEL ||
    getDefaultModelForProvider(provider);

  return handleChat(
    request,
    conversationHistory,
    provider,
    model,
    apiKey,
    (hitlMode as HitlMode) ?? "supervised",
    zendeskAccessToken,
    userIdentity,
    canvasContext,
    connectedMCPs,
    mcpCredentials,
  );
}

// ─── Chat Handler ──────────────────────────────────────────────

function handleChat(
  request: NextRequest,
  conversationHistory: LLMMessage[],
  provider: LLMProviderName,
  model: string,
  apiKey: string,
  hitlMode: HitlMode,
  zendeskAccessToken?: string,
  userIdentity?: UserIdentity,
  canvasContext?: z.infer<typeof canvasContextSchema>,
  connectedMCPs?: string[],
  mcpCredentials?: Record<string, string>,
): Response {
  const { stream, send, close } = createSSEStream();

  const run = async () => {
    try {
      send(
        "thought",
        JSON.stringify({
          step: "Initializing",
          content: `Using **${provider}/${model}** in ${hitlMode} mode`,
          timestamp: new Date().toISOString(),
        }),
      );

      await runAgentLoop(
        {
          provider,
          model,
          apiKey,
          conversationHistory,
          hitlMode,
          maxIterations: Number(process.env.LLM_MAX_ITERATIONS ?? 10),
          zendeskAccessToken,
          userIdentity,
          canvasContext,
          connectedMCPs,
          mcpCredentials,
          onHitlRequest: async (action) => {
            // Emit HITL approval request via SSE
            send(
              "tool_call",
              JSON.stringify({
                tool: action.tool,
                args: action.args,
                requiresApproval: true,
                actionId: action.id,
                risk: action.risk,
                description: action.description,
              }),
            );

            // Wait for approval via the /api/chat/approve endpoint.
            // 5-minute timeout gives the engineer time to read and decide.
            // The request itself can run up to maxDuration (120s) — but the
            // HITL gate suspends tool execution, so the agent loop effectively
            // pauses here until the engineer responds.
            return new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => {
                pendingApprovals.delete(action.id);
                resolve(false); // Auto-reject after 5 minutes
              }, 5 * 60_000);

              pendingApprovals.set(action.id, { resolve, timeout });
            });
          },
          signal: request.signal,
        },
        { send },
      );

      send("done", JSON.stringify({ finishedAt: new Date().toISOString() }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      send("error", JSON.stringify({ message }));
    } finally {
      close();
    }
  };

  void run();

  return new Response(stream, { headers: SSE_HEADERS });
}
