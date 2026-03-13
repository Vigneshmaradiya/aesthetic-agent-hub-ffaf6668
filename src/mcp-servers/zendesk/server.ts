/**
 * Custom Zendesk MCP Server
 *
 * A complete MCP server that provides all Zendesk tools through
 * the Model Context Protocol. Replaces the external reminia/mcp-zendesk
 * server with a TypeScript implementation that uses the Zendesk REST API.
 *
 * Tools provided:
 *  - get_tickets       — List tickets with optional filters
 *  - get_my_tickets    — List tickets assigned to a specific user
 *  - get_ticket        — Get a single ticket by ID
 *  - get_ticket_comments — Get all comments for a ticket
 *  - search_tickets    — Search tickets using Zendesk query syntax
 *  - create_ticket     — Create a new ticket
 *  - update_ticket     — Update an existing ticket
 *  - create_ticket_comment — Add a comment to a ticket
 *  - get_users         — Batch-fetch users by ID
 *
 * Auth: Supports both OAuth (Bearer token forwarding) and API token modes.
 * The server reads ZENDESK_SUBDOMAIN + ZENDESK_EMAIL + ZENDESK_API_TOKEN
 * from environment variables for API token mode. For OAuth mode, the
 * Bearer token is extracted from incoming HTTP requests and forwarded
 * to Zendesk API calls.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getTickets,
  getMyTickets,
  getTicket,
  getTicketComments,
  searchTickets,
  createTicket,
  updateTicket,
  createTicketComment,
  getUsers,
  getOrganizations,
} from "../../lib/zendesk/api.js";

// ─── Auth Context ───────────────────────────────────────────────
// When an incoming HTTP request includes a Bearer token, the start.ts
// entry point stores it here so tool handlers can use it for
// authenticated Zendesk API calls.

let _currentAccessToken: string | undefined;

export function setCurrentAccessToken(token: string | undefined): void {
  _currentAccessToken = token;
}

function getAccessToken(): string | undefined {
  return _currentAccessToken;
}

// ─── Server Creation ────────────────────────────────────────────

export function createZendeskMCPServer(): McpServer {
  const server = new McpServer(
    {
      name: "zendesk",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ── get_tickets ─────────────────────────────────────────────
  server.tool(
    "get_tickets",
    "List Zendesk tickets with optional status filter and pagination",
    {
      status: z
        .string()
        .optional()
        .describe("Filter by status: new, open, pending, hold, solved, closed"),
      page: z.number().optional().describe("Page number (default: 1)"),
      per_page: z
        .number()
        .optional()
        .describe("Results per page (default: 100, max: 100)"),
    },
    async (args) => {
      try {
        const result = await getTickets(
          {
            status: args.status,
            page: args.page,
            per_page: args.per_page,
          },
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to list tickets",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_my_tickets ────────────────────────────────────────────
  server.tool(
    "get_my_tickets",
    "List Zendesk tickets assigned to a specific user. Use this for queries like 'my tickets', 'tickets assigned to me', or 'what's in my queue'. Requires the user's Zendesk user ID (available in the Authenticated Agent context).",
    {
      user_id: z
        .string()
        .describe(
          "Zendesk user ID of the assignee. Use the authenticated agent's Zendesk User ID from context.",
        ),
      status: z
        .string()
        .optional()
        .describe("Filter by status: new, open, pending, hold, solved, closed"),
      sort_by: z
        .string()
        .optional()
        .describe("Sort field: created_at, updated_at, priority, status"),
      sort_order: z
        .enum(["asc", "desc"])
        .optional()
        .describe("Sort direction (default: desc — most recent first)"),
      per_page: z
        .number()
        .optional()
        .describe("Results per page (default: 100, max: 100)"),
    },
    async (args) => {
      try {
        const result = await getMyTickets(
          args.user_id,
          {
            status: args.status,
            sort_by: args.sort_by,
            sort_order: args.sort_order,
            per_page: args.per_page,
          },
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to list user tickets",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_ticket ──────────────────────────────────────────────
  server.tool(
    "get_ticket",
    "Get a single Zendesk ticket by ID, including requester info",
    {
      ticket_id: z.string().describe("The Zendesk ticket ID"),
    },
    async (args) => {
      try {
        const result = await getTicket(args.ticket_id, getAccessToken());

        // Enrich ticket with requester info from side-loaded users
        const requesterUser = result.users?.find(
          (u) => u.id === result.ticket.requester_id,
        );

        // Resolve organization name if org ID exists
        let organizationName: string | undefined;
        const orgId =
          result.ticket.organization_id ?? requesterUser?.organization_id;
        if (orgId) {
          try {
            const orgs = await getOrganizations([orgId], getAccessToken());
            organizationName = orgs.organizations?.[0]?.name;
          } catch {
            /* org fetch is best-effort */
          }
        }

        const enriched = {
          ...result,
          ticket: {
            ...result.ticket,
            organization_name: organizationName,
            requester: requesterUser
              ? {
                  id: requesterUser.id,
                  name: requesterUser.name,
                  email: requesterUser.email,
                  role: requesterUser.role,
                  organization_id: requesterUser.organization_id,
                  organization_name: organizationName,
                }
              : undefined,
          },
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(enriched) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to get ticket",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_ticket_comments ─────────────────────────────────────
  server.tool(
    "get_ticket_comments",
    "Get all comments for a Zendesk ticket, including author names and roles. Returns comments in chronological order with attachment info.",
    {
      ticket_id: z.string().describe("The Zendesk ticket ID"),
    },
    async (args) => {
      try {
        const result = await getTicketComments(
          args.ticket_id,
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to get ticket comments",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── search_tickets ──────────────────────────────────────────
  server.tool(
    "search_tickets",
    "Search Zendesk tickets using query syntax (e.g., 'status:open priority:high api timeout'). Automatically scoped to type:ticket.",
    {
      query: z
        .string()
        .describe(
          "Zendesk search query (e.g., 'status:open api error', 'priority:high assignee:me')",
        ),
      page: z.number().optional().describe("Page number (default: 1)"),
      per_page: z
        .number()
        .optional()
        .describe("Results per page (default: 100, max: 100)"),
      sort_by: z
        .string()
        .optional()
        .describe(
          "Sort field: created_at, updated_at, priority, status, ticket_type",
        ),
    },
    async (args) => {
      try {
        const result = await searchTickets(
          args.query,
          {
            page: args.page,
            per_page: args.per_page,
            sort_by: args.sort_by,
          },
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to search tickets",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── create_ticket ───────────────────────────────────────────
  server.tool(
    "create_ticket",
    "Create a new Zendesk support ticket",
    {
      subject: z.string().describe("Ticket subject line"),
      description: z
        .string()
        .describe("Ticket description / initial comment body"),
      priority: z
        .string()
        .optional()
        .describe("Priority: low, normal, high, urgent"),
      status: z
        .string()
        .optional()
        .describe("Initial status: new, open, pending (default: new)"),
      tags: z.array(z.string()).optional().describe("Tags to apply"),
      requester_name: z
        .string()
        .optional()
        .describe("Requester name (for tickets on behalf of someone)"),
      requester_email: z
        .string()
        .optional()
        .describe("Requester email (for tickets on behalf of someone)"),
      assignee_id: z
        .number()
        .optional()
        .describe("Agent ID to assign the ticket to"),
      group_id: z
        .number()
        .optional()
        .describe("Group ID to assign the ticket to"),
    },
    async (args) => {
      try {
        const requester =
          args.requester_name || args.requester_email
            ? {
                name: args.requester_name,
                email: args.requester_email,
              }
            : undefined;

        const result = await createTicket(
          {
            subject: args.subject,
            description: args.description,
            priority: args.priority,
            status: args.status,
            tags: args.tags,
            requester,
            assignee_id: args.assignee_id,
            group_id: args.group_id,
          },
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to create ticket",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── update_ticket ───────────────────────────────────────────
  server.tool(
    "update_ticket",
    "Update an existing Zendesk ticket (status, priority, tags, assignment, etc.)",
    {
      ticket_id: z.string().describe("The Zendesk ticket ID to update"),
      subject: z.string().optional().describe("New subject line"),
      status: z
        .string()
        .optional()
        .describe("New status: new, open, pending, hold, solved, closed"),
      priority: z
        .string()
        .optional()
        .describe("New priority: low, normal, high, urgent"),
      tags: z.array(z.string()).optional().describe("Replace tags"),
      assignee_id: z
        .number()
        .optional()
        .describe("New assignee agent ID (null to unassign)"),
      group_id: z
        .number()
        .optional()
        .describe("New group ID (null to unassign)"),
    },
    async (args) => {
      try {
        const { ticket_id, ...updateData } = args;
        const result = await updateTicket(
          ticket_id,
          updateData,
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to update ticket",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── create_ticket_comment ───────────────────────────────────
  server.tool(
    "create_ticket_comment",
    "Add a comment to an existing Zendesk ticket. Can be a public reply or an internal note.",
    {
      ticket_id: z.string().describe("The Zendesk ticket ID"),
      body: z.string().describe("Comment body text"),
      public: z
        .boolean()
        .optional()
        .describe(
          "True for public reply, false for internal note (default: true)",
        ),
      author_id: z
        .number()
        .optional()
        .describe("Author user ID (default: authenticated user)"),
    },
    async (args) => {
      try {
        const result = await createTicketComment(
          args.ticket_id,
          {
            body: args.body,
            public: args.public,
            author_id: args.author_id,
          },
          getAccessToken(),
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to create comment",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_users ─────────────────────────────────────────────────
  server.tool(
    "get_users",
    "Batch-fetch Zendesk users by ID. Returns user profiles (name, email, role, organization). Max 100 IDs per call.",
    {
      ids: z
        .array(z.number())
        .describe("Array of Zendesk user IDs to look up (max 100)"),
    },
    async (args) => {
      try {
        const result = await getUsers(args.ids, getAccessToken());
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch users",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
