"use client";

interface ConfidenceBadgeProps {
  score: number;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? "bg-nexus-success/20 text-nexus-success"
      : pct >= 50
        ? "bg-nexus-warning/20 text-nexus-warning"
        : "bg-nexus-error/20 text-nexus-error";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${color}`}
    >
      {pct}%
    </span>
  );
}
