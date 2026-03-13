#!/usr/bin/env node
"use strict";
/**
 * JIRA On-Premise MCP Server — HTTP Entry Point
 *
 * Starts the JIRA on-prem MCP server with Streamable HTTP transport.
 * Uses Node.js built-in HTTP module (no Express dependency).
 *
 * Each incoming request gets a fresh MCP server + transport pair
 * (stateless mode). The MCP server handles JIRA authentication
 * internally using Basic Auth from environment variables.
 *
 * Usage:
 *   node dist-mcp/mcp-servers/jira-onprem/start.js
 *
 * Environment variables:
 *   MCP_PORT             — Port to listen on (default: 8080)
 *   JIRA_BASE_URL        — JIRA instance URL (e.g., "https://jira.company.com")
 *   JIRA_USERNAME        — Service account username
 *   JIRA_PASSWORD        — Service account password
 *   JIRA_DEFAULT_PROJECT — Default project key (e.g., "SUPP")
 *   JIRA_TICKET_ID_FIELD — Custom field for Zendesk ticket ID (e.g., "customfield_12345")
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const server_js_1 = require("./server.js");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.local', override: true });
const PORT = Number(process.env.MCP_PORT) || 8081;
// ─── HTTP Server ────────────────────────────────────────────────
const httpServer = (0, http_1.createServer)(async (req, res) => {
    // Health check endpoint
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "healthy",
            server: "jira-onprem-mcp",
            jiraBaseUrl: process.env.JIRA_BASE_URL ?? "not set",
            project: process.env.JIRA_DEFAULT_PROJECT ?? "not set",
            ticketIdField: process.env.JIRA_TICKET_ID_FIELD ?? "not set",
        }));
        return;
    }
    // MCP endpoint — create fresh server + transport per request (stateless)
    if (req.url === "/mcp" || req.url === "/mcp/") {
        try {
            // Stateless: new transport + server for each request
            const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: undefined, // stateless mode
                enableJsonResponse: true,
            });
            const mcpServer = (0, server_js_1.createJiraOnPremMCPServer)();
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res);
            // Clean up after request
            await mcpServer.close();
        }
        catch (error) {
            console.error("[jira-onprem-mcp] Error handling request:", error);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    jsonrpc: "2.0",
                    error: {
                        code: -32603,
                        message: "Internal server error",
                    },
                }));
            }
        }
        return;
    }
    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});
// ─── Startup ────────────────────────────────────────────────────
async function main() {
    // Validate required configuration
    const baseUrl = process.env.JIRA_BASE_URL;
    const username = process.env.JIRA_USERNAME;
    const password = process.env.JIRA_PASSWORD;
    if (!baseUrl) {
        console.error("[jira-onprem-mcp] Error: JIRA_BASE_URL is required");
        process.exit(1);
    }
    if (!username || !password) {
        console.error("[jira-onprem-mcp] Error: JIRA_USERNAME and JIRA_PASSWORD are required");
        process.exit(1);
    }
    const project = process.env.JIRA_DEFAULT_PROJECT;
    const ticketField = process.env.JIRA_TICKET_ID_FIELD;
    // Start HTTP server
    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`[jira-onprem-mcp] JIRA On-Premise MCP server listening on port ${PORT}`);
        console.log(`[jira-onprem-mcp] MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
        console.log(`[jira-onprem-mcp] Health check: http://0.0.0.0:${PORT}/health`);
        console.log(`[jira-onprem-mcp] JIRA: ${baseUrl}`);
        console.log(`[jira-onprem-mcp] Project: ${project ?? "(no default project)"}`);
        console.log(`[jira-onprem-mcp] Ticket ID field: ${ticketField ?? "(not configured)"}`);
        console.log("[jira-onprem-mcp] Mode: stateless (per-request server)");
    });
}
main().catch((err) => {
    console.error("[jira-onprem-mcp] Fatal error:", err);
    process.exit(1);
});
