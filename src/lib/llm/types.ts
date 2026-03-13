// ─── Provider and Model Identity ───────────────────────────────

export type LLMProviderName = "anthropic" | "openai" | "google";

export interface ModelInfo {
  id: string;
  provider: LLMProviderName;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsToolUse: boolean;
  supportsStreaming: boolean;
}

// ─── Canonical Message Format ──────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultMessage {
  toolCallId: string;
  name: string;
  content: string;
  isError?: boolean;
}

export interface LLMMessage {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallRequest[];
  toolResults?: ToolResultMessage[];
}

// ─── Tool Definition (JSON Schema style) ───────────────────────

export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameterProperty>;
    required?: string[];
  };
}

// ─── Streaming Events ──────────────────────────────────────────

export type LLMStreamEventType =
  | "text_delta"
  | "tool_call_start"
  | "tool_call_delta"
  | "tool_call_end"
  | "thinking"
  | "done"
  | "error";

export interface LLMStreamEvent {
  type: LLMStreamEventType;
  /** Text chunk for text_delta events. */
  text?: string;
  /** Partial or full tool call for tool_call_* events. */
  toolCall?: Partial<ToolCallRequest>;
  /** Reasoning trace for thinking events. */
  thinking?: string;
  /** Error details for error events. */
  error?: string;
  /** Token usage stats for done events. */
  usage?: { inputTokens: number; outputTokens: number };
}

// ─── Provider Interface ────────────────────────────────────────

export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * All LLM providers implement this interface.
 * `streamCompletion` returns an AsyncGenerator that yields events
 * as they arrive, giving the agentic loop pull-based control.
 */
export interface LLMProvider {
  readonly name: LLMProviderName;

  streamCompletion(
    messages: LLMMessage[],
    tools: ToolDefinition[],
    config: LLMProviderConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<LLMStreamEvent>;
}
