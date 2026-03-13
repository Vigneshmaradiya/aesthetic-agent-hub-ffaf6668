"use client";

import { useEffect, useState, useCallback } from "react";
import { useSessionStore } from "@/stores/session-store";

interface ModelOption {
  id: string;
  provider: string;
  displayName: string;
  contextWindow: number;
  supportsToolUse: boolean;
}

interface LLMConfig {
  availableProviders: string[];
  defaultProvider: string;
  defaultModel: string;
  models: ModelOption[];
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

/**
 * Provider + model dropdown for the chat header.
 * Fetches available models from /api/llm/config (no keys exposed).
 */
export function ModelSelector() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const llmProvider = useSessionStore((s) => s.llmProvider);
  const llmModel = useSessionStore((s) => s.llmModel);
  const setLlmProvider = useSessionStore((s) => s.setLlmProvider);
  const setLlmModel = useSessionStore((s) => s.setLlmModel);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/llm/config");
        if (res.ok) {
          const data = (await res.json()) as LLMConfig;
          setConfig(data);

          // Set defaults if not already set
          if (!llmProvider && data.defaultProvider) {
            setLlmProvider(data.defaultProvider);
          }
          if (!llmModel && data.defaultModel) {
            setLlmModel(data.defaultModel);
          }
        }
      } catch {
        // Config endpoint unavailable — leave defaults
      } finally {
        setLoading(false);
      }
    };
    void fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(
    (modelId: string, provider: string) => {
      setLlmProvider(provider);
      setLlmModel(modelId);
      setIsOpen(false);
    },
    [setLlmProvider, setLlmModel],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded bg-nexus-surface-raised px-2 py-1 text-xs text-nexus-text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-nexus-text-dim" />
        Loading models...
      </div>
    );
  }

  if (!config || config.availableProviders.length === 0) {
    return (
      <div className="rounded bg-nexus-error/10 px-2 py-1 text-xs text-nexus-error">
        No LLM configured
      </div>
    );
  }

  const activeModel = config.models.find((m) => m.id === llmModel);
  const activeDisplayName =
    activeModel?.displayName ?? llmModel ?? "Select model";

  // Group models by provider
  const grouped = config.availableProviders.map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider] ?? provider,
    models: config.models.filter((m) => m.provider === provider),
  }));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded bg-nexus-surface-raised px-2.5 py-1 text-xs font-medium text-nexus-text transition-colors hover:bg-nexus-border"
        aria-label="Select LLM model"
        aria-expanded={isOpen}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-nexus-success" />
        {activeDisplayName}
        <svg
          className={`h-3 w-3 text-nexus-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-nexus-border bg-nexus-surface shadow-xl">
            {grouped.map((group) => (
              <div key={group.provider}>
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                  {group.label}
                </div>
                {group.models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id, model.provider)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-nexus-surface-raised ${
                      model.id === llmModel
                        ? "bg-nexus-accent/10 text-nexus-accent"
                        : "text-nexus-text"
                    }`}
                  >
                    <span>{model.displayName}</span>
                    <span className="text-[10px] text-nexus-text-dim">
                      {Math.round(model.contextWindow / 1000)}k
                      {model.supportsToolUse ? " · tools" : ""}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
