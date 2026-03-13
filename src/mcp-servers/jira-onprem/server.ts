/**
 * JIRA On-Premise MCP Server
 *
 * Provides issue tracking tools through the Model Context Protocol.
 * Connects to on-premise JIRA Server/Data Center via REST API v2
 * using Basic Authentication (service account).
 *
 * Tools provided:
 *  - search_issues        — Search issues using JQL
 *  - get_issue            — Get a single issue by key
 *  - create_issue         — Create a new issue with field mapping
 *  - update_issue         — Update an existing issue
 *  - add_comment          — Add a comment to an issue
 *  - link_zendesk_ticket  — Link a Zendesk ticket ID to a JIRA issue
 *  - find_by_ticket       — Find JIRA issues linked to a Zendesk ticket
 *
 * Auth: Basic Auth with JIRA_USERNAME + JIRA_PASSWORD env vars.
 * The MCP server handles all JIRA authentication internally.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchIssues,
  getIssue,
  createIssue,
  updateIssue,
  addComment,
  getComments,
  linkZendeskTicket,
  findIssuesByTicketId,
} from "../../lib/jira/api.js";

// ─── Server Creation ────────────────────────────────────────────

export function createJiraOnPremMCPServer(): McpServer {
  const server = new McpServer(
    {
      name: "jira-onprem",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const defaultProject = process.env.JIRA_DEFAULT_PROJECT || "";
  const ticketIdField = process.env.JIRA_TICKET_ID_FIELD || "";

  // ── search_issues ───────────────────────────────────────────
  server.tool(
    "search_issues",
    `Search JIRA issues using JQL (JIRA Query Language). Examples: "project=${defaultProject || "PROJ"} AND status=Open", "assignee=currentUser() AND priority=High"`,
    {
      jql: z
        .string()
        .describe(
          'JQL query string (e.g., "project=SUPP AND status=Open AND priority=High")',
        ),
      max_results: z
        .number()
        .optional()
        .describe("Maximum results to return (default: 50, max: 100)"),
      fields: z
        .string()
        .optional()
        .describe(
          "Comma-separated field names to return (default: summary,status,priority,assignee,created,updated)",
        ),
    },
    async (args) => {
      try {
        const fields = args.fields
          ? args.fields.split(",").map((f) => f.trim())
          : undefined;
        const result = await searchIssues(args.jql, {
          maxResults: args.max_results ?? 50,
          fields,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                total: result.total,
                count: result.issues.length,
                issues: result.issues.map((issue) => ({
                  key: issue.key,
                  summary: issue.fields.summary,
                  status: issue.fields.status?.name,
                  priority: issue.fields.priority?.name,
                  assignee: issue.fields.assignee?.displayName ?? "Unassigned",
                  created: issue.fields.created,
                  updated: issue.fields.updated,
                  url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
                })),
              }),
            },
          ],
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
                    : "Failed to search issues",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_issue ─────────────────────────────────────────────
  server.tool(
    "get_issue",
    "Get full details of a JIRA issue by its key (e.g., SUPP-123)",
    {
      issue_key: z
        .string()
        .describe('JIRA issue key (e.g., "SUPP-123", "PROJ-456")'),
    },
    async (args) => {
      try {
        const issue = await getIssue(args.issue_key);
        const comments = await getComments(args.issue_key);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                key: issue.key,
                summary: issue.fields.summary,
                description: issue.fields.description,
                status: issue.fields.status?.name,
                priority: issue.fields.priority?.name,
                type: issue.fields.issuetype?.name,
                assignee: issue.fields.assignee?.displayName ?? "Unassigned",
                reporter: issue.fields.reporter?.displayName ?? "Unknown",
                project: issue.fields.project?.key,
                labels: issue.fields.labels,
                created: issue.fields.created,
                updated: issue.fields.updated,
                url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
                ...(ticketIdField && issue.fields[ticketIdField]
                  ? {
                      zendesk_ticket_id: issue.fields[ticketIdField],
                    }
                  : {}),
                comments: comments.comments.map((c) => ({
                  author: c.author.displayName,
                  body: c.body,
                  created: c.created,
                })),
              }),
            },
          ],
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
                    : "Failed to get issue",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── create_issue ──────────────────────────────────────────
  server.tool(
    "create_issue",
    `Create a new JIRA issue.${defaultProject ? ` Default project: ${defaultProject}.` : ""}${ticketIdField ? ` Use zendesk_ticket_id to link to a Zendesk ticket via ${ticketIdField}.` : ""}`,
    {
      summary: z.string().describe("Issue summary/title"),
      description: z
        .string()
        .optional()
        .describe("Issue description (plain text)"),
      project: z
        .string()
        .optional()
        .describe(
          `Project key${defaultProject ? ` (default: ${defaultProject})` : ""}`,
        ),
      issuetype: z
        .string()
        .optional()
        .describe('Issue type: Bug, Task, Story, etc. (default: "Task")'),
      priority: z
        .string()
        .optional()
        .describe("Priority: Highest, High, Medium, Low, Lowest"),
      labels: z
        .array(z.string())
        .optional()
        .describe("Labels to apply to the issue"),
      assignee: z.string().optional().describe("JIRA username to assign to"),
      zendesk_ticket_id: z
        .string()
        .optional()
        .describe(
          "Zendesk ticket ID to link to this issue (stored in custom field)",
        ),
    },
    async (args) => {
      try {
        const customFields: Record<string, unknown> = {};
        if (args.zendesk_ticket_id) {
          customFields.zendesk_ticket_id = args.zendesk_ticket_id;
          // Also directly set the configured custom field
          if (ticketIdField) {
            customFields[ticketIdField] = args.zendesk_ticket_id;
          }
        }

        const result = await createIssue({
          project: args.project || defaultProject,
          summary: args.summary,
          description: args.description,
          issuetype: args.issuetype,
          priority: args.priority,
          labels: args.labels,
          assignee: args.assignee,
          customFields,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                key: result.key,
                id: result.id,
                url: `${process.env.JIRA_BASE_URL}/browse/${result.key}`,
                message: `Issue ${result.key} created successfully`,
                ...(args.zendesk_ticket_id
                  ? { linked_zendesk_ticket: args.zendesk_ticket_id }
                  : {}),
              }),
            },
          ],
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
                    : "Failed to create issue",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── update_issue ──────────────────────────────────────────
  server.tool(
    "update_issue",
    "Update an existing JIRA issue (summary, description, priority, status, assignee, labels)",
    {
      issue_key: z.string().describe("JIRA issue key (e.g., SUPP-123)"),
      summary: z.string().optional().describe("New summary/title"),
      description: z.string().optional().describe("New description"),
      priority: z
        .string()
        .optional()
        .describe("New priority: Highest, High, Medium, Low, Lowest"),
      status: z
        .string()
        .optional()
        .describe(
          "Transition to this status (e.g., In Progress, Done, Closed)",
        ),
      labels: z
        .array(z.string())
        .optional()
        .describe("Replace labels with these"),
      assignee: z
        .string()
        .optional()
        .describe("New assignee username (empty string to unassign)"),
    },
    async (args) => {
      try {
        const { issue_key, ...updateData } = args;
        await updateIssue(issue_key, updateData);

        // Fetch updated issue to return current state
        const updated = await getIssue(issue_key);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                key: updated.key,
                summary: updated.fields.summary,
                status: updated.fields.status?.name,
                priority: updated.fields.priority?.name,
                assignee: updated.fields.assignee?.displayName ?? "Unassigned",
                url: `${process.env.JIRA_BASE_URL}/browse/${updated.key}`,
                message: `Issue ${issue_key} updated successfully`,
              }),
            },
          ],
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
                    : "Failed to update issue",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── add_comment ───────────────────────────────────────────
  server.tool(
    "add_comment",
    "Add a comment to a JIRA issue",
    {
      issue_key: z.string().describe("JIRA issue key (e.g., SUPP-123)"),
      body: z.string().describe("Comment body text"),
    },
    async (args) => {
      try {
        const comment = await addComment(args.issue_key, args.body);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                id: comment.id,
                author: comment.author.displayName,
                created: comment.created,
                message: `Comment added to ${args.issue_key}`,
              }),
            },
          ],
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
                    : "Failed to add comment",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── link_zendesk_ticket ───────────────────────────────────
  if (ticketIdField) {
    server.tool(
      "link_zendesk_ticket",
      `Link a Zendesk ticket ID to a JIRA issue by setting the ${ticketIdField} custom field`,
      {
        issue_key: z.string().describe("JIRA issue key (e.g., SUPP-123)"),
        zendesk_ticket_id: z
          .string()
          .describe("Zendesk ticket ID to link (e.g., 164)"),
      },
      async (args) => {
        try {
          await linkZendeskTicket(args.issue_key, args.zendesk_ticket_id);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  message: `Zendesk ticket #${args.zendesk_ticket_id} linked to ${args.issue_key}`,
                  issue_url: `${process.env.JIRA_BASE_URL}/browse/${args.issue_key}`,
                }),
              },
            ],
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
                      : "Failed to link Zendesk ticket",
                }),
              },
            ],
            isError: true,
          };
        }
      },
    );

    // ── find_by_ticket ────────────────────────────────────────
    server.tool(
      "find_by_ticket",
      `Find JIRA issues linked to a Zendesk ticket via the ${ticketIdField} custom field`,
      {
        zendesk_ticket_id: z
          .string()
          .describe("Zendesk ticket ID to search for"),
      },
      async (args) => {
        try {
          const result = await findIssuesByTicketId(args.zendesk_ticket_id);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  zendesk_ticket_id: args.zendesk_ticket_id,
                  total: result.total,
                  issues: result.issues.map((issue) => ({
                    key: issue.key,
                    summary: issue.fields.summary,
                    status: issue.fields.status?.name,
                    url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
                  })),
                }),
              },
            ],
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
                      : "Failed to find issues by ticket ID",
                }),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  return server;
}
