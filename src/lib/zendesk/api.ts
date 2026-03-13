/**
 * Zendesk REST API client — used internally by the custom Zendesk
 * MCP server to implement all Zendesk tools via MCP protocol.
 *
 * Auth modes:
 *  - OAuth: Uses per-user access token (Bearer header)
 *  - API Token: Uses shared ZENDESK_EMAIL + ZENDESK_API_TOKEN (Basic auth)
 */

// ─── Types ──────────────────────────────────────────────────────

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string | null;
  requester_id: number;
  assignee_id: number | null;
  group_id: number | null;
  organization_id: number | null;
  tags: string[];
  custom_fields: Array<{ id: number; value: unknown }>;
  created_at: string;
  updated_at: string;
  type: string | null;
  via: { channel: string; source?: Record<string, unknown> };
}

export interface ZendeskComment {
  id: number;
  type: string;
  body: string;
  html_body?: string;
  plain_body?: string;
  public: boolean;
  author_id: number;
  created_at: string;
  attachments?: ZendeskAttachment[];
  via?: { channel: string; source?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
}

export interface ZendeskAttachment {
  id: number;
  file_name: string;
  content_type: string;
  size: number;
  url: string;
}

export interface ZendeskUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organization_id?: number | null;
}

export interface ZendeskOrganization {
  id: number;
  name: string;
}

export interface ZendeskTicketResponse {
  ticket: ZendeskTicket;
  users?: ZendeskUser[];
}

export interface ZendeskTicketsResponse {
  tickets: ZendeskTicket[];
  count?: number;
  next_page?: string | null;
  previous_page?: string | null;
}

export interface ZendeskSearchResponse {
  results: ZendeskTicket[];
  count: number;
  next_page?: string | null;
  previous_page?: string | null;
}

export interface ZendeskCommentsResponse {
  comments: ZendeskComment[];
  users?: ZendeskUser[];
  count?: number;
  next_page?: string | null;
  previous_page?: string | null;
}

// ─── API Client ─────────────────────────────────────────────────

/**
 * Build the Zendesk base URL from environment variables.
 * Prefers ZENDESK_BASE_URL, falls back to constructing from ZENDESK_SUBDOMAIN.
 */
export function getBaseUrl(): string {
  const explicit = process.env.ZENDESK_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  if (!subdomain) {
    throw new Error(
      "Zendesk not configured: set ZENDESK_BASE_URL or ZENDESK_SUBDOMAIN",
    );
  }
  return `https://${subdomain}.zendesk.com`;
}

/**
 * Build authorization headers for Zendesk API calls.
 *
 * @param accessToken — OAuth token from user session (optional)
 */
export function buildAuthHeaders(accessToken?: string): Record<string, string> {
  // OAuth mode: use per-user Bearer token
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  // API token mode: use email/token basic auth
  const email = process.env.ZENDESK_EMAIL;
  const apiToken = process.env.ZENDESK_API_TOKEN;

  if (email && apiToken) {
    const credentials = Buffer.from(`${email}/token:${apiToken}`).toString(
      "base64",
    );
    return { Authorization: `Basic ${credentials}` };
  }

  throw new Error(
    "Zendesk auth not configured: provide OAuth token or set ZENDESK_EMAIL + ZENDESK_API_TOKEN",
  );
}

const DEFAULT_TIMEOUT_MS = 30_000;

