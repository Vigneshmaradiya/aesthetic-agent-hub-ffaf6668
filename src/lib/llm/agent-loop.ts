import type {
  LLMMessage,
  ToolCallRequest,
  ToolDefinition,
  LLMProviderConfig,
  LLMProviderName,
} from "./types";
import { getLLMProvider } from "./provider-factory";
import { getModelInfo } from "./models";
import { discoverTools, executeTool } from "./tool-bridge";
import { getSystemPrompt, buildContextBlock } from "./system-prompt";
import { truncateToFit } from "./token-estimator";
import { SemanticMemory } from "./memory/semantic-memory";
import { classifyIntent } from "./memory/intent-classifier";
import type { SSEEventType } from "@/lib/streaming/sse-client";
import type { HitlMode } from "@/stores/hitl-store";

// ─── Constants ─────────────────────────────────────────────────

const MAX_ITERATIONS = 10;

// ─── Types ─────────────────────────────────────────────────────

export interface PendingActionInfo {
  id: string;
  description: string;
  tool: string;
  args: Record<string, unknown>;
  risk: "low" | "medium" | "high";
  createdAt: Date;
}

/** Canvas context forwarded from the client for active ticket awareness. */
export interface CanvasContext {
  activeTicketId: string;
  subject: string;
  priority: string;
  status: string;
  requester: string;
  summary: string;
  tags?: string[];
  currentStage: string;
  completedStages: string[];
}

/** Authenticated user identity from the session. */
export interface UserIdentity {
  /** Zendesk user ID (numeric, as string). */
  zendeskUserId?: string;
  /** Display name. */
  name?: string;
  /** Email address. */
  email?: string;
}

export interface AgentLoopOptions {
  provider: LLMProviderName;
  model: string;
  apiKey: string;
  conversationHistory: LLMMessage[];
  hitlMode: HitlMode;
  maxIterations?: number;
  /** Called when HITL requires approval. Returns true if approved. */
  onHitlRequest?: (action: PendingActionInfo) => Promise<boolean>;
  signal?: AbortSignal;
  /** User's Zendesk OAuth access token for per-user API calls. */
  zendeskAccessToken?: string;
  /** Authenticated user identity for contextual tool calls. */
  userIdentity?: UserIdentity;
  /** Active ticket and workflow state from the UI canvas. */
  canvasContext?: CanvasContext;
  /** List of connected MCP service IDs for tool discovery. */
  connectedMCPs?: string[];
  /** Per-service access tokens (service → token) for authenticated MCP calls. */
  mcpCredentials?: Record<string, string>;
}

export interface SSESender {
  send: (type: SSEEventType, data: string) => void;
}

// ─── Risk Classification ───────────────────────────────────────

/**
 * Classify tool risk level for HITL display.
 * Read-only tools are low risk; mutations are medium/high.
 */
function classifyToolRisk(toolName: string): "low" | "medium" | "high" {
  // Write operations are higher risk
  if (
    toolName.includes("create") ||
    toolName.includes("update") ||
    toolName.includes("delete")
  ) {
    // Creating/updating tickets is medium risk
    if (toolName.includes("comment")) return "medium";
    return "high";
  }
  // Read-only operations are low risk
  return "low";
}

// ─── Agent Loop ────────────────────────────────────────────────

/**
 * Run the agentic reasoning loop.
 *
 * Flow:
 * 1. Classify user intent → proactive context enrichment
 * 2. Build system prompt with semantic memory context
 * 3. Discover available MCP tools
 * 4. Loop:
 *    a. Truncate messages to fit context window
 *    b. Stream LLM completion
 *    c. If tool calls: HITL gate → execute → feed results → continue
 *    d. If no tool calls: break
 * 5. Emit done event
 */
