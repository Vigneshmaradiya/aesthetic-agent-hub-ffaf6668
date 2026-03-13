"use client";

import type { LogLevel } from "@/lib/log-parser/types";

/**
 * Token types produced by the highlighter.
 */
interface HighlightToken {
  text: string;
  className: string;
}

/** ISO-ish timestamp pattern: 2026-03-05 10:00:00.123 or 2026-03-05T10:00:00Z */
const TIMESTAMP_RE =
  /\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:[.\d]*)?(?:Z|[+-]\d{2}:\d{2})?/g;

/** Syslog-style timestamp: Mar  5 10:00:00 */
const SYSLOG_TS_RE = /\b[A-Z][a-z]{2}\s+\d{1,2}\s\d{2}:\d{2}:\d{2}\b/g;

/** Log level keywords */
const LEVEL_RE = /\b(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRITICAL)\b/gi;

/** Stack trace indicators */
const STACK_RE = /(\bat\s+\S+|Caused by:.*|^\s+at\s+.*)/g;

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-nexus-text-dim",
  INFO: "text-nexus-info",
  WARN: "text-nexus-warning",
  WARNING: "text-nexus-warning",
  ERROR: "text-nexus-error",
  FATAL: "text-nexus-error font-bold",
  CRITICAL: "text-nexus-error font-bold",
};

/**
 * Produce an array of highlighted tokens for a raw log line.
 *
 * This is intentionally kept simple: it scans the line for known
 * patterns and wraps them in styled spans. Non-matching text
 * gets a default style.
 */
export function highlightLogLine(raw: string): HighlightToken[] {
  if (!raw) return [];

  const tokens: HighlightToken[] = [];

  // Build a combined pattern so we can walk through in order
  const combined = new RegExp(
    `(${TIMESTAMP_RE.source}|${SYSLOG_TS_RE.source})|(${LEVEL_RE.source})|(${STACK_RE.source})`,
    "gi",
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(raw)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      tokens.push({
        text: raw.slice(lastIndex, match.index),
        className: "text-nexus-text",
      });
    }

    const text = match[0];

    if (match[1]) {
      // Timestamp
      tokens.push({ text, className: "text-nexus-accent-muted" });
    } else if (match[2]) {
      // Level keyword
      const color = LEVEL_COLORS[text.toUpperCase()] ?? "text-nexus-text";
      tokens.push({ text, className: color });
    } else {
      // Stack trace
      tokens.push({ text, className: "text-nexus-error/70 italic" });
    }

    lastIndex = match.index + text.length;
  }

  // Trailing plain text
  if (lastIndex < raw.length) {
    tokens.push({
      text: raw.slice(lastIndex),
      className: "text-nexus-text",
    });
  }

  return tokens;
}

/**
 * React component that renders a highlighted log line.
 */
export function HighlightedLine({ raw }: { raw: string }) {
  const tokens = highlightLogLine(raw);

  return (
    <span className="font-mono text-xs">
      {tokens.map((token, i) => (
        <span key={i} className={token.className}>
          {token.text}
        </span>
      ))}
    </span>
  );
}

/**
 * Map a LogLevel to its Tailwind badge classes.
 */
export function levelBadgeClass(level: LogLevel): string {
  switch (level) {
    case "DEBUG":
      return "bg-nexus-text-dim/20 text-nexus-text-dim";
    case "INFO":
      return "bg-nexus-info/20 text-nexus-info";
    case "WARN":
      return "bg-nexus-warning/20 text-nexus-warning";
    case "ERROR":
      return "bg-nexus-error/20 text-nexus-error";
    case "FATAL":
      return "bg-nexus-error/30 text-nexus-error font-bold";
  }
}
