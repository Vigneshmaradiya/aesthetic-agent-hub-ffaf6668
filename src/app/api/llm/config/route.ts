import { NextResponse } from "next/server";
import {
  getAvailableProviders,
  getModelsByProvider,
  getDefaultModelForProvider,
} from "@/lib/llm/models";
import type { LLMProviderName } from "@/lib/llm/types";

export const dynamic = "force-dynamic";

/**
 * Returns available LLM providers and models to the client.
 * No API keys are exposed — only provider names, model IDs, and display names.
 */
export async function GET() {
  const env = process.env;
  const availableProviders = getAvailableProviders(env);

  const defaultProvider: LLMProviderName =
    (env.LLM_DEFAULT_PROVIDER as LLMProviderName) ??
    availableProviders[0] ??
    "anthropic";

  const defaultModel =
    env.LLM_DEFAULT_MODEL || getDefaultModelForProvider(defaultProvider);

  const models = availableProviders.flatMap((provider) =>
    getModelsByProvider(provider).map((m) => ({
      id: m.id,
      provider: m.provider,
      displayName: m.displayName,
      contextWindow: m.contextWindow,
      supportsToolUse: m.supportsToolUse,
      supportsStreaming: m.supportsStreaming,
    })),
  );

  return NextResponse.json({
    availableProviders,
    defaultProvider,
    defaultModel,
    models,
  });
}
