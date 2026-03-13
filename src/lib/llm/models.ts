import type { ModelInfo, LLMProviderName } from "./types";

export const MODEL_REGISTRY: ModelInfo[] = [
  // ── Anthropic ─────────────────────────────────────────────────
  {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    displayName: "Claude Sonnet 4",
    contextWindow: 200_000,
    maxOutputTokens: 16_384,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    displayName: "Claude 3.5 Sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "claude-3-opus-20240229",
    provider: "anthropic",
    displayName: "Claude 3 Opus",
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    supportsToolUse: true,
    supportsStreaming: true,
  },

  // ── OpenAI ────────────────────────────────────────────────────
  {
    id: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4-turbo",
    provider: "openai",
    displayName: "GPT-4 Turbo",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "o1",
    provider: "openai",
    displayName: "o1",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "o1-mini",
    provider: "openai",
    displayName: "o1 Mini",
    contextWindow: 128_000,
    maxOutputTokens: 65_536,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "o3-mini",
    provider: "openai",
    displayName: "o3 Mini",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsToolUse: true,
    supportsStreaming: true,
  },

  // ── Google Gemini ─────────────────────────────────────────────
  {
    id: "gemini-2.0-flash",
    provider: "google",
    displayName: "Gemini 2.0 Flash",
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "gemini-2.0-pro",
    provider: "google",
    displayName: "Gemini 2.0 Pro",
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "gemini-1.5-pro",
    provider: "google",
    displayName: "Gemini 1.5 Pro",
    contextWindow: 2_097_152,
    maxOutputTokens: 8_192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  {
    id: "gemini-1.5-flash",
    provider: "google",
    displayName: "Gemini 1.5 Flash",
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
];

/** Get all models for a specific provider. */
export function getModelsByProvider(provider: LLMProviderName): ModelInfo[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

/** Get info for a specific model ID. */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}

/** Get providers that have an API key configured. */
export function getAvailableProviders(
  env: Record<string, string | undefined>,
): LLMProviderName[] {
  const providers: LLMProviderName[] = [];
  if (env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (env.OPENAI_API_KEY) providers.push("openai");
  if (env.GOOGLE_AI_API_KEY) providers.push("google");
  return providers;
}

/** Default model for each provider. */
export function getDefaultModelForProvider(provider: LLMProviderName): string {
  const defaults: Record<LLMProviderName, string> = {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
    google: "gemini-2.0-flash",
  };
  return defaults[provider];
}
