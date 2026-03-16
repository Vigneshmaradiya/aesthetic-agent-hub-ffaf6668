"use client";

interface ConfidenceBadgeProps {
  score: number;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? "bg-nexus-success/15 text-nexus-success border border-nexus-success/30"
      : pct >= 50
        ? "bg-nexus-warning/15 text-nexus-warning border border-nexus-warning/30"
        : "bg-nexus-error/15 text-nexus-error border border-nexus-error/30";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${color}`}
    >
      {pct}%
    </span>
  );
}
