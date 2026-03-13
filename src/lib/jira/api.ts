/**
 * JIRA On-Premise REST API Client
 *
 * Communicates with JIRA Server / Data Center REST API v2 using
 * Basic Authentication (username:password).
 *
 * Environment variables (read by the MCP server, not by Nexus):
 *   JIRA_BASE_URL          — e.g., "https://jira.company.com"
 *   JIRA_USERNAME           — Service account username
 *   JIRA_PASSWORD           — Service account password
 *   JIRA_DEFAULT_PROJECT    — Default project key (e.g., "SUPP")
 *   JIRA_TICKET_ID_FIELD    — Custom field for Zendesk ticket ID (e.g., "customfield_12345")
 */

const TIMEOUT_MS = Number(process.env.MCP_REQUEST_TIMEOUT_MS) || 30_000;

// ─── Auth ────────────────────────────────────────────────────────

function getAuthHeader(): string {
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PASSWORD;
  if (!username || !password) {
    throw new Error("JIRA_USERNAME and JIRA_PASSWORD must be set");
  }
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

function getBaseUrl(): string {
  const url = process.env.JIRA_BASE_URL;
  if (!url) throw new Error("JIRA_BASE_URL must be set");
  return url.replace(/\/+$/, ""); // strip trailing slashes
}

// ─── HTTP Helpers ────────────────────────────────────────────────

async function jiraGet<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}/rest/api/2${path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `JIRA API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<T>;
}

async function jiraPost<T>(path: string, data: unknown): Promise<T> {
  const url = `${getBaseUrl()}/rest/api/2${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `JIRA API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<T>;
}

async function jiraPut<T>(path: string, data: unknown): Promise<T | null> {
  const url = `${getBaseUrl()}/rest/api/2${path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `JIRA API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`,
    );
  }

  // PUT on JIRA often returns 204 No Content
  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    description?: string | null;
    status: { name: string; id: string };
    priority: { name: string; id: string } | null;
    issuetype: { name: string; id: string };
    assignee: { displayName: string; emailAddress?: string } | null;
    reporter: { displayName: string; emailAddress?: string } | null;
    project: { key: string; name: string };
    created: string;
    updated: string;
    labels: string[];
    [key: string]: unknown; // Custom fields
  };
}

export interface JiraSearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraComment {
  id: string;
  body: string;
  author: { displayName: string; emailAddress?: string };
  created: string;
  updated: string;
}

export interface JiraCreateResponse {
  id: string;
  key: string;
  self: string;
}

// ─── API Functions ───────────────────────────────────────────────

/**
 * Search issues using JQL.
 */
export async function searchIssues(
  jql: string,
  opts?: { maxResults?: number; startAt?: number; fields?: string[] },
): Promise<JiraSearchResult> {
  const params = new URLSearchParams();
  params.set("jql", jql);
  if (opts?.maxResults) params.set("maxResults", String(opts.maxResults));
  if (opts?.startAt) params.set("startAt", String(opts.startAt));
  if (opts?.fields?.length) params.set("fields", opts.fields.join(","));

  return jiraGet<JiraSearchResult>(`/search?${params.toString()}`);
}

/**
 * Get a single issue by key (e.g., "SUPP-123").
 */
export async function getIssue(
  issueKey: string,
  fields?: string[],
): Promise<JiraIssue> {
  const params = fields?.length ? `?fields=${fields.join(",")}` : "";
  return jiraGet<JiraIssue>(`/issue/${issueKey}${params}`);
}

/**
 * Create a new issue.
 */
export async function createIssue(data: {
  project: string;
  summary: string;
  description?: string;
  issuetype?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, unknown>;
}): Promise<JiraCreateResponse> {
  const defaultProject = process.env.JIRA_DEFAULT_PROJECT;
  const ticketIdField = process.env.JIRA_TICKET_ID_FIELD;

  const fields: Record<string, unknown> = {
    project: { key: data.project || defaultProject || "SUPP" },
    summary: data.summary,
    issuetype: { name: data.issuetype || "Task" },
  };

  if (data.description) fields.description = data.description;
  if (data.priority) fields.priority = { name: data.priority };
  if (data.labels) fields.labels = data.labels;
  if (data.assignee) fields.assignee = { name: data.assignee };

  // Merge custom fields (including ticket ID mapping)
  if (data.customFields) {
    for (const [key, value] of Object.entries(data.customFields)) {
      fields[key] = value;
    }
  }

  // If ticket_id_field is configured and zendesk_ticket_id is in custom fields,
  // map it to the configured field
  if (
    ticketIdField &&
    data.customFields?.zendesk_ticket_id &&
    !fields[ticketIdField]
  ) {
    fields[ticketIdField] = String(data.customFields.zendesk_ticket_id);
  }

  return jiraPost<JiraCreateResponse>("/issue", { fields });
}

