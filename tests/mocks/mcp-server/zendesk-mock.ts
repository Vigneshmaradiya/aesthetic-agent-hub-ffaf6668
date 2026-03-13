/**
 * Mock Zendesk MCP Server for testing.
 * Simulates the same tool signatures as reminia/zendesk-mcp-server.
 * ONLY used in tests - never in development or production.
 */

export const MOCK_TICKETS = [
  {
    id: "1001",
    subject: "Cannot login to dashboard",
    status: "open",
    priority: "high",
    requester: { name: "Alice Chen", email: "alice@example.com" },
    created_at: "2026-03-05T10:00:00Z",
    updated_at: "2026-03-05T14:30:00Z",
    tags: ["login", "dashboard", "urgent"],
  },
  {
    id: "1002",
    subject: "API rate limit exceeded",
    status: "open",
    priority: "medium",
    requester: { name: "Bob Smith", email: "bob@example.com" },
    created_at: "2026-03-05T11:00:00Z",
    updated_at: "2026-03-05T12:00:00Z",
    tags: ["api", "rate-limit"],
  },
  {
    id: "1003",
    subject: "Billing shows incorrect amount",
    status: "pending",
    priority: "high",
    requester: { name: "Carol Davis", email: "carol@example.com" },
    created_at: "2026-03-04T09:00:00Z",
    updated_at: "2026-03-05T16:00:00Z",
    tags: ["billing", "urgent"],
  },
];

export const MOCK_COMMENTS = [
  {
    id: "c1",
    ticket_id: "1001",
    author: "Alice Chen",
    body: "I can't login since this morning. Getting a 500 error.",
    created_at: "2026-03-05T10:00:00Z",
    public: true,
  },
  {
    id: "c2",
    ticket_id: "1001",
    author: "Support Agent",
    body: "Looking into this now. Can you try clearing your cache?",
    created_at: "2026-03-05T14:30:00Z",
    public: true,
  },
];

export function mockZendeskToolCall(
  tool: string,
  args: Record<string, unknown>,
) {
  switch (tool) {
    case "get_tickets":
      return {
        content: [{ type: "text", text: JSON.stringify(MOCK_TICKETS) }],
      };
    case "get_ticket":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              MOCK_TICKETS.find((t) => t.id === args.ticketId) ?? null,
            ),
          },
        ],
      };
    case "get_ticket_comments":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              MOCK_COMMENTS.filter((c) => c.ticket_id === args.ticketId),
            ),
          },
        ],
      };
    case "create_ticket_comment":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              ticketId: args.ticketId,
              commentId: `c-${Date.now()}`,
            }),
          },
        ],
      };
    case "create_ticket":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              ticketId: `t-${Date.now()}`,
            }),
          },
        ],
      };
    case "update_ticket":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, ticketId: args.ticketId }),
          },
        ],
      };
    default:
      return { error: `Unknown tool: ${tool}` };
  }
}
