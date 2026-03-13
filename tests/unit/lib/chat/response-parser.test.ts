import { describe, it, expect, beforeEach } from "vitest";
import { parseAssistantResponseForCanvas } from "@/lib/chat/response-parser";
import { useCanvasStore } from "@/stores/canvas-store";

describe("response-parser", () => {
  beforeEach(() => {
    useCanvasStore.getState().clearCanvas();
  });

  describe("parseDraftResponse", () => {
    it("should parse a simple draft response section", () => {
      const content = `
## Analysis

The ticket is about API rate limiting.

### Draft Response

Dear Customer,

Thank you for reaching out about the API rate limiting issue. We have identified the root cause and applied a fix to your account. Your rate limits should now reflect your upgraded plan tier.

Please allow 15 minutes for the changes to propagate. If you continue to experience issues, don't hesitate to reach out.

Best regards,
Support Team

### Next Steps

Follow up in 24 hours.
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.draftResponse).toContain("Dear Customer");
      expect(state.draftResponse).toContain("rate limiting");
      expect(state.draftResponse).not.toContain("Next Steps");
      expect(state.sections["response-draft"].visible).toBe(true);
    });

    it("should handle nested draft headings (LLM outputs parent + child headings)", () => {
      const content = `
## Analysis

The issue appears to be related to rate limiting.

### Draft Reply for Ticket #483

### Draft Response

Dear Customer,

We've investigated the API rate limiting issue you reported. The root cause was that your plan upgrade didn't properly update the rate limit thresholds in our system.

We've corrected this on our end. Your new rate limits should now be active.

Best regards,
Support Team

### Root Cause

API rate limits not updated after plan upgrade.
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.draftResponse).toContain("Dear Customer");
      expect(state.draftResponse).toContain("rate limiting issue");
      expect(state.draftResponse).not.toContain("Root Cause");
      expect(state.sections["response-draft"].visible).toBe(true);
    });

    it("should not parse draft response when content is too short", () => {
      const content = `
### Draft Response

Hi.

### Next Steps
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.draftResponse).toBe("");
      expect(state.sections["response-draft"].visible).toBe(false);
    });

    it("should handle Suggested Reply heading", () => {
      const content = `
### Suggested Reply

Hello,

Thank you for contacting us about your billing concern. We have reviewed your account and found that the charge was applied correctly based on your current subscription plan.

If you believe this is an error, please provide your invoice number and we'll investigate further.

Best,
Support
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.draftResponse).toContain("billing concern");
      expect(state.sections["response-draft"].visible).toBe(true);
    });
  });

  describe("parseTroubleshootingSteps", () => {
    it("should parse numbered troubleshooting steps", () => {
      const content = `
### Troubleshooting Steps

1. **Check API keys** - Verify that the API keys are valid and not expired
2. **Review rate limits** - Check current rate limit configuration
3. **Test connectivity** - Run a basic API connectivity test

### Summary
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.troubleshootingSteps).toHaveLength(3);
      expect(state.troubleshootingSteps[0].title).toBe("Check API keys");
      expect(state.troubleshootingSteps[1].title).toBe("Review rate limits");
    });
  });

  describe("parseNextBestAction", () => {
    it("should parse recommended action with confidence", () => {
      const content = `
### Recommended Action

Investigate the customer's API configuration to verify rate limit settings.
Confidence: 85%
The customer reports intermittent 429 errors which suggests misconfigured rate limits after their recent plan upgrade.
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.nextBestAction).not.toBeNull();
      expect(state.nextBestAction!.confidence).toBe(0.85);
      expect(state.nextBestAction!.category).toBe("investigate");
    });
  });

  describe("parseRootCause", () => {
    it("should parse root cause with evidence", () => {
      const content = `
### Root Cause

API rate limits were not properly updated after the customer's plan upgrade.
Confidence: 80%
- Rate limit headers show old plan values
- Upgrade timestamp predates the reported issue
- No configuration sync event in audit logs
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.rootCauseSignals).toHaveLength(1);
      expect(state.rootCauseSignals[0].confidence).toBe(0.8);
      expect(state.rootCauseSignals[0].evidence).toHaveLength(3);
    });
  });

  describe("parseSimilarCases", () => {
    it("should parse similar case listings", () => {
      const content = `
### Similar Cases

- #12345: API rate limit configuration issue (similarity 85%, resolved)
- #12400: Rate limiting errors after plan change (similarity 72%, resolved)
- #12501: Intermittent 429 errors on API calls (similarity 65%, open)
`;

      parseAssistantResponseForCanvas(content);

      const state = useCanvasStore.getState();
      expect(state.similarCases).toHaveLength(3);
      expect(state.similarCases[0].ticketId).toBe("12345");
      expect(state.similarCases[0].similarity).toBe(0.85);
      expect(state.similarCases[0].status).toBe("solved");
      expect(state.similarCases[2].status).toBe("open");
    });
  });
});