/**
 * Update an existing issue.
 */
export async function updateIssue(
  issueKey: string,
  data: {
    summary?: string;
    description?: string;
    priority?: string;
    labels?: string[];
    assignee?: string;
    status?: string;
    customFields?: Record<string, unknown>;
  },
): Promise<void> {
  const fields: Record<string, unknown> = {};

  if (data.summary) fields.summary = data.summary;
  if (data.description) fields.description = data.description;
  if (data.priority) fields.priority = { name: data.priority };
  if (data.labels) fields.labels = data.labels;
  if (data.assignee !== undefined) {
    fields.assignee = data.assignee ? { name: data.assignee } : null;
  }

  // Merge custom fields
  if (data.customFields) {
    for (const [key, value] of Object.entries(data.customFields)) {
      fields[key] = value;
    }
  }

  if (Object.keys(fields).length > 0) {
    await jiraPut(`/issue/${issueKey}`, { fields });
  }

  // Status transitions require a separate API call
  if (data.status) {
    await transitionIssue(issueKey, data.status);
  }
}

/**
 * Transition an issue to a new status.
 * First fetches available transitions, then executes the matching one.
 */
export async function transitionIssue(
  issueKey: string,
  targetStatus: string,
): Promise<void> {
  const transitions = await jiraGet<{
    transitions: Array<{ id: string; name: string; to: { name: string } }>;
  }>(`/issue/${issueKey}/transitions`);

  const match = transitions.transitions.find(
    (t) =>
      t.name.toLowerCase() === targetStatus.toLowerCase() ||
      t.to.name.toLowerCase() === targetStatus.toLowerCase(),
  );

  if (!match) {
    const available = transitions.transitions.map((t) => t.to.name).join(", ");
    throw new Error(
      `No transition to "${targetStatus}" available. Available: ${available}`,
    );
  }

  await jiraPost(`/issue/${issueKey}/transitions`, {
    transition: { id: match.id },
  });
}

/**
 * Add a comment to an issue.
 */
export async function addComment(
  issueKey: string,
  body: string,
): Promise<JiraComment> {
  return jiraPost<JiraComment>(`/issue/${issueKey}/comment`, { body });
}

/**
 * Get comments for an issue.
 */
export async function getComments(
  issueKey: string,
): Promise<{ comments: JiraComment[]; total: number }> {
  return jiraGet<{ comments: JiraComment[]; total: number }>(
    `/issue/${issueKey}/comment`,
  );
}

/**
 * Link a Zendesk ticket ID to a JIRA issue via the configured custom field.
 */
export async function linkZendeskTicket(
  issueKey: string,
  zendeskTicketId: string,
): Promise<void> {
  const ticketIdField = process.env.JIRA_TICKET_ID_FIELD;
  if (!ticketIdField) {
    throw new Error(
      "JIRA_TICKET_ID_FIELD not configured — cannot link Zendesk ticket",
    );
  }

  await jiraPut(`/issue/${issueKey}`, {
    fields: {
      [ticketIdField]: zendeskTicketId,
    },
  });
}

/**
 * Find JIRA issues linked to a Zendesk ticket via the custom field.
 */
export async function findIssuesByTicketId(
  zendeskTicketId: string,
): Promise<JiraSearchResult> {
  const ticketIdField = process.env.JIRA_TICKET_ID_FIELD;
  if (!ticketIdField) {
    throw new Error(
      "JIRA_TICKET_ID_FIELD not configured — cannot search by ticket ID",
    );
  }

  const jql = `"${ticketIdField}" ~ "${zendeskTicketId}"`;
  return searchIssues(jql, { maxResults: 10 });
}
