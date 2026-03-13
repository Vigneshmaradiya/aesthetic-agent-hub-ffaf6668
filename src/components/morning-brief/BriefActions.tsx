"use client";

interface BriefActionsProps {
  onStartTopPriority: () => void;
  onSkip: () => void;
  hasTopPriority?: boolean;
}

export function BriefActions({
  onStartTopPriority,
  onSkip,
  hasTopPriority = true,
}: BriefActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onStartTopPriority}
        disabled={!hasTopPriority}
        className="w-full rounded-lg bg-nexus-accent px-4 py-2.5 text-sm font-semibold text-nexus-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start with Top Priority
      </button>
      <button
        onClick={onSkip}
        className="w-full rounded-lg px-4 py-2 text-sm text-nexus-text-muted transition-colors hover:text-nexus-text"
      >
        Skip Brief
      </button>
    </div>
  );
}
