import { describe, it, expect } from "vitest";
import { qualifyToolName, parseQualifiedName } from "@/lib/llm/tool-bridge";

describe("qualifyToolName", () => {
  it("should create a qualified name with double underscore separator", () => {
    expect(qualifyToolName("zendesk", "get_tickets")).toBe(
      "zendesk__get_tickets",
    );
  });

  it("should handle multi-word tool names", () => {
    expect(qualifyToolName("searchunify", "get-filter-options")).toBe(
      "searchunify__get-filter-options",
    );
  });

  it("should handle logparser service", () => {
    expect(qualifyToolName("logparser", "parse")).toBe("logparser__parse");
  });
});

describe("parseQualifiedName", () => {
  it("should parse a valid qualified name", () => {
    const result = parseQualifiedName("zendesk__get_tickets");
    expect(result).toEqual({ service: "zendesk", tool: "get_tickets" });
  });

  it("should parse searchunify tools", () => {
    const result = parseQualifiedName("searchunify__search");
    expect(result).toEqual({ service: "searchunify", tool: "search" });
  });

  it("should parse logparser tools", () => {
    const result = parseQualifiedName("logparser__parse");
    expect(result).toEqual({ service: "logparser", tool: "parse" });
  });

  it("should accept dynamically registered service names", () => {
    // parseQualifiedName now accepts any service name to support
    // dynamically registered agent MCPs (e.g., jira, elk, google-chat)
    const result = parseQualifiedName("unknown__tool");
    expect(result).toEqual({ service: "unknown", tool: "tool" });
  });

  it("should parse agent MCP qualified names", () => {
    const result = parseQualifiedName("jira__search_issues");
    expect(result).toEqual({ service: "jira", tool: "search_issues" });
  });

  it("should return null for names without separator", () => {
    const result = parseQualifiedName("no_separator_here");
    expect(result).toBeNull();
  });

  it("should return null for empty string", () => {
    const result = parseQualifiedName("");
    expect(result).toBeNull();
  });

  it("should handle tool names with underscores correctly", () => {
    const result = parseQualifiedName("zendesk__get_ticket_comments");
    expect(result).toEqual({
      service: "zendesk",
      tool: "get_ticket_comments",
    });
  });
});
