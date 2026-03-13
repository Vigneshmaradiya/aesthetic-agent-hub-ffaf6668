import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Auth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  ZENDESK_SUBDOMAIN: z.string().min(1).optional(),
  ZENDESK_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  ZENDESK_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),

  // Zendesk Auth Mode: "oauth" (default) or "api_token"
  // oauth:     Uses logged-in user's OAuth token for per-user Zendesk API access
  // api_token: Uses ZENDESK_EMAIL + ZENDESK_API_TOKEN for shared service account access
  ZENDESK_AUTH_MODE: z.enum(["oauth", "api_token"]).default("oauth"),
  ZENDESK_EMAIL: z.string().email().optional(),
  ZENDESK_API_TOKEN: z.string().min(1).optional(),

  // MCP Server URLs — Admin MCPs
  MCP_ZENDESK_URL: z.string().url().optional(),
  MCP_SEARCHUNIFY_URL: z.string().url().optional(),

  // JIRA On-Premise (admin-configured, MCP server handles Basic Auth internally)
  MCP_JIRA_ONPREM_URL: z.string().url().optional(),
  JIRA_ONPREM_BASE_URL: z.string().url().optional(),

  // MCP Server URLs — Agent MCPs (optional, only if deployed)
  MCP_JIRA_URL: z.string().url().optional(),
  MCP_ELK_URL: z.string().url().optional(),
  MCP_GOOGLE_CHAT_URL: z.string().url().optional(),

  // Agent MCP OAuth Credentials (optional — set by admin to enable agent auth)
  JIRA_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  JIRA_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  ELK_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  ELK_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CHAT_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CHAT_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),

  // LLM Provider API Keys (at least one needed for LLM features)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GOOGLE_AI_API_KEY: z.string().min(1).optional(),

  // LLM Defaults
  LLM_DEFAULT_PROVIDER: z.enum(["anthropic", "openai", "google"]).optional(),
  LLM_DEFAULT_MODEL: z.string().min(1).optional(),

  // LLM Limits
  LLM_MAX_ITERATIONS: z.coerce.number().default(10),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().default(120000),

  // App Config
  MCP_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  MCP_RATE_LIMIT_RPM: z.coerce.number().default(60),
  SESSION_TTL_MINUTES: z.coerce.number().default(480),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "Environment validation failed:",
      result.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = validateEnv();
