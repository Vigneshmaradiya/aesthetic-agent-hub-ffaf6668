/**
 * Types for the MCP Registry — defines known MCP services and their
 * connection requirements (admin vs. agent authentication).
 */

/** Whether the MCP is pre-configured by an admin or connected per-agent. */
export type MCPCategory = "admin" | "agent";

/** Transport protocol used to communicate with the MCP server. */
export type MCPTransport = "stdio" | "http";

/** OAuth2 configuration for agent-authenticated MCPs. */
export interface MCPOAuthConfig {
  /** Full URL to the provider's OAuth authorization endpoint. */
  authorizationUrl: string;
  /** Full URL to the provider's OAuth token endpoint. */
  tokenUrl: string;
  /** Scopes requested during the OAuth flow. */
  scopes: string[];
  /** Env var name that holds the OAuth client ID (e.g., "JIRA_OAUTH_CLIENT_ID"). */
  envClientId: string;
  /** Env var name that holds the OAuth client secret. */
  envClientSecret: string;
}

/**
 * A single entry in the MCP Registry.
 *
 * Admin MCPs are automatically connected when their env vars are present.
 * Agent MCPs require per-user OAuth authentication through the UI.
 */
export interface MCPRegistryEntry {
  /** Unique service identifier, matches MCPServiceName (e.g., "zendesk", "jira"). */
  id: string;
  /** Human-readable name shown in the UI (e.g., "Zendesk", "JIRA"). */
  displayName: string;
  /** Short description of what this MCP provides. */
  description: string;
  /** Whether this MCP is admin-configured or agent-configured. */
  category: MCPCategory;
  /** Transport protocol. */
  transport: MCPTransport;
  /** Emoji or icon identifier for the UI. */
  icon: string;
  /**
   * For admin MCPs: env vars that must be set for the service to be available.
   * E.g., ["MCP_ZENDESK_URL"] for Zendesk.
   */
  requiredEnvVars?: string[];
  /**
   * For agent MCPs: env var pointing to the MCP server URL.
   * E.g., "MCP_JIRA_URL".
   */
  serverUrlEnvVar?: string;
  /** OAuth2 config for agent-authenticated MCPs. */
  oauth?: MCPOAuthConfig;
  /** Tool categories for UI grouping (e.g., ["Ticket Management"]). */
  toolCategories: string[];
}
