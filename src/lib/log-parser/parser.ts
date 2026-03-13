import type { LogEntry, LogFormat, LogLevel, ParsedLog } from "./types";
import {
  FORMAT_PATTERNS,
  isJsonLine,
  normalizeLevel,
  parseJsonLine,
} from "./formats";

/**
 * Detect the format of a log file based on its first non-empty line.
 */
export function detectFormat(firstLine: string): LogFormat {
  const trimmed = firstLine.trim();

  if (isJsonLine(trimmed)) {
    return "json";
  }

  if (FORMAT_PATTERNS.standard.test(trimmed)) {
    return "standard";
  }

  if (FORMAT_PATTERNS.syslog.test(trimmed)) {
    return "syslog";
  }

  // Default to standard when nothing matches
  return "standard";
}

/**
 * Parse a single line into a LogEntry according to the given format.
 * Returns null when the line cannot be parsed.
 */
export function parseLine(
  line: string,
  index: number,
  format: LogFormat,
): LogEntry | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  if (format === "json") {
    const parsed = parseJsonLine(trimmed);
    if (!parsed) return null;
    return {
      lineNumber: index + 1,
      timestamp: parsed.timestamp,
      level: parsed.level,
      source: parsed.source,
      message: parsed.message,
      raw: line,
    };
  }

  const pattern = FORMAT_PATTERNS[format];
  const match = pattern.exec(trimmed);
  if (!match) return null;

  if (format === "standard") {
    return {
      lineNumber: index + 1,
      timestamp: match[1],
      level: normalizeLevel(match[2]),
      source: match[3],
      message: match[4],
      raw: line,
    };
  }

  // syslog: groups are (timestamp) (host) (process) (message)
  // We treat the process name as "source" and host is included in the message context.
  return {
    lineNumber: index + 1,
    timestamp: match[1],
    level: "INFO", // syslog doesn't embed levels — default to INFO
    source: match[3],
    message: match[4],
    raw: line,
  };
}

function emptyLevelCounts(): Record<LogLevel, number> {
  return { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
}

/**
 * Parse the full contents of a log file.
 *
 * @param content  Raw file content
 * @param format   Explicit format, or auto-detected from first line
 * @param fileName Name to attach to the result (defaults to "untitled.log")
 */
export function parseLogFile(
  content: string,
  format?: LogFormat,
  fileName = "untitled.log",
): ParsedLog {
  const lines = content.split(/\r?\n/);

  // Find first non-empty line for detection
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? "";
  const resolvedFormat = format ?? detectFormat(firstNonEmpty);

  const entries: LogEntry[] = [];
  const byLevel = emptyLevelCounts();

  for (let i = 0; i < lines.length; i++) {
    const entry = parseLine(lines[i], i, resolvedFormat);
    if (entry) {
      entries.push(entry);
      byLevel[entry.level]++;
    }
  }

  let timeRange: { start: string; end: string } | null = null;
  if (entries.length > 0) {
    const first = entries[0];
    const last = entries[entries.length - 1];
    if (first.timestamp && last.timestamp) {
      timeRange = { start: first.timestamp, end: last.timestamp };
    }
  }

  return {
    fileName,
    format: resolvedFormat,
    totalLines: lines.length,
    entries,
    summary: { byLevel, timeRange },
  };
}
