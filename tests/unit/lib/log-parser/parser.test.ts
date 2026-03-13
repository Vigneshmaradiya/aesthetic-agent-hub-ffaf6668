import { describe, it, expect } from "vitest";
import { parseLogFile, detectFormat } from "@/lib/log-parser/parser";

const SAMPLE_STANDARD = `2026-03-05 10:00:00.123 [INFO] AuthService: User login successful
2026-03-05 10:00:01.456 [DEBUG] CacheManager: Cache hit for key user:1234
2026-03-05 10:00:02.789 [WARN] RateLimiter: Approaching rate limit for API key abc123
2026-03-05 10:00:03.012 [ERROR] BillingModule: Failed to process payment - timeout after 30s
2026-03-05 10:00:04.345 [INFO] TicketService: Ticket #1001 updated
2026-03-05 10:00:05.678 [FATAL] DatabasePool: Connection pool exhausted`;

const SAMPLE_JSON = `{"timestamp":"2026-03-05T10:00:00.000Z","level":"INFO","source":"AuthService","message":"User login successful"}
{"timestamp":"2026-03-05T10:00:01.000Z","level":"ERROR","source":"BillingModule","message":"Payment failed"}
{"timestamp":"2026-03-05T10:00:02.000Z","level":"DEBUG","logger":"CacheManager","msg":"Cache hit"}`;

describe("detectFormat", () => {
  it("detects standard format", () => {
    expect(
      detectFormat("2026-03-05 10:00:00.123 [INFO] AuthService: User login"),
    ).toBe("standard");
  });

  it("detects json format", () => {
    expect(
      detectFormat(
        '{"timestamp":"2026-03-05T10:00:00Z","level":"INFO","message":"hello"}',
      ),
    ).toBe("json");
  });

  it("detects syslog format", () => {
    expect(
      detectFormat("Mar  5 10:00:00 myhost sshd[1234]: Accepted publickey"),
    ).toBe("syslog");
  });

  it("defaults to standard for unrecognised lines", () => {
    expect(detectFormat("some random text")).toBe("standard");
  });
});

describe("parseLogFile - standard format", () => {
  it("parses all entries correctly", () => {
    const result = parseLogFile(SAMPLE_STANDARD, "standard", "test.log");

    expect(result.fileName).toBe("test.log");
    expect(result.format).toBe("standard");
    expect(result.entries).toHaveLength(6);
  });

  it("extracts fields from each entry", () => {
    const result = parseLogFile(SAMPLE_STANDARD, "standard", "test.log");
    const first = result.entries[0];

    expect(first.lineNumber).toBe(1);
    expect(first.timestamp).toBe("2026-03-05 10:00:00.123");
    expect(first.level).toBe("INFO");
    expect(first.source).toBe("AuthService");
    expect(first.message).toBe("User login successful");
  });

  it("auto-detects standard format", () => {
    const result = parseLogFile(SAMPLE_STANDARD);
    expect(result.format).toBe("standard");
    expect(result.entries).toHaveLength(6);
  });

  it("handles empty content", () => {
    const result = parseLogFile("");
    expect(result.entries).toHaveLength(0);
    expect(result.totalLines).toBe(1); // one empty line
  });
});

describe("parseLogFile - JSON format", () => {
  it("parses all JSON entries", () => {
    const result = parseLogFile(SAMPLE_JSON, "json", "app.json");

    expect(result.fileName).toBe("app.json");
    expect(result.format).toBe("json");
    expect(result.entries).toHaveLength(3);
  });

  it("extracts fields from JSON entries", () => {
    const result = parseLogFile(SAMPLE_JSON, "json");
    const first = result.entries[0];

    expect(first.timestamp).toBe("2026-03-05T10:00:00.000Z");
    expect(first.level).toBe("INFO");
    expect(first.source).toBe("AuthService");
    expect(first.message).toBe("User login successful");
  });

  it("handles alternative JSON field names (msg, logger)", () => {
    const result = parseLogFile(SAMPLE_JSON, "json");
    const third = result.entries[2];

    expect(third.source).toBe("CacheManager");
    expect(third.message).toBe("Cache hit");
  });

  it("auto-detects JSON format", () => {
    const result = parseLogFile(SAMPLE_JSON);
    expect(result.format).toBe("json");
  });
});

describe("summary generation", () => {
  it("counts entries by level", () => {
    const result = parseLogFile(SAMPLE_STANDARD, "standard");

    expect(result.summary.byLevel).toEqual({
      DEBUG: 1,
      INFO: 2,
      WARN: 1,
      ERROR: 1,
      FATAL: 1,
    });
  });

  it("determines time range from first and last entries", () => {
    const result = parseLogFile(SAMPLE_STANDARD, "standard");

    expect(result.summary.timeRange).toEqual({
      start: "2026-03-05 10:00:00.123",
      end: "2026-03-05 10:00:05.678",
    });
  });

  it("returns null time range for empty content", () => {
    const result = parseLogFile("");
    expect(result.summary.timeRange).toBeNull();
  });

  it("returns zero counts for empty content", () => {
    const result = parseLogFile("");
    expect(result.summary.byLevel).toEqual({
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      FATAL: 0,
    });
  });
});
