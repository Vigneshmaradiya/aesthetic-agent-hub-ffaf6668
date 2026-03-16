"use client";

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full bg-nexus-accent"
            style={{
              animation: "nexus-pulse 1.4s ease-in-out infinite",
              animationDelay: `${i * 200}ms`,
              boxShadow: "0 0 6px rgb(var(--nexus-accent) / 0.4)",
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-nexus-accent/70">
        Nexus is thinking…
      </span>
    </div>
  );
}
