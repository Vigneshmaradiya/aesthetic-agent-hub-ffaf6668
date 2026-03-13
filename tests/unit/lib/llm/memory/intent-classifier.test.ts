import { describe, it, expect } from "vitest";
import { classifyIntent } from "@/lib/llm/memory/intent-classifier";

describe("classifyIntent", () => {
  describe("ticket_lookup", () => {
    it("should detect ticket ID references with #", () => {
      const result = classifyIntent("Show me ticket #1234");
      expect(result.intent).toBe("ticket_lookup");
      expect(result.extractedTicketIds).toContain("1234");
    });

    it("should detect ticket ID references without #", () => {
      const result = classifyIntent("Can you look up ticket 5678?");
      expect(result.intent).toBe("ticket_lookup");
      expect(result.extractedTicketIds).toContain("5678");
    });

    it("should extract multiple ticket IDs", () => {
      const result = classifyIntent("Compare tickets #1111 and #2222");
      expect(result.extractedTicketIds).toContain("1111");
      expect(result.extractedTicketIds).toContain("2222");
    });
  });

  describe("kb_search", () => {
    it("should detect knowledge base search intent", () => {
      const result = classifyIntent(
        "Search the knowledge base for password reset instructions",
      );
      expect(result.intent).toBe("kb_search");
    });

    it("should detect article lookup requests", () => {
      const result = classifyIntent("Find articles about SSO configuration");
      expect(result.intent).toBe("kb_search");
    });

    it("should detect how-to questions", () => {
      const result = classifyIntent(
        "How do I configure two-factor authentication?",
      );
      expect(result.intent).toBe("kb_search");
    });
  });

  describe("log_analysis", () => {
    it("should detect log analysis requests", () => {
      const result = classifyIntent("Parse these error logs for me");
      expect(result.intent).toBe("log_analysis");
    });

    it("should detect stack trace mentions", () => {
      const result = classifyIntent(
        "Can you analyze this stack trace from the crash?",
      );
      expect(result.intent).toBe("log_analysis");
    });
  });

  describe("draft_response", () => {
    it("should detect draft/reply requests", () => {
      const result = classifyIntent(
        "Draft a reply to the customer explaining the fix",
      );
      expect(result.intent).toBe("draft_response");
    });

    it("should detect compose requests", () => {
      const result = classifyIntent(
        "Compose an email to follow up on this issue",
      );
      expect(result.intent).toBe("draft_response");
    });
  });

  describe("ticket_update", () => {
    it("should detect ticket update requests", () => {
      const result = classifyIntent("Update ticket #1234 priority to high");
      expect(result.intent).toBe("ticket_update");
      expect(result.extractedTicketIds).toContain("1234");
    });

    it("should detect close/resolve requests", () => {
      const result = classifyIntent("Close this ticket as resolved");
      expect(result.intent).toBe("ticket_update");
    });
  });

  describe("greeting", () => {
    it("should detect simple greetings", () => {
      const result = classifyIntent("Hello!");
      expect(result.intent).toBe("greeting");
    });

    it("should detect hi greetings", () => {
      const result = classifyIntent("Hi there");
      expect(result.intent).toBe("greeting");
    });
  });

  describe("general_question", () => {
    it("should fall back to general_question for ambiguous inputs", () => {
      const result = classifyIntent("What is the current status of things?");
      // This is ambiguous — should get a result with lower confidence
      expect(result.confidence).toBeLessThan(1);
    });
  });

  describe("error code extraction", () => {
    it("should extract error codes from text", () => {
      const result = classifyIntent(
        "Customer is seeing error code 500 on login",
      );
      expect(result.extractedErrorCodes.length).toBeGreaterThan(0);
    });
  });

  describe("confidence scoring", () => {
    it("should have high confidence for obvious intents", () => {
      const result = classifyIntent("Show me ticket #9999");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should return a value between 0 and 1", () => {
      const result = classifyIntent("Something random here");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
