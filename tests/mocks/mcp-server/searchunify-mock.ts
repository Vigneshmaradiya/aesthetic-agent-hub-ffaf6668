/**
 * Mock SearchUnify MCP Server for testing.
 * Simulates the same tool signatures as searchunify/su-mcp.
 * ONLY used in tests - never in development or production.
 */

export const MOCK_SEARCH_RESULTS = [
  {
    title: "Troubleshooting Login Issues",
    url: "https://kb.example.com/login-issues",
    snippet:
      "If you encounter a 500 error when logging in, clear browser cache and cookies...",
    source: "Knowledge Base",
    relevance: 0.95,
    sourceId: "KB-001",
  },
  {
    title: "API Rate Limiting Best Practices",
    url: "https://kb.example.com/rate-limiting",
    snippet:
      "Our API enforces a rate limit of 200 requests per minute per API key...",
    source: "Knowledge Base",
    relevance: 0.87,
    sourceId: "KB-002",
  },
  {
    title: "Dashboard Performance Optimization",
    url: "https://kb.example.com/dashboard-perf",
    snippet:
      "If the dashboard is loading slowly, check your browser extensions...",
    source: "Knowledge Base",
    relevance: 0.72,
    sourceId: "KB-003",
  },
];

export function mockSearchUnifyToolCall(
  tool: string,
  args: Record<string, unknown>,
) {
  switch (tool) {
    case "search":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              results: MOCK_SEARCH_RESULTS.filter(
                (r) =>
                  !args.searchString ||
                  r.title
                    .toLowerCase()
                    .includes(String(args.searchString).toLowerCase()) ||
                  r.snippet
                    .toLowerCase()
                    .includes(String(args.searchString).toLowerCase()),
              ),
              totalResults: MOCK_SEARCH_RESULTS.length,
            }),
          },
        ],
      };
    case "get-filter-options":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              filters: [
                {
                  name: "source",
                  options: ["Knowledge Base", "Community", "Docs"],
                },
                {
                  name: "category",
                  options: ["Authentication", "API", "Performance", "Billing"],
                },
              ],
            }),
          },
        ],
      };
    case "analytics":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              zeroResultQueries: ["obscure error code XYZ"],
              topSearches: ["login", "api key", "rate limit"],
              searchVolume: 1250,
            }),
          },
        ],
      };
    default:
      return { error: `Unknown tool: ${tool}` };
  }
}