export async function runAgentLoop(
  options: AgentLoopOptions,
  sse: SSESender,
): Promise<void> {
  const {
    provider: providerName,
    model,
    apiKey,
    conversationHistory,
    hitlMode,
    maxIterations = MAX_ITERATIONS,
    onHitlRequest,
    signal,
    zendeskAccessToken,
    userIdentity,
    canvasContext,
    connectedMCPs,
    mcpCredentials,
  } = options;

  // ── Build unified credentials map ───────────────────────────
  // Merge Zendesk OAuth token into the credentials map for backward compat
  const credentialsMap: Record<string, string> = { ...mcpCredentials };
  if (zendeskAccessToken) {
    credentialsMap["zendesk"] = zendeskAccessToken;
  }

  const provider = getLLMProvider(providerName);
  const modelInfo = getModelInfo(model);

  const config: LLMProviderConfig = {
    apiKey,
    model,
    maxTokens: modelInfo?.maxOutputTokens ?? 4096,
    temperature: 0.3,
  };

  // ── Semantic Memory ────────────────────────────────────────
  const memory = new SemanticMemory();

  // Process all existing messages for entity extraction
  for (const msg of conversationHistory) {
    memory.processMessage(msg.content);
  }

  // ── Intent Classification ──────────────────────────────────
  const lastUserMessage = [...conversationHistory]
    .reverse()
    .find((m) => m.role === "user");

  if (lastUserMessage) {
    const intentResult = classifyIntent(lastUserMessage.content);

    sse.send(
      "thought",
      JSON.stringify({
        step: "Intent Analysis",
        content: `Detected intent: **${intentResult.intent}** (confidence: ${Math.round(intentResult.confidence * 100)}%)${
          intentResult.extractedTicketIds.length > 0
            ? `. Referenced tickets: ${intentResult.extractedTicketIds.map((id) => `#${id}`).join(", ")}`
            : ""
        }`,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  // ── Tool Discovery ─────────────────────────────────────────
  let tools: ToolDefinition[] = [];
  try {
    tools = await discoverTools(connectedMCPs, credentialsMap);
    sse.send(
      "thought",
      JSON.stringify({
        step: "Tool Discovery",
        content: `${tools.length} tools available across ${new Set(tools.map((t) => t.name.split("__")[0])).size} services`,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    sse.send(
      "thought",
      JSON.stringify({
        step: "Tool Discovery",
        content:
          "Some MCP services are unavailable. Proceeding with limited tool access.",
        timestamp: new Date().toISOString(),
      }),
    );
  }

  // ── Seed memory from canvas context ────────────────────────
  // When a ticket is loaded via "Dive In" (not via chat tool calls),
  // the LLM has no ticket context. Seed it from the canvas state.
  if (canvasContext && !memory.hasActiveTicket()) {
    memory.setActiveTicket({
      id: canvasContext.activeTicketId,
      subject: canvasContext.subject,
      status: canvasContext.status,
      priority: canvasContext.priority,
      requester: canvasContext.requester,
      summary: canvasContext.summary,
    });
  }

  // ── Build Messages ─────────────────────────────────────────
  // enrichedContext includes active ticket info from memory
  const enrichedContext = memory.buildEnrichedContext();

  // Append canvas workflow state (stage info) — memory handles the
  // active ticket; we add the workflow stage separately.
  const workflowBlock = canvasContext
    ? buildContextBlock({
        resolutionWorkflow: {
          currentStage: canvasContext.currentStage,
          completedStages: canvasContext.completedStages,
        },
      })
    : "";

  // Build JIRA on-prem configuration context
  const jiraConfigBlock = process.env.JIRA_ONPREM_BASE_URL
    ? buildContextBlock({
        jiraOnPremConfig: {
          baseUrl: process.env.JIRA_ONPREM_BASE_URL,
        },
      })
    : "";

  // Build authenticated user context
  const userBlock = userIdentity
    ? buildContextBlock({ authenticatedUser: userIdentity })
    : "";

  const systemPrompt =
    getSystemPrompt() +
    enrichedContext +
    workflowBlock +
    jiraConfigBlock +
    userBlock;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ];

  // ── Agentic Loop ───────────────────────────────────────────
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    if (signal?.aborted) {
      sse.send("error", JSON.stringify({ message: "Request cancelled" }));
      return;
    }

    // Emit thinking step
    if (iteration > 1) {
      sse.send(
        "thought",
        JSON.stringify({
          step: `Iteration ${iteration}`,
          content: "Processing tool results and continuing reasoning...",
          timestamp: new Date().toISOString(),
        }),
      );
    }

    // Truncate to fit context window
    const contextWindow = modelInfo?.contextWindow ?? 128_000;
    const truncatedMessages = truncateToFit(
      messages,
      contextWindow,
      config.maxTokens ?? 4096,
    );

    // Stream LLM completion
    let accumulatedText = "";
    const toolCalls: ToolCallRequest[] = [];
    const partialToolCalls = new Map<
      string,
      { id: string; name: string; args: string }
    >();

    try {
      const stream = provider.streamCompletion(
        truncatedMessages,
        tools,
        config,
        signal,
      );

      for await (const event of stream) {
        if (signal?.aborted) return;

        switch (event.type) {
          case "text_delta":
            accumulatedText += event.text ?? "";
            sse.send("message", event.text ?? "");
            break;

          case "thinking":
            sse.send(
              "thought",
              JSON.stringify({
                step: "Reasoning",
                content: event.thinking ?? "",
                timestamp: new Date().toISOString(),
              }),
            );
            break;

          case "tool_call_start": {
            const tc = event.toolCall!;
            const id = tc.id ?? crypto.randomUUID();
            partialToolCalls.set(id, {
              id,
              name: tc.name ?? "",
              args: "",
            });
            break;
          }

          case "tool_call_delta": {
            const currentId = [...partialToolCalls.keys()].pop();
            if (currentId) {
              partialToolCalls.get(currentId)!.args += event.text ?? "";
            }
            break;
          }

          case "tool_call_end": {
            const endId =
              event.toolCall?.id ?? [...partialToolCalls.keys()].pop();
            if (endId && partialToolCalls.has(endId)) {
              const partial = partialToolCalls.get(endId)!;
              let parsedArgs: Record<string, unknown> = {};

              // Try parsing accumulated args, or use event.toolCall.arguments
              if (event.toolCall?.arguments) {
                parsedArgs = event.toolCall.arguments;
              } else if (partial.args) {
                try {
                  parsedArgs = JSON.parse(partial.args);
                } catch {
                  /* empty args */
                }
              }

              const finalToolCall: ToolCallRequest = {
                id: partial.id,
                name: partial.name || event.toolCall?.name || "",
                arguments: parsedArgs,
              };
              toolCalls.push(finalToolCall);
              partialToolCalls.delete(endId);

              sse.send(
                "tool_call",
                JSON.stringify({
                  callId: finalToolCall.id,
                  tool: finalToolCall.name,
                  args: finalToolCall.arguments,
                }),
              );
            }
            break;
          }

          case "error":
            sse.send("error", JSON.stringify({ message: event.error }));
            return;

          case "done":
            // Usage stats logged but not sent to client
            break;
        }
      }
    } catch (err) {
      if (signal?.aborted) return;
      const message =
        err instanceof Error ? err.message : "LLM streaming error";
      sse.send("error", JSON.stringify({ message }));
      return;
    }

    // ── No tool calls → done ───────────────────────────────
    if (toolCalls.length === 0) {
      messages.push({ role: "assistant", content: accumulatedText });
      break;
    }

    // ── Process tool calls ─────────────────────────────────
    messages.push({
      role: "assistant",
      content: accumulatedText,
      toolCalls,
    });

    const toolResults: LLMMessage["toolResults"] = [];
    let anyRejected = false;

    for (const toolCall of toolCalls) {
      if (signal?.aborted) return;

      // HITL gate
      if (hitlMode === "supervised") {
        const risk = classifyToolRisk(toolCall.name);

        if (onHitlRequest) {
          const approved = await onHitlRequest({
            id: toolCall.id,
            description: `Execute ${toolCall.name} with ${JSON.stringify(toolCall.arguments).slice(0, 200)}`,
            tool: toolCall.name,
            args: toolCall.arguments,
            risk,
            createdAt: new Date(),
          });

          if (!approved) {
            anyRejected = true;
            const rejection = {
              toolCallId: toolCall.id,
              name: toolCall.name,
              content: "Tool execution was rejected by the operator.",
              isError: true,
            };
            toolResults.push(rejection);
            sse.send(
              "tool_result",
              JSON.stringify({
                callId: toolCall.id,
                tool: toolCall.name,
                result: "Rejected by operator",
              }),
            );
            continue;
          }
        }
      }

      // Execute tool
      sse.send(
        "thought",
        JSON.stringify({
          step: "Executing",
          content: `Calling \`${toolCall.name}\`...`,
          timestamp: new Date().toISOString(),
        }),
      );

      const result = await executeTool(toolCall, credentialsMap);

      // Update semantic memory with tool result
      memory.updateFromToolResult(toolCall, result.content);

      // Send FULL result to client for canvas population (no truncation).
      // The LLM context is truncated separately via truncateToFit().
      sse.send(
        "tool_result",
        JSON.stringify({
          callId: toolCall.id,
          tool: toolCall.name,
          result: result.content,
        }),
      );

      toolResults.push(result);
    }

    // Append tool results for next iteration
    messages.push({
      role: "user",
      content: "",
      toolResults,
    });

    // Stop iterating if the operator rejected any tool call.
    // The LLM would otherwise see the rejection and retry, creating another
    // approval popup. Better UX: stop here and let the engineer re-prompt.
    if (anyRejected) {
      sse.send(
        "thought",
        JSON.stringify({
          step: "Stopped",
          content:
            "One or more tool calls were rejected. Re-send your message if you'd like to proceed differently.",
          timestamp: new Date().toISOString(),
        }),
      );
      break;
    }
  }

  // ── Max iterations guard ─────────────────────────────────
  if (iteration >= maxIterations) {
    sse.send(
      "thought",
      JSON.stringify({
        step: "Limit Reached",
        content: `Reached maximum iteration limit (${maxIterations}). Finalizing response.`,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
