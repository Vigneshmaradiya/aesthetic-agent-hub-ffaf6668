"use strict";
/**
 * Zendesk REST API client — used internally by the custom Zendesk
 * MCP server to implement all Zendesk tools via MCP protocol.
 *
 * Auth modes:
 *  - OAuth: Uses per-user access token (Bearer header)
 *  - API Token: Uses shared ZENDESK_EMAIL + ZENDESK_API_TOKEN (Basic auth)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseUrl = getBaseUrl;
exports.buildAuthHeaders = buildAuthHeaders;
exports.zendeskGet = zendeskGet;
exports.zendeskPost = zendeskPost;
exports.zendeskPut = zendeskPut;
exports.getTickets = getTickets;
exports.getMyTickets = getMyTickets;
exports.getTicket = getTicket;
exports.searchTickets = searchTickets;
exports.createTicket = createTicket;
exports.updateTicket = updateTicket;
exports.createTicketComment = createTicketComment;
exports.getTicketComments = getTicketComments;
exports.getUsers = getUsers;
exports.getOrganizations = getOrganizations;
// ─── API Client ─────────────────────────────────────────────────
/**
 * Build the Zendesk base URL from environment variables.
 * Prefers ZENDESK_BASE_URL, falls back to constructing from ZENDESK_SUBDOMAIN.
 */
function getBaseUrl() {
    const explicit = process.env.ZENDESK_BASE_URL;
    if (explicit)
        return explicit.replace(/\/+$/, "");
    const subdomain = process.env.ZENDESK_SUBDOMAIN;
    if (!subdomain) {
        throw new Error("Zendesk not configured: set ZENDESK_BASE_URL or ZENDESK_SUBDOMAIN");
    }
    return `https://${subdomain}.zendesk.com`;
}
/**
 * Build authorization headers for Zendesk API calls.
 *
 * @param accessToken — OAuth token from user session (optional)
 */
