#!/usr/bin/env node
"use strict";
/**
 * Zendesk MCP Server — HTTP Entry Point
 *
 * Starts the custom Zendesk MCP server with Streamable HTTP transport.
 * Uses Node.js built-in HTTP module (no Express dependency).
 *
 * Each incoming request gets a fresh MCP server + transport pair
 * (stateless mode). This means no session state is maintained between
 * requests — the Nexus app's MCP client handles session management.
 *
 * Usage:
 *   node dist-mcp/mcp-servers/zendesk/start.js
 *
 * Environment variables:
 *   MCP_PORT            — Port to listen on (default: 8080)
 *   ZENDESK_SUBDOMAIN   — Zendesk subdomain (e.g., "mycompany")
 *   ZENDESK_BASE_URL    — Full Zendesk URL (alternative to subdomain)
 *   ZENDESK_EMAIL       — Agent email for API token auth
 *   ZENDESK_API_TOKEN   — Zendesk API token for auth
 *   MCP_REQUEST_TIMEOUT_MS — Timeout for Zendesk API calls (default: 30000)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const server_js_1 = require("./server.js");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.local', override: true });
const PORT = Number(process.env.MCP_PORT) || 8080;
// ─── HTTP Server ────────────────────────────────────────────────
const httpServer = (0, http_1.createServer)(async (req, res) => {
    // Health check endpoint
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", server: "zendesk-mcp" }));
        return;
    }
    // MCP endpoint — create fresh server + transport per request (stateless)
    if (req.url === "/mcp" || req.url === "/mcp/") {
        // Extract Bearer token from Authorization header for OAuth forwarding
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            (0, server_js_1.setCurrentAccessToken)(authHeader.slice(7));
        }
        else {
            (0, server_js_1.setCurrentAccessToken)(undefined);
        }
        try {
            // Stateless: new transport + server for each request
            const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: undefined, // stateless mode
                enableJsonResponse: true,
            });
            const mcpServer = (0, server_js_1.createZendeskMCPServer)();
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res);
            // Clean up after request
            await mcpServer.close();
        }
        catch (error) {
            console.error("[zendesk-mcp] Error handling request:", error);
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
        // Clear token after request completes
        (0, server_js_1.setCurrentAccessToken)(undefined);
        return;
    }
    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});
// ─── Startup ────────────────────────────────────────────────────
async function main() {
    // Validate required configuration
    const hasBaseUrl = !!process.env.ZENDESK_BASE_URL;
    const hasSubdomain = !!process.env.ZENDESK_SUBDOMAIN;
    const hasApiToken = !!process.env.ZENDESK_EMAIL && !!process.env.ZENDESK_API_TOKEN;
    if (!hasBaseUrl && !hasSubdomain) {
        console.error("[zendesk-mcp] Error: Set ZENDESK_BASE_URL or ZENDESK_SUBDOMAIN");
        process.exit(1);
    }
    if (!hasApiToken) {
        console.warn("[zendesk-mcp] Warning: ZENDESK_EMAIL/ZENDESK_API_TOKEN not set. " +
            "OAuth Bearer tokens must be provided with each request.");
    }
    // Start HTTP server
    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`[zendesk-mcp] Zendesk MCP server listening on port ${PORT}`);
        console.log(`[zendesk-mcp] MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
        console.log(`[zendesk-mcp] Health check: http://0.0.0.0:${PORT}/health`);
        console.log("[zendesk-mcp] Mode: stateless (per-request server)");
    });
}
main().catch((err) => {
    console.error("[zendesk-mcp] Fatal error:", err);
    process.exit(1);
});
