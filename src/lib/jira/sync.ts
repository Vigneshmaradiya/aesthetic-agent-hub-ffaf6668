/* ──────────────────────────────────────────────────────────────────────────
 * JIRA Comment Sync — Bidirectional comment visibility
 *
 * Provides functions for:
 * 1. Fetching JIRA comments for linked issues
 * 2. Posting comments to JIRA from the copilot
 * 3. Syncing Zendesk comments → JIRA (via MCP tools)
 * ──────────────────────────────────────────────────────────────────────── */

import { callMCPTool } from "@/lib/mcp/client";

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
}

/**
 * Fetch comments for a JIRA issue via the MCP server.
 */
export async function fetchJiraComments(
  issueKey: string,
): Promise<JiraComment[]> {
  try {
    const result = await callMCPTool("jira-onprem", "get_issue", {
      issue_key: issueKey,
    });

    if (result.error || result.isError) return [];

    const parsed = JSON.parse(result.content?.[0]?.text ?? "{}");
    const comments = parsed.fields?.comment?.comments ?? parsed.comments ?? [];

    return comments.map((c: Record<string, unknown>) => ({
      id: String(c.id ?? ""),
      author: String(
        (c.author as Record<string, unknown>)?.displayName ??
          (c.author as Record<string, unknown>)?.name ??
          "Unknown",
      ),
      body: String(c.body ?? ""),
      created: String(c.created ?? ""),
      updated: String(c.updated ?? c.created ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Post a comment to a JIRA issue via the MCP server.
 */
export async function postJiraComment(
  issueKey: string,
  comment: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callMCPTool("jira-onprem", "add_comment", {
      issue_key: issueKey,
      comment,
    });

    if (result.error || result.isError) {
      const errorText = result.error ?? result.content?.[0]?.text ?? "Unknown error";
      return { success: false, error: String(errorText) };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post comment",
    };
  }
}

/**
 * Create a JIRA issue linked to a Zendesk ticket.
 */
export async function createLinkedJiraIssue(params: {
  summary: string;
  description: string;
  ticketId: string;
  projectKey?: string;
  issueType?: string;
}): Promise<{ success: boolean; issueKey?: string; error?: string }> {
  try {
    const result = await callMCPTool("jira-onprem", "create_issue", {
      summary: params.summary,
      description: `${params.description}\n\n---\n_Linked to Zendesk ticket #${params.ticketId}_`,
      project_key: params.projectKey ?? process.env.JIRA_DEFAULT_PROJECT ?? "SUPP",
      issue_type: params.issueType ?? "Bug",
    });

    if (result.error || result.isError) {
      const errorText = result.error ?? result.content?.[0]?.text ?? "Unknown error";
      return { success: false, error: String(errorText) };
    }

    const parsed = JSON.parse(result.content?.[0]?.text ?? "{}");
    const issueKey = String(parsed.key ?? parsed.id ?? "");

    // Try to link the Zendesk ticket ID to the JIRA issue
    if (issueKey && process.env.JIRA_TICKET_ID_FIELD) {
      try {
        await callMCPTool("jira-onprem", "link_zendesk_ticket", {
          issue_key: issueKey,
          ticket_id: params.ticketId,
        });
      } catch {
        // Non-critical — issue was created, just linking failed
      }
    }

    return { success: true, issueKey };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}
