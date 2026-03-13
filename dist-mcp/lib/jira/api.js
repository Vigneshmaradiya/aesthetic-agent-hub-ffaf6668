"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchIssues = searchIssues;
exports.getIssue = getIssue;
exports.createIssue = createIssue;
exports.updateIssue = updateIssue;
exports.transitionIssue = transitionIssue;
exports.addComment = addComment;
exports.getComments = getComments;
exports.linkZendeskTicket = linkZendeskTicket;
exports.findIssuesByTicketId = findIssuesByTicketId;
const TIMEOUT_MS = Number(process.env.MCP_REQUEST_TIMEOUT_MS) || 30_000;
// ─── Auth ────────────────────────────────────────────────────────
function getAuthHeader() {
    const username = process.env.JIRA_USERNAME;
    const password = process.env.JIRA_PASSWORD;
    if (!username || !password) {
        throw new Error("JIRA_USERNAME and JIRA_PASSWORD must be set");
    }
    const encoded = Buffer.from(`${username}:${password}`).toString("base64");
    return `Basic ${encoded}`;
}
function getBaseUrl() {
    const url = process.env.JIRA_BASE_URL;
    if (!url)
        throw new Error("JIRA_BASE_URL must be set");
    return url.replace(/\/+$/, ""); // strip trailing slashes
}
// ─── HTTP Helpers ────────────────────────────────────────────────
async function jiraGet(path) {
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
        throw new Error(`JIRA API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`);
    }
    return response.json();
}
async function jiraPost(path, data) {
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
        throw new Error(`JIRA API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`);
    }
    return response.json();
}
async function jiraPut(path, data) {
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
        throw new Error(`JIRA API ${response.status}: ${response.statusText} — ${body.slice(0, 300)}`);
    }
    // PUT on JIRA often returns 204 No Content
    if (response.status === 204)
        return null;
    return response.json();
}
// ─── API Functions ───────────────────────────────────────────────
/**
 * Search issues using JQL.
 */
async function searchIssues(jql, opts) {
    const params = new URLSearchParams();
    params.set("jql", jql);
    if (opts?.maxResults)
        params.set("maxResults", String(opts.maxResults));
    if (opts?.startAt)
        params.set("startAt", String(opts.startAt));
    if (opts?.fields?.length)
        params.set("fields", opts.fields.join(","));
    return jiraGet(`/search?${params.toString()}`);
}
/**
 * Get a single issue by key (e.g., "SUPP-123").
 */
async function getIssue(issueKey, fields) {
    const params = fields?.length ? `?fields=${fields.join(",")}` : "";
    return jiraGet(`/issue/${issueKey}${params}`);
}
/**
 * Create a new issue.
 */
async function createIssue(data) {
    const defaultProject = process.env.JIRA_DEFAULT_PROJECT;
    const ticketIdField = process.env.JIRA_TICKET_ID_FIELD;
    const fields = {
        project: { key: data.project || defaultProject || "SUPP" },
        summary: data.summary,
        issuetype: { name: data.issuetype || "Task" },
    };
    if (data.description)
        fields.description = data.description;
    if (data.priority)
        fields.priority = { name: data.priority };
    if (data.labels)
        fields.labels = data.labels;
    if (data.assignee)
        fields.assignee = { name: data.assignee };
    // Merge custom fields (including ticket ID mapping)
    if (data.customFields) {
        for (const [key, value] of Object.entries(data.customFields)) {
            fields[key] = value;
        }
    }
    // If ticket_id_field is configured and zendesk_ticket_id is in custom fields,
    // map it to the configured field
    if (ticketIdField &&
        data.customFields?.zendesk_ticket_id &&
        !fields[ticketIdField]) {
        fields[ticketIdField] = String(data.customFields.zendesk_ticket_id);
    }
    return jiraPost("/issue", { fields });
}
/**
 * Update an existing issue.
 */
async function updateIssue(issueKey, data) {
    const fields = {};
    if (data.summary)
        fields.summary = data.summary;
    if (data.description)
        fields.description = data.description;
    if (data.priority)
        fields.priority = { name: data.priority };
    if (data.labels)
        fields.labels = data.labels;
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
async function transitionIssue(issueKey, targetStatus) {
    const transitions = await jiraGet(`/issue/${issueKey}/transitions`);
    const match = transitions.transitions.find((t) => t.name.toLowerCase() === targetStatus.toLowerCase() ||
        t.to.name.toLowerCase() === targetStatus.toLowerCase());
    if (!match) {
        const available = transitions.transitions.map((t) => t.to.name).join(", ");
        throw new Error(`No transition to "${targetStatus}" available. Available: ${available}`);
    }
    await jiraPost(`/issue/${issueKey}/transitions`, {
        transition: { id: match.id },
    });
}
/**
 * Add a comment to an issue.
 */
async function addComment(issueKey, body) {
    return jiraPost(`/issue/${issueKey}/comment`, { body });
}
/**
 * Get comments for an issue.
 */
async function getComments(issueKey) {
    return jiraGet(`/issue/${issueKey}/comment`);
}
/**
 * Link a Zendesk ticket ID to a JIRA issue via the configured custom field.
 */
async function linkZendeskTicket(issueKey, zendeskTicketId) {
    const ticketIdField = process.env.JIRA_TICKET_ID_FIELD;
    if (!ticketIdField) {
        throw new Error("JIRA_TICKET_ID_FIELD not configured — cannot link Zendesk ticket");
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
async function findIssuesByTicketId(zendeskTicketId) {
    const ticketIdField = process.env.JIRA_TICKET_ID_FIELD;
    if (!ticketIdField) {
        throw new Error("JIRA_TICKET_ID_FIELD not configured — cannot search by ticket ID");
    }
    const jql = `"${ticketIdField}" ~ "${zendeskTicketId}"`;
    return searchIssues(jql, { maxResults: 10 });
}
