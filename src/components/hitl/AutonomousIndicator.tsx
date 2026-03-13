"use client";

import { useHitlStore } from "@/stores/hitl-store";

export function AutonomousIndicator() {
  const mode = useHitlStore((s) => s.mode);

  if (mode !== "autonomous") {
    return null;
  }

  return (
    <div className="group relative flex items-center">
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-nexus-warning"
        role="status"
        aria-label="Agent is operating autonomously"
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-nexus-surface-raised px-2 py-1 text-[10px] text-nexus-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Agent is operating autonomously
      </span>
    </div>
  );
}
