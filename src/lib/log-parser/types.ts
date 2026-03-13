export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export type LogFormat = "standard" | "syslog" | "json";

export interface LogEntry {
  lineNumber: number;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  raw: string;
}

export interface ParsedLog {
  fileName: string;
  format: LogFormat;
  totalLines: number;
  entries: LogEntry[];
  summary: {
    byLevel: Record<LogLevel, number>;
    timeRange: { start: string; end: string } | null;
  };
}
