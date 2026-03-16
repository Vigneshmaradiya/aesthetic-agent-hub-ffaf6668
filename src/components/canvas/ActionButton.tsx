"use client";

import { triggerChatAction } from "@/lib/chat/trigger";

interface ActionButtonProps {
  label: string;
  mcpTool?: string;
  mcpArgs?: Record<string, unknown>;
  chatPrompt?: string;
  variant?: "primary" | "secondary" | "ghost";
  requiresHitl?: boolean;
}

export function ActionButton({
  label,
  chatPrompt,
  variant = "secondary",
  requiresHitl,
}: ActionButtonProps) {
  const baseClasses =
    "rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 inline-flex items-center gap-2";
  const variantClasses = {
    primary:
      "bg-nexus-accent text-nexus-base hover:opacity-90 hover:-translate-y-px hover:shadow-[0_0_16px_var(--nexus-glow)]",
    secondary:
      "border border-nexus-border bg-nexus-surface-raised text-nexus-text hover:border-nexus-accent-dim hover:text-nexus-accent hover:-translate-y-px",
    ghost:
      "text-nexus-text-muted hover:bg-nexus-surface-raised hover:text-nexus-text",
  };

  function handleClick() {
    if (chatPrompt) {
      triggerChatAction(chatPrompt);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
      title={requiresHitl ? "Requires approval" : undefined}
    >
      {label}
      {requiresHitl && (
        <span
          className="text-nexus-warning"
          aria-label="Requires approval"
          style={{ boxShadow: "0 0 4px rgb(var(--nexus-warning) / 0.5)" }}
        >
          ●
        </span>
      )}
    </button>
  );
}
