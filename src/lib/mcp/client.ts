import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { TokenBucketRateLimiter } from "./rate-limiter";
import { getMCPEntry } from "./registry";
import type { MCPServiceName, MCPToolCallResult } from "./types";

// ─── Timeouts ─────────────────────────────────────────────────
// Connection timeout: how long to wait for client.connect() before giving up.
const CONNECT_TIMEOUT_MS = 8_000;
// Tool-call timeout: how long to wait for a single MCP tool call.
const TOOL_CALL_TIMEOUT_MS = Number(process.env.MCP_TOOL_TIMEOUT_MS) || 30_000;
// Cooldown after a connection failure before retrying.
const FAILED_SERVICE_COOLDOWN_MS = 5 * 60 * 1000; // 5 min (survives dev hot-reloads)

// ─── Hot-reload-safe State ─────────────────────────────────────
// Module-level Maps reset on every Next.js hot reload in development.
// Storing them on globalThis lets them survive HMR so the cooldown
// actually prevents repeated ECONNREFUSED spam across reloads.
interface MCPState {
  sharedClients: Map<string, Client>;
  oauthClients: Map<string, { client: Client; createdAt: number }>;
  failedServices: Map<string, number>;
  connectingServices: Map<string, Promise<Client | null>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __nexusMCPState: MCPState | undefined;
}

if (!globalThis.__nexusMCPState) {
  globalThis.__nexusMCPState = {
    sharedClients: new Map(),
    oauthClients: new Map(),
    failedServices: new Map(),
    connectingServices: new Map(),
  };
}

const {
  sharedClients,
  oauthClients,
  failedServices,
  connectingServices,
} = globalThis.__nexusMCPState;

function isServiceInCooldown(service: string): boolean {
  const failedAt = failedServices.get(service);
  if (!failedAt) return false;
  if (Date.now() - failedAt > FAILED_SERVICE_COOLDOWN_MS) {
    failedServices.delete(service);
    return false;
  }
  return true;
}

// Clean up OAuth clients older than 5 minutes
const OAUTH_CLIENT_TTL_MS = 5 * 60 * 1000;
function cleanupOAuthClients() {
  const now = Date.now();
  for (const [key, { createdAt }] of oauthClients) {
    if (now - createdAt > OAUTH_CLIENT_TTL_MS) {
      oauthClients.delete(key);
    }
  }
}

// Rate limiter: 60 RPM default, configurable via env
const rateLimiter = new TokenBucketRateLimiter(
  Number(process.env.MCP_RATE_LIMIT_RPM) || 60,
);

/** Race a promise against a timeout. Rejects with an Error if the timeout fires first. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Resolve the MCP server URL for a service.
 *
 * Checks well-known env vars first (MCP_ZENDESK_URL, MCP_SEARCHUNIFY_URL),
 * then falls back to the registry's serverUrlEnvVar for agent MCPs,
 * and finally tries the generic MCP_{SERVICE}_URL pattern.
 */
function getServiceUrl(service: MCPServiceName): string | undefined {
  // Well-known admin MCP env vars
  const wellKnown: Record<string, string | undefined> = {
    zendesk: process.env.MCP_ZENDESK_URL,
    searchunify: process.env.MCP_SEARCHUNIFY_URL,
    logparser: undefined, // In-process, no external URL
    "jira-onprem": process.env.MCP_JIRA_ONPREM_URL,
  };

  if (service in wellKnown) return wellKnown[service];

  // Check registry entry for serverUrlEnvVar
  const entry = getMCPEntry(service);
  if (entry?.serverUrlEnvVar) {
    return process.env[entry.serverUrlEnvVar];
  }

  // Generic pattern: MCP_{SERVICE}_URL (uppercase, hyphens → underscores)
  const envKey = `MCP_${service.toUpperCase().replace(/-/g, "_")}_URL`;
  return process.env[envKey];
}

// ─── Service-Specific Headers ─────────────────────────────────

/**
 * Returns additional HTTP headers required for a specific MCP service.
 * Used for services that authenticate via custom headers rather than OAuth.
 */
function getServiceHeaders(service: MCPServiceName): Record<string, string> {
  if (service === "searchunify") {
    const headers: Record<string, string> = {};
    if (process.env.SEARCHUNIFY_INSTANCE)
      headers["searchunify-instance"] = process.env.SEARCHUNIFY_INSTANCE;
    if (process.env.SEARCHUNIFY_API_KEY) {
      headers["searchunify-auth-type"] = "apiKey";
      headers["searchunify-api-key"] = process.env.SEARCHUNIFY_API_KEY;
    }
    if (process.env.SEARCHUNIFY_UID)
      headers["searchunify-uid"] = process.env.SEARCHUNIFY_UID;
    if (process.env.SEARCHUNIFY_TIMEOUT)
      headers["searchunify-timeout"] = process.env.SEARCHUNIFY_TIMEOUT;
    return headers;
  }
  return {};
}

