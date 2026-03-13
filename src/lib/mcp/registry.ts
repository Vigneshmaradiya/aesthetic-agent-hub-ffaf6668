import type { MCPRegistryEntry } from "@/types/mcp-registry";

/**
 * Static registry of all known MCP services.
 *
 * Admin MCPs auto-connect when their env vars are set.
 * Agent MCPs are connected per-user via OAuth through the UI.
 */
export const MCP_REGISTRY: MCPRegistryEntry[] = [
  // ── Admin-Configured MCPs ─────────────────────────────────────
  {
    id: "zendesk",
    displayName: "Zendesk",
    description:
      "Ticket management — create, read, update tickets and comments",
    category: "admin",
    transport: "http",
    icon: "🎫",
    requiredEnvVars: ["MCP_ZENDESK_URL"],
    toolCategories: ["Ticket Management"],
  },
  {
    id: "searchunify",
    displayName: "SearchUnify",
    description:
      "Knowledge base search — articles, docs, community posts, and analytics",
    category: "admin",
    transport: "http",
    icon: "🔍",
    requiredEnvVars: ["MCP_SEARCHUNIFY_URL", "SEARCHUNIFY_API_KEY"],
    toolCategories: ["Knowledge Base", "Search"],
  },
  {
    id: "logparser",
    displayName: "Log Parser",
    description:
      "In-process log analysis — parse raw logs into structured entries",
    category: "admin",
    transport: "stdio",
    icon: "📋",
    // No env vars needed — built-in
    requiredEnvVars: [],
    toolCategories: ["Diagnostics"],
  },
  {
    id: "jira-onprem",
    displayName: "JIRA On-Premise",
    description:
      "On-premise JIRA — search issues, create tickets, link Zendesk cases",
    category: "admin",
    transport: "http",
    icon: "📌",
    requiredEnvVars: ["MCP_JIRA_ONPREM_URL"],
    toolCategories: ["Issue Tracking", "Project Management"],
  },

  // ── Agent-Configured MCPs ─────────────────────────────────────
  {
    id: "jira",
    displayName: "JIRA",
    description:
      "Issue tracking — search issues, link tickets, view sprints and boards",
    category: "agent",
    transport: "http",
    icon: "📌",
    serverUrlEnvVar: "MCP_JIRA_URL",
    oauth: {
      authorizationUrl: "https://auth.atlassian.com/authorize",
      tokenUrl: "https://auth.atlassian.com/oauth/token",
      scopes: ["read:jira-work", "write:jira-work", "read:jira-user"],
      envClientId: "JIRA_OAUTH_CLIENT_ID",
      envClientSecret: "JIRA_OAUTH_CLIENT_SECRET",
    },
    toolCategories: ["Issue Tracking", "Project Management"],
  },
  {
    id: "elk",
    displayName: "ELK / Elasticsearch",
    description:
      "Log analytics — query Elasticsearch indices, search Kibana dashboards",
    category: "agent",
    transport: "http",
    icon: "📊",
    serverUrlEnvVar: "MCP_ELK_URL",
    oauth: {
      authorizationUrl: "", // Configured per-deployment via env
      tokenUrl: "",
      scopes: ["read"],
      envClientId: "ELK_OAUTH_CLIENT_ID",
      envClientSecret: "ELK_OAUTH_CLIENT_SECRET",
    },
    toolCategories: ["Log Analytics", "Monitoring"],
  },
  {
    id: "google-chat",
    displayName: "Google Chat",
    description:
      "Team messaging — send messages, create spaces, post incident updates",
    category: "agent",
    transport: "http",
    icon: "💬",
    serverUrlEnvVar: "MCP_GOOGLE_CHAT_URL",
    oauth: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/chat.messages",
        "https://www.googleapis.com/auth/chat.spaces.readonly",
      ],
      envClientId: "GOOGLE_CHAT_OAUTH_CLIENT_ID",
      envClientSecret: "GOOGLE_CHAT_OAUTH_CLIENT_SECRET",
    },
    toolCategories: ["Communication", "Collaboration"],
  },
];

// ── Lookup Helpers ──────────────────────────────────────────────

/** Find a registry entry by service ID. */
export function getMCPEntry(id: string): MCPRegistryEntry | undefined {
  return MCP_REGISTRY.find((entry) => entry.id === id);
}

/** Get all admin-configured MCPs. */
export function getAdminMCPs(): MCPRegistryEntry[] {
  return MCP_REGISTRY.filter((entry) => entry.category === "admin");
}

/** Get all agent-configured MCPs. */
export function getAgentMCPs(): MCPRegistryEntry[] {
  return MCP_REGISTRY.filter((entry) => entry.category === "agent");
}

/**
 * Check if an admin MCP has its required env vars set.
 * Always returns true for logparser (built-in).
 */
export function isAdminMCPConfigured(entry: MCPRegistryEntry): boolean {
  if (!entry.requiredEnvVars || entry.requiredEnvVars.length === 0) return true;
  return entry.requiredEnvVars.every((v) => !!process.env[v]);
}
