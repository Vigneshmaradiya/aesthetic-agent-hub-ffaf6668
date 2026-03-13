"use client";

const priorityBadgeColor: Record<string, string> = {
  low: "bg-nexus-text-dim/20 text-nexus-text-muted",
  normal: "bg-nexus-info/20 text-nexus-info",
  high: "bg-nexus-warning/20 text-nexus-warning",
  urgent: "bg-nexus-error/20 text-nexus-error",
};

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colorClass =
    priorityBadgeColor[priority.toLowerCase()] ??
    "bg-nexus-text-dim/20 text-nexus-text-muted";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {priority}
    </span>
  );
}
