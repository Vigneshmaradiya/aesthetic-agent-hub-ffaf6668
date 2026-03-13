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
    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors";
  const variantClasses = {
    primary: "bg-nexus-accent text-nexus-base hover:opacity-90",
    secondary:
      "border border-nexus-border bg-nexus-surface-raised text-nexus-text hover:border-nexus-accent hover:text-nexus-accent",
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
          className="ml-1 text-nexus-warning"
          aria-label="Requires approval"
        >
          ●
        </span>
      )}
    </button>
  );
}