function buildAuthHeaders(accessToken) {
    // OAuth mode: use per-user Bearer token
    if (accessToken) {
        return { Authorization: `Bearer ${accessToken}` };
    }
    // API token mode: use email/token basic auth
    const email = process.env.ZENDESK_EMAIL;
    const apiToken = process.env.ZENDESK_API_TOKEN;
    if (email && apiToken) {
        const credentials = Buffer.from(`${email}/token:${apiToken}`).toString("base64");
        return { Authorization: `Basic ${credentials}` };
    }
    throw new Error("Zendesk auth not configured: provide OAuth token or set ZENDESK_EMAIL + ZENDESK_API_TOKEN");
}
const DEFAULT_TIMEOUT_MS = 30_000;
function getTimeout() {
    return Number(process.env.MCP_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
}
/**
 * Make an authenticated GET request to the Zendesk REST API.
 */
async function zendeskGet(path, accessToken) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/v2${path}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            ...buildAuthHeaders(accessToken),
            Accept: "application/json",
        },
        signal: AbortSignal.timeout(getTimeout()),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Zendesk API ${response.status}: ${response.statusText} — ${body.slice(0, 200)}`);
    }
    return response.json();
}
/**
 * Make an authenticated POST request to the Zendesk REST API.
 */
async function zendeskPost(path, data, accessToken) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/v2${path}`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            ...buildAuthHeaders(accessToken),
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(getTimeout()),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Zendesk API ${response.status}: ${response.statusText} — ${body.slice(0, 200)}`);
    }
    return response.json();
}
/**
 * Make an authenticated PUT request to the Zendesk REST API.
 */
async function zendeskPut(path, data, accessToken) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/v2${path}`;
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            ...buildAuthHeaders(accessToken),
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(getTimeout()),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Zendesk API ${response.status}: ${response.statusText} — ${body.slice(0, 200)}`);
    }
    return response.json();
}
// ─── Tickets ────────────────────────────────────────────────────
/**
 * List tickets. Supports optional status filter and pagination.
 *
 * Zendesk API: GET /api/v2/tickets
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#list-tickets
 */
async function getTickets(params, accessToken) {
    const query = new URLSearchParams();
    if (params?.status)
        query.set("status", params.status);
    if (params?.page)
        query.set("page", String(params.page));
    if (params?.per_page)
        query.set("per_page", String(params.per_page));
    const qs = query.toString();
    const path = `/tickets.json${qs ? `?${qs}` : ""}`;
    return zendeskGet(path, accessToken);
}
/**
 * List tickets assigned to a specific user.
 *
 * Zendesk API: GET /api/v2/users/{user_id}/tickets/assigned
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#list-tickets
 *
 * This is significantly faster than search for "my tickets" queries because
 * it hits a direct endpoint instead of the search API.
 */
async function getMyTickets(userId, params, accessToken) {
    const query = new URLSearchParams();
    if (params?.sort_by)
        query.set("sort_by", params.sort_by);
    if (params?.sort_order)
        query.set("sort_order", params.sort_order);
    if (params?.page)
        query.set("page", String(params.page));
    if (params?.per_page)
        query.set("per_page", String(params.per_page));
    const qs = query.toString();
    const path = `/users/${userId}/tickets/assigned.json${qs ? `?${qs}` : ""}`;
    const result = await zendeskGet(path, accessToken);
    // Client-side status filter (the endpoint doesn't support it natively)
    if (params?.status) {
        const statusFilter = params.status.toLowerCase();
        result.tickets = result.tickets.filter((t) => t.status.toLowerCase() === statusFilter);
    }
    return result;
}
/**
 * Get a single ticket by ID with requester info side-loaded.
 *
 * Zendesk API: GET /api/v2/tickets/{id}
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#show-ticket
 */
async function getTicket(ticketId, accessToken) {
    return zendeskGet(`/tickets/${ticketId}.json?include=users`, accessToken);
}
/**
 * Search tickets using Zendesk query syntax.
 *
 * Zendesk API: GET /api/v2/search
 * Docs: https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/
 */
async function searchTickets(query, params, accessToken) {
    const searchParams = new URLSearchParams();
    searchParams.set("query", `type:ticket ${query}`);
    if (params?.page)
        searchParams.set("page", String(params.page));
    if (params?.per_page)
        searchParams.set("per_page", String(params.per_page));
    if (params?.sort_by)
        searchParams.set("sort_by", params.sort_by);
    return zendeskGet(`/search.json?${searchParams.toString()}`, accessToken);
}
/**
 * Create a new ticket.
 *
 * Zendesk API: POST /api/v2/tickets
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
 */
async function createTicket(data, accessToken) {
    return zendeskPost("/tickets.json", {
        ticket: {
            subject: data.subject,
            comment: { body: data.description },
            priority: data.priority,
            status: data.status ?? "new",
            tags: data.tags,
            requester: data.requester,
            assignee_id: data.assignee_id,
            group_id: data.group_id,
            custom_fields: data.custom_fields,
        },
    }, accessToken);
}
/**
 * Update an existing ticket (status, priority, tags, assignee, etc.).
 *
 * Zendesk API: PUT /api/v2/tickets/{id}
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#update-ticket
 */
async function updateTicket(ticketId, data, accessToken) {
    return zendeskPut(`/tickets/${ticketId}.json`, { ticket: data }, accessToken);
}
/**
 * Add a comment to a ticket (public reply or internal note).
 *
 * Zendesk API: PUT /api/v2/tickets/{id}  (with comment in body)
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/
 */
async function createTicketComment(ticketId, comment, accessToken) {
    return zendeskPut(`/tickets/${ticketId}.json`, {
        ticket: {
            comment: {
                body: comment.body,
                public: comment.public ?? true,
                author_id: comment.author_id,
            },
        },
    }, accessToken);
}
// ─── Ticket Comments ────────────────────────────────────────────
/**
 * Fetch all comments for a ticket, with author info side-loaded.
 *
 * Zendesk API: GET /api/v2/tickets/{ticket_id}/comments
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/
 *
 * Returns comments enriched with author names (resolved from side-loaded users).
 */
async function getTicketComments(ticketId, accessToken) {
    const data = await zendeskGet(`/tickets/${ticketId}/comments.json?include=users&sort_order=desc`, accessToken);
    // Build user lookup from side-loaded users
    const userMap = new Map();
    if (data.users) {
        for (const user of data.users) {
            userMap.set(user.id, user);
        }
    }
    // Enrich comments with author info
    const enrichedComments = (data.comments ?? []).map((comment) => {
        const author = userMap.get(comment.author_id);
        return {
            ...comment,
            author_name: author?.name ?? `User ${comment.author_id}`,
            author_role: author?.role ?? "unknown",
        };
    });
    return { comments: enrichedComments };
}
/**
 * Batch-fetch users by ID. Zendesk supports up to 100 IDs per call.
 *
 * Zendesk API: GET /api/v2/users/show_many.json?ids=1,2,3
 * Docs: https://developer.zendesk.com/api-reference/ticketing/users/users/#show-many-users
 */
async function getUsers(userIds, accessToken) {
    if (userIds.length === 0)
        return { users: [] };
    const uniqueIds = [...new Set(userIds)].slice(0, 100);
    return zendeskGet(`/users/show_many.json?ids=${uniqueIds.join(",")}`, accessToken);
}
/**
 * Batch-fetch organizations by ID. Zendesk supports up to 100 IDs per call.
 *
 * Zendesk API: GET /api/v2/organizations/show_many.json?ids=1,2,3
 * Docs: https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#show-many-organizations
 */
async function getOrganizations(orgIds, accessToken) {
    if (orgIds.length === 0)
        return { organizations: [] };
    const uniqueIds = [...new Set(orgIds)].slice(0, 100);
    return zendeskGet(`/organizations/show_many.json?ids=${uniqueIds.join(",")}`, accessToken);
}