// ─── Client Constructors ──────────────────────────────────────

/**
 * Get a shared (non-authenticated) MCP client for a service.
 * Used for SearchUnify, LogParser, and Zendesk in api_token mode.
 */
export async function getMCPClient(
  service: MCPServiceName,
): Promise<Client | null> {
  const url = getServiceUrl(service);
  if (!url) return null;

  // Already connected — fast path
  if (sharedClients.has(service)) return sharedClients.get(service)!;

  // In cooldown after a recent failure — skip immediately
  if (isServiceInCooldown(service)) return null;

  // Deduplicate concurrent connection attempts: if another caller is already
  // connecting to this service, await that same Promise instead of opening a
  // second TCP connection (which would also log another ECONNREFUSED error).
  const inFlight = connectingServices.get(service);
  if (inFlight) return inFlight;

  const attempt = (async (): Promise<Client | null> => {
    try {
      const serviceHeaders = getServiceHeaders(service);
      const transport = new StreamableHTTPClientTransport(new URL(url),
        Object.keys(serviceHeaders).length > 0
          ? { requestInit: { headers: serviceHeaders } }
          : undefined,
      );
      const client = new Client({ name: "nexus-hud", version: "1.0.0" });
      await withTimeout(
        client.connect(transport),
        CONNECT_TIMEOUT_MS,
        `connect:${service}`,
      );
      sharedClients.set(service, client);
      return client;
    } catch (error) {
      console.error(`Failed to connect to MCP service: ${service}`, error);
      failedServices.set(service, Date.now()); // start cooldown
      return null;
    } finally {
      connectingServices.delete(service);
    }
  })();

  connectingServices.set(service, attempt);
  return attempt;
}

/**
 * Get an authenticated MCP client that passes the user's OAuth
 * access token as a Bearer header. Works for any MCP service that
 * requires per-user authentication (Zendesk OAuth, agent-configured MCPs).
 *
 * Note: We do NOT cache OAuth clients because StreamableHTTPClientTransport
 * only injects requestInit headers on the initial `initialize` handshake,
 * not on subsequent tool calls. Re-connecting each time ensures the Bearer
 * token is always sent with every request.
 */
export async function getAuthenticatedMCPClient(
  service: MCPServiceName,
  accessToken: string,
): Promise<Client | null> {
  const url = getServiceUrl(service);
  if (!url) return null;

  try {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const client = new Client({
      name: "nexus-hud",
      version: "1.0.0",
    });

    await withTimeout(
      client.connect(transport),
      CONNECT_TIMEOUT_MS,
      `connect-oauth:${service}`,
    );

    // Periodic cleanup of stale cache entries
    cleanupOAuthClients();

    return client;
  } catch (error) {
    console.error(
      `Failed to connect to MCP service with OAuth: ${service}`,
      error,
    );
    return null;
  }
}

// ─── Tool Execution ───────────────────────────────────────────

/**
 * Call an MCP tool, optionally with user OAuth authentication.
 *
 * Auth behavior:
 * - When an accessToken is provided for any service, uses an authenticated
 *   client that forwards the token as a Bearer header.
 * - Falls back to the shared client when no token is available
 *   (suitable for admin MCPs with server-side credentials).
 */
export async function callMCPTool(
  service: MCPServiceName,
  toolName: string,
  args: Record<string, unknown>,
  accessToken?: string,
): Promise<MCPToolCallResult> {
  // Rate limit
  await rateLimiter.acquire(service);

  // Determine which client to use
  let client: Client | null;

  if (accessToken) {
    // Per-user authenticated client — forwards OAuth token as Bearer header
    client = await getAuthenticatedMCPClient(service, accessToken);
  } else {
    // Shared client (no OAuth token, or admin MCP with server-side auth)
    client = await getMCPClient(service);
  }

  if (!client) {
    return { error: `Service ${service} is unavailable`, degraded: true };
  }

  try {
    const result = await withTimeout(
      client.callTool({ name: toolName, arguments: args }),
      TOOL_CALL_TIMEOUT_MS,
      `${service}.${toolName}`,
    );
    return result as MCPToolCallResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`MCP tool call failed: ${service}.${toolName}`, error);
    return { error: `Tool call failed: ${message}`, degraded: true };
  }
}

// ─── Health Check ─────────────────────────────────────────────

export async function checkMCPHealth(service: MCPServiceName): Promise<{
  service: string;
  status: "healthy" | "unhealthy";
  error?: string;
}> {
  try {
    const client = await getMCPClient(service);
    if (!client) {
      return {
        service,
        status: "unhealthy",
        error: "Not configured or unreachable",
      };
    }
    // List tools to verify connection works
    await client.listTools();
    return { service, status: "healthy" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { service, status: "unhealthy", error: message };
  }
}

export { rateLimiter };
