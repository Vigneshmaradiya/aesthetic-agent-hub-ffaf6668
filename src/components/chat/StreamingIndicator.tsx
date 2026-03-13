"use client";

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-nexus-accent" />
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-nexus-accent"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-nexus-accent"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-nexus-text-dim">Nexus is thinking...</span>
    </div>
  );
}
