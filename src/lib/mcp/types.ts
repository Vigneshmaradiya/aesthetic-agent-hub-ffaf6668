/** Known MCP service names. The union includes a string catch-all
 *  so dynamically registered services are also accepted. */
export type MCPServiceName =
  | "zendesk"
  | "searchunify"
  | "logparser"
  | "jira"
  | "jira-onprem"
  | "elk"
  | "google-chat"
  | (string & Record<never, never>);

export interface MCPToolCallRequest {
  service: MCPServiceName;
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content?: Array<{ type: string; text: string }>;
  error?: string;
  degraded?: boolean;
  /** MCP SDK isError flag — true when the tool returned an error response */
  isError?: boolean;
}

// Zendesk MCP tool names (from reminia/zendesk-mcp-server)
export type ZendeskTool =
  | "get_tickets"
  | "get_ticket"
  | "get_ticket_comments"
  | "create_ticket_comment"
  | "create_ticket"
  | "update_ticket";

// SearchUnify MCP tool names (from searchunify/su-mcp)
export type SearchUnifyTool = "search" | "get-filter-options" | "analytics";
