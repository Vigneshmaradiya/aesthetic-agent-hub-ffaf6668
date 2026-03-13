import type { LLMProvider, LLMProviderName } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { GoogleProvider } from "./providers/google";

/** Lazy-cached singleton instances per provider. */
const instances = new Map<LLMProviderName, LLMProvider>();

/** Get (or create) the LLM provider for a given name. */
export function getLLMProvider(name: LLMProviderName): LLMProvider {
  if (!instances.has(name)) {
    switch (name) {
      case "anthropic":
        instances.set(name, new AnthropicProvider());
        break;
      case "openai":
        instances.set(name, new OpenAIProvider());
        break;
      case "google":
        instances.set(name, new GoogleProvider());
        break;
    }
  }
  return instances.get(name)!;
}
