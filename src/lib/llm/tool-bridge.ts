import {
  getMCPClient,
  callMCPTool,
  getAuthenticatedMCPClient,
} from "@/lib/mcp/client";
import type { MCPServiceName, MCPToolCallResult } from "@/lib/mcp/types";
import type {
  ToolDefinition,
  ToolCallRequest,
  ToolResultMessage,
} from "./types";

/** Default admin services that are always attempted during discovery. */
const DEFAULT_ADMIN_SERVICES: MCPServiceName[] = [
  "zendesk",
  "searchunify",
  "jira-onprem",
];

/**
 * Qualify a tool name with its service prefix: "zendesk__get_tickets".
 * This prevents tool name collisions across services.
 */
export function qualifyToolName(service: MCPServiceName, tool: string): string {
  return `${service}__${tool}`;
}

/**
 * Parse a qualified tool name back into service + tool.
 * Returns null if the format is invalid.
 *
 * Accepts any service name (not just hardcoded ones) to support
 * dynamically registered agent MCPs.
 */
export function parseQualifiedName(
  qualified: string,
): { service: MCPServiceName; tool: string } | null {
  const sep = qualified.indexOf("__");
  if (sep === -1) return null;
  const service = qualified.slice(0, sep);
  const tool = qualified.slice(sep + 2);
  if (!service || !tool) return null;
  return { service: service as MCPServiceName, tool };
}

/**
 * Discover tools from a single MCP service client.
 * Extracts schema and converts to LLM-compatible ToolDefinition[].
 */
async function discoverServiceTools(
  service: MCPServiceName,
  client: {
    listTools: () => Promise<{
      tools: Array<{
        name: string;
        description?: string;
        inputSchema?: unknown;
      }>;
    }>;
  },
): Promise<ToolDefinition[]> {
  const tools: ToolDefinition[] = [];
  const { tools: mcpTools } = await client.listTools();

  for (const mcpTool of mcpTools) {
    const inputSchema = mcpTool.inputSchema as
      | {
          type: "object";
          properties?: Record<
            string,
            { type: string; description?: string; enum?: string[] }
          >;
          required?: string[];
        }
      | undefined;

    const properties: Record<
      string,
      { type: string; description: string; enum?: string[] }
    > = {};

    if (inputSchema?.properties) {
      for (const [key, prop] of Object.entries(inputSchema.properties)) {
        properties[key] = {
          type: prop.type ?? "string",
          description: prop.description ?? key,
          ...(prop.enum ? { enum: prop.enum } : {}),
        };
      }
    }

    tools.push({
      name: qualifyToolName(service, mcpTool.name),
      description: `[${service}] ${mcpTool.description ?? mcpTool.name}`,
      parameters: {
        type: "object",
        properties,
        required: inputSchema?.required,
      },
    });
  }

  return tools;
}

/**
 * Discover all available tools from connected MCP services.
 * Converts MCP tool schemas into LLM-compatible ToolDefinition[].
 *
 * @param connectedServices — Explicit list of connected service IDs.
 *   If provided, only these services (plus logparser) are queried.
 *   If not provided, falls back to default admin services.
 * @param credentialsMap — Per-service access tokens for authenticated
 *   client creation. Used for agent-configured MCPs.
 */
export async function discoverTools(
  connectedServices?: MCPServiceName[],
  credentialsMap?: Record<string, string>,
): Promise<ToolDefinition[]> {
  const services = connectedServices ?? DEFAULT_ADMIN_SERVICES;
  const tools: ToolDefinition[] = [];

  for (const service of services) {
    if (service === "logparser") continue; // Handled separately below

    try {
      // Use authenticated client if we have credentials for this service
      const token = credentialsMap?.[service];
      const client = token
        ? await getAuthenticatedMCPClient(service, token)
        : await getMCPClient(service);

      if (!client) continue;

      const serviceTools = await discoverServiceTools(service, client);
      tools.push(...serviceTools);
    } catch (error) {
      console.warn(
        `[tool-bridge] Failed to discover tools for ${service}:`,
        error instanceof Error ? error.message : error,
      );
      // Continue with other services — graceful degradation
    }
  }

  // ── LogParser tools (in-process, no MCP client) ──────────────
  tools.push({
    name: qualifyToolName("logparser", "parse"),
    description:
      "[logparser] Parse a log file and return structured entries with timestamp, level, source, and message. Supports standard, syslog, and JSON formats.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Raw log file content to parse",
        },
        format: {
          type: "string",
          description:
            "Log format hint: standard, syslog, or json. Auto-detected if omitted.",
          enum: ["standard", "syslog", "json"],
        },
        fileName: {
          type: "string",
          description: "Name of the log file (used for format detection)",
        },
      },
      required: ["content"],
    },
  });

  return tools;
}

/**
 * Execute a tool call from the LLM by routing it to the correct MCP service
 * or in-process handler.
 *
 * @param credentialsMap — Per-service access tokens. The function looks up
 *   the service from the qualified tool name and passes the matching token
 *   to the MCP client for per-user authenticated calls.
 *
 *   For backward compatibility, a bare `accessToken` string is also accepted
 *   and used as the Zendesk token.
 */
export async function executeTool(
  toolCall: ToolCallRequest,
  credentialsMap?: Record<string, string>,
): Promise<ToolResultMessage> {
  const parsed = parseQualifiedName(toolCall.name);
  if (!parsed) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
      isError: true,
    };
  }

  const { service, tool } = parsed;

  // ── LogParser: in-process ────────────────────────────────────
  if (service === "logparser" && tool === "parse") {
    try {
      const { parseLogFile } = await import("@/lib/log-parser/parser");
      const result = parseLogFile(
        toolCall.arguments.content as string,
        toolCall.arguments.format as "standard" | "syslog" | "json" | undefined,
        toolCall.arguments.fileName as string | undefined,
      );
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        content: JSON.stringify(result),
      };
    } catch (err) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        content: JSON.stringify({
          error: err instanceof Error ? err.message : "Log parse error",
        }),
        isError: true,
      };
    }
  }

  // ── MCP service call ─────────────────────────────────────────
  // Look up the access token for this service from the credentials map
  const accessToken = credentialsMap?.[service];

  const result: MCPToolCallResult = await callMCPTool(
    service,
    tool,
    toolCall.arguments,
    accessToken,
  );

  if (result.error) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      content: JSON.stringify({
        error: result.error,
        degraded: result.degraded,
      }),
      isError: true,
    };
  }

  // Extract text from MCP content blocks
  const textContent =
    result.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n") ?? "";

  return {
    toolCallId: toolCall.id,
    name: toolCall.name,
    content: textContent,
  };
}