function getTimeout(): number {
  return Number(process.env.MCP_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
}

/**
 * Make an authenticated GET request to the Zendesk REST API.
 */
export async function zendeskGet<T>(
  path: string,
  accessToken?: string,
): Promise<T> {
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
    throw new Error(
      `Zendesk API ${response.status}: ${response.statusText} — ${body.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make an authenticated POST request to the Zendesk REST API.
 */
export async function zendeskPost<T>(
  path: string,
  data: unknown,
  accessToken?: string,
): Promise<T> {
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
    throw new Error(
      `Zendesk API ${response.status}: ${response.statusText} — ${body.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make an authenticated PUT request to the Zendesk REST API.
 */
export async function zendeskPut<T>(
  path: string,
  data: unknown,
  accessToken?: string,
): Promise<T> {
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
    throw new Error(
      `Zendesk API ${response.status}: ${response.statusText} — ${body.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── Tickets ────────────────────────────────────────────────────

/**
 * List tickets. Supports optional status filter and pagination.
 *
 * Zendesk API: GET /api/v2/tickets
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#list-tickets
 */
export async function getTickets(
  params?: { status?: string; page?: number; per_page?: number },
  accessToken?: string,
): Promise<ZendeskTicketsResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));

  const qs = query.toString();
  const path = `/tickets.json${qs ? `?${qs}` : ""}`;
  return zendeskGet<ZendeskTicketsResponse>(path, accessToken);
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
export async function getMyTickets(
  userId: string,
  params?: {
    status?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    page?: number;
    per_page?: number;
  },
  accessToken?: string,
): Promise<ZendeskTicketsResponse> {
  const query = new URLSearchParams();
  if (params?.sort_by) query.set("sort_by", params.sort_by);
  if (params?.sort_order) query.set("sort_order", params.sort_order);
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));

  const qs = query.toString();
  const path = `/users/${userId}/tickets/assigned.json${qs ? `?${qs}` : ""}`;
  const result = await zendeskGet<ZendeskTicketsResponse>(path, accessToken);

  // Client-side status filter (the endpoint doesn't support it natively)
  if (params?.status) {
    const statusFilter = params.status.toLowerCase();
    result.tickets = result.tickets.filter(
      (t) => t.status.toLowerCase() === statusFilter,
    );
  }

  return result;
}

/**
 * Get a single ticket by ID with requester info side-loaded.
 *
 * Zendesk API: GET /api/v2/tickets/{id}
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#show-ticket
 */
export async function getTicket(
  ticketId: string,
  accessToken?: string,
): Promise<ZendeskTicketResponse> {
  return zendeskGet<ZendeskTicketResponse>(
    `/tickets/${ticketId}.json?include=users`,
    accessToken,
  );
}

/**
 * Search tickets using Zendesk query syntax.
 *
 * Zendesk API: GET /api/v2/search
 * Docs: https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/
 */
export async function searchTickets(
  query: string,
  params?: { page?: number; per_page?: number; sort_by?: string },
  accessToken?: string,
): Promise<ZendeskSearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("query", `type:ticket ${query}`);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);

  return zendeskGet<ZendeskSearchResponse>(
    `/search.json?${searchParams.toString()}`,
    accessToken,
  );
}

/**
 * Create a new ticket.
 *
 * Zendesk API: POST /api/v2/tickets
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
 */
export async function createTicket(
  data: {
    subject: string;
    description: string;
    priority?: string;
    status?: string;
    tags?: string[];
    requester?: { name?: string; email?: string };
    assignee_id?: number;
    group_id?: number;
    custom_fields?: Array<{ id: number; value: unknown }>;
  },
  accessToken?: string,
): Promise<ZendeskTicketResponse> {
  return zendeskPost<ZendeskTicketResponse>(
    "/tickets.json",
    {
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
    },
    accessToken,
  );
}

/**
 * Update an existing ticket (status, priority, tags, assignee, etc.).
 *
 * Zendesk API: PUT /api/v2/tickets/{id}
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#update-ticket
 */
export async function updateTicket(
  ticketId: string,
  data: {
    subject?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    assignee_id?: number | null;
    group_id?: number | null;
    custom_fields?: Array<{ id: number; value: unknown }>;
  },
  accessToken?: string,
): Promise<ZendeskTicketResponse> {
  return zendeskPut<ZendeskTicketResponse>(
    `/tickets/${ticketId}.json`,
    { ticket: data },
    accessToken,
  );
}

/**
 * Add a comment to a ticket (public reply or internal note).
 *
 * Zendesk API: PUT /api/v2/tickets/{id}  (with comment in body)
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/ticket_comments/
 */
export async function createTicketComment(
  ticketId: string,
  comment: {
    body: string;
    public?: boolean;
    author_id?: number;
  },
  accessToken?: string,
): Promise<ZendeskTicketResponse> {
  return zendeskPut<ZendeskTicketResponse>(
    `/tickets/${ticketId}.json`,
    {
      ticket: {
        comment: {
          body: comment.body,
          public: comment.public ?? true,
          author_id: comment.author_id,
        },
      },
    },
    accessToken,
  );
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
export async function getTicketComments(
  ticketId: string,
  accessToken?: string,
): Promise<{
  comments: Array<
    ZendeskComment & { author_name?: string; author_role?: string }
  >;
}> {
  const data = await zendeskGet<ZendeskCommentsResponse>(
    `/tickets/${ticketId}/comments.json?include=users&sort_order=desc`,
    accessToken,
  );

  // Build user lookup from side-loaded users
  const userMap = new Map<number, ZendeskUser>();
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

// ─── Users ───────────────────────────────────────────────────────

export interface ZendeskUsersResponse {
  users: ZendeskUser[];
  count?: number;
  next_page?: string | null;
}

/**
 * Batch-fetch users by ID. Zendesk supports up to 100 IDs per call.
 *
 * Zendesk API: GET /api/v2/users/show_many.json?ids=1,2,3
 * Docs: https://developer.zendesk.com/api-reference/ticketing/users/users/#show-many-users
 */
export async function getUsers(
  userIds: number[],
  accessToken?: string,
): Promise<ZendeskUsersResponse> {
  if (userIds.length === 0) return { users: [] };

  const uniqueIds = [...new Set(userIds)].slice(0, 100);
  return zendeskGet<ZendeskUsersResponse>(
    `/users/show_many.json?ids=${uniqueIds.join(",")}`,
    accessToken,
  );
}

// ─── Organizations ───────────────────────────────────────────────

export interface ZendeskOrganizationsResponse {
  organizations: ZendeskOrganization[];
  count?: number;
  next_page?: string | null;
}

/**
 * Batch-fetch organizations by ID. Zendesk supports up to 100 IDs per call.
 *
 * Zendesk API: GET /api/v2/organizations/show_many.json?ids=1,2,3
 * Docs: https://developer.zendesk.com/api-reference/ticketing/organizations/organizations/#show-many-organizations
 */
export async function getOrganizations(
  orgIds: number[],
  accessToken?: string,
): Promise<ZendeskOrganizationsResponse> {
  if (orgIds.length === 0) return { organizations: [] };

  const uniqueIds = [...new Set(orgIds)].slice(0, 100);
  return zendeskGet<ZendeskOrganizationsResponse>(
    `/organizations/show_many.json?ids=${uniqueIds.join(",")}`,
    accessToken,
  );
}
