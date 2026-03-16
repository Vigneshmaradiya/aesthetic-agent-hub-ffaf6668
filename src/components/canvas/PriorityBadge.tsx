"use client";

const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-nexus-text-dim/10", text: "text-nexus-text-muted", border: "border-nexus-text-dim/20" },
  normal: { bg: "bg-nexus-info/15", text: "text-nexus-info", border: "border-nexus-info/30" },
  high: { bg: "bg-nexus-warning/15", text: "text-nexus-warning", border: "border-nexus-warning/30" },
  urgent: { bg: "bg-nexus-error/15", text: "text-nexus-error", border: "border-nexus-error/30" },
};

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config =
    priorityConfig[priority.toLowerCase()] ??
    priorityConfig.low;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
    >
      {priority}
    </span>
  );
}
