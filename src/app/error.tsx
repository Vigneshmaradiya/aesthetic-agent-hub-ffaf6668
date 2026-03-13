"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-nexus-base">
      <div className="max-w-md rounded-lg border border-nexus-border bg-nexus-surface p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-nexus-error">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-nexus-text-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-nexus-accent px-6 py-2.5 text-sm font-medium text-nexus-base transition-colors hover:bg-nexus-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-base"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
