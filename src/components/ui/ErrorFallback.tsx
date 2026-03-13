"use client";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
  context?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  context,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-nexus-border bg-nexus-surface p-4 text-center"
    >
      {context && (
        <span className="text-xs font-medium uppercase tracking-wider text-nexus-text-dim">
          {context}
        </span>
      )}
      <p className="text-sm text-nexus-error">
        {error.message || "Something went wrong."}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="rounded-md bg-nexus-surface-raised px-4 py-1.5 text-xs font-medium text-nexus-text transition-colors hover:bg-nexus-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-surface"
        >
          Retry
        </button>
      )}
    </div>
  );
}
