import type { LogFormat, LogLevel } from "./types";

/**
 * Regex patterns for each supported log format.
 *
 * Groups captured per format:
 *  standard: (timestamp) [level] (source): (message)
 *  syslog:   (timestamp) (host) (process[pid]): (message)
 *  json:     Parsed from JSON object with timestamp/level/message fields
 */

export const FORMAT_PATTERNS: Record<Exclude<LogFormat, "json">, RegExp> = {
  standard:
    /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[\.\d]*)\s*\[(\w+)\]\s*(\w+):\s*(.+)$/,
  syslog:
    /^(\w{3}\s+\d{1,2}\s\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[\d+\])?:\s*(.+)$/,
};

const VALID_LEVELS: ReadonlySet<string> = new Set<string>([
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "FATAL",
]);

/**
 * Normalise a raw level string to a LogLevel, defaulting to "INFO"
 * when the value is not recognised.
 */
export function normalizeLevel(raw: string): LogLevel {
  const upper = raw.toUpperCase();
  if (VALID_LEVELS.has(upper)) {
    return upper as LogLevel;
  }
  // Common aliases
  if (upper === "WARNING") return "WARN";
  if (upper === "CRITICAL" || upper === "EMERGENCY") return "FATAL";
  if (upper === "TRACE" || upper === "VERBOSE") return "DEBUG";
  return "INFO";
}

/** Return true when the line looks like a JSON log object. */
export function isJsonLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

/**
 * Attempt to parse a JSON log line and extract the common fields.
 * Returns null when the line is not valid JSON or lacks the expected shape.
 */
export function parseJsonLine(line: string): {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
} | null {
  try {
    const obj: Record<string, unknown> = JSON.parse(line);

    const timestamp =
      typeof obj.timestamp === "string"
        ? obj.timestamp
        : typeof obj.time === "string"
          ? obj.time
          : typeof obj.ts === "string"
            ? obj.ts
            : "";

    const rawLevel =
      typeof obj.level === "string"
        ? obj.level
        : typeof obj.severity === "string"
          ? obj.severity
          : "";

    const message =
      typeof obj.message === "string"
        ? obj.message
        : typeof obj.msg === "string"
          ? obj.msg
          : "";

    const source =
      typeof obj.source === "string"
        ? obj.source
        : typeof obj.logger === "string"
          ? obj.logger
          : typeof obj.module === "string"
            ? obj.module
            : "";

    if (!timestamp && !rawLevel && !message) return null;

    return {
      timestamp,
      level: normalizeLevel(rawLevel),
      source,
      message,
    };
  } catch {
    return null;
  }
}
