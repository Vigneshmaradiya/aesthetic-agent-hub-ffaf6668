"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/stores/session-store";

interface MCPStatus {
  id: string;
  displayName: string;
  description: string;
  category: "admin" | "agent";
  icon: string;
  status: "connected" | "disconnected" | "unavailable";
  toolCategories: string[];
  oauthConfigured?: boolean;
}

/**
 * Overlay panel for managing MCP tool connections.
 *
 * Admin MCPs show their auto-detected status.
 * Agent MCPs show Connect/Disconnect buttons.
 */
export function MCPConnectionsPanel() {
  const show = useSessionStore((s) => s.showMCPPanel);
  const setShow = useSessionStore((s) => s.setShowMCPPanel);
  const setMcpConnection = useSessionStore((s) => s.setMcpConnection);
  const [mcps, setMcps] = useState<MCPStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Fetch MCP statuses on open
  useEffect(() => {
    if (!show) return;

    setLoading(true);
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then((data: MCPStatus[]) => {
        setMcps(data);
        // Sync to session store
        for (const mcp of data) {
          setMcpConnection(
            mcp.id,
            mcp.status === "connected"
              ? "connected"
              : mcp.status === "unavailable"
                ? "disconnected"
                : "disconnected",
          );
        }
      })
      .catch(() => {
        // Silently fail — show empty state
      })
      .finally(() => setLoading(false));
  }, [show, setMcpConnection]);

  // Handle escape key
  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShow(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [show, setShow]);

  const handleConnect = useCallback(
    async (mcpId: string) => {
      setConnectingId(mcpId);
      setMcpConnection(mcpId, "connecting");
      try {
        const res = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mcpId }),
        });

        const data = (await res.json()) as { authUrl?: string; error?: string };

        if (data.authUrl) {
          // Open OAuth popup
          const popup = window.open(
            data.authUrl,
            `mcp_oauth_${mcpId}`,
            "width=600,height=700,popup=yes",
          );

          // Poll for popup close (token set via cookie on callback)
          if (popup) {
            const interval = setInterval(() => {
              if (popup.closed) {
                clearInterval(interval);
                // Refetch statuses after OAuth flow
                fetch("/api/mcp/status")
                  .then((r) => r.json())
                  .then((updated: MCPStatus[]) => {
                    setMcps(updated);
                    const mcp = updated.find((m) => m.id === mcpId);
                    setMcpConnection(
                      mcpId,
                      mcp?.status === "connected"
                        ? "connected"
                        : "disconnected",
                    );
                    setConnectingId(null);
                  })
                  .catch(() => setConnectingId(null));
              }
            }, 500);
          }
        } else {
          setMcpConnection(mcpId, "error");
          setConnectingId(null);
        }
      } catch {
        setMcpConnection(mcpId, "error");
        setConnectingId(null);
      }
    },
    [setMcpConnection],
  );

  const handleDisconnect = useCallback(
    async (mcpId: string) => {
      try {
        await fetch("/api/mcp/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mcpId }),
        });

        setMcps((prev) =>
          prev.map((m) =>
            m.id === mcpId ? { ...m, status: "disconnected" as const } : m,
          ),
        );
        setMcpConnection(mcpId, "disconnected");
      } catch {
        // Silently fail
      }
    },
    [setMcpConnection],
  );

  const adminMcps = mcps.filter((m) => m.category === "admin");
  const agentMcps = mcps.filter((m) => m.category === "agent");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShow(false)}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-nexus-border bg-nexus-surface shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-nexus-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-nexus-text">
                  Connected Tools
                </h2>
                <p className="mt-0.5 text-[10px] text-nexus-text-dim">
                  Manage MCP service connections
                </p>
              </div>
              <button
                onClick={() => setShow(false)}
                className="rounded-md p-1 text-nexus-text-dim transition-colors hover:bg-nexus-surface-raised hover:text-nexus-text"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto p-4">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-3 w-1/3 rounded bg-nexus-border" />
                  <div className="h-10 rounded bg-nexus-border/60" />
                  <div className="h-10 rounded bg-nexus-border/60" />
                </div>
              ) : (
                <>
                  {/* Admin MCPs */}
                  {adminMcps.length > 0 && (
                    <div className="mb-4">
                      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                        Admin-Configured
                      </h3>
                      <div className="space-y-2">
                        {adminMcps.map((mcp) => (
                          <MCPRow
                            key={mcp.id}
                            mcp={mcp}
                            connecting={connectingId === mcp.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent MCPs */}
                  {agentMcps.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                        Agent-Configured
                      </h3>
                      <div className="space-y-2">
                        {agentMcps.map((mcp) => (
                          <MCPRow
                            key={mcp.id}
                            mcp={mcp}
                            connecting={connectingId === mcp.id}
                            onConnect={() => handleConnect(mcp.id)}
                            onDisconnect={() => handleDisconnect(mcp.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-component ──────────────────────────────────────────────

function MCPRow({
  mcp,
  connecting,
  onConnect,
  onDisconnect,
}: {
  mcp: MCPStatus;
  connecting: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const statusColor =
    mcp.status === "connected"
      ? "bg-nexus-success"
      : mcp.status === "unavailable"
        ? "bg-nexus-text-dim"
        : "bg-nexus-text-dim";

  return (
    <div className="flex items-center gap-3 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-3 py-2">
      <span className="text-base">{mcp.icon}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
              connecting ? "animate-pulse bg-nexus-warning" : statusColor
            }`}
          />
          <span className="text-xs font-medium text-nexus-text">
            {mcp.displayName}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-nexus-text-dim">
          {mcp.description}
        </p>
      </div>

      {/* Actions */}
      {mcp.category === "admin" ? (
        <span className="shrink-0 rounded-full bg-nexus-surface-raised px-2 py-0.5 text-[10px] font-medium text-nexus-text-dim">
          {mcp.status === "connected" ? "Active" : "Not configured"}
        </span>
      ) : (
        <div className="shrink-0">
          {mcp.status === "connected" ? (
            <button
              onClick={onDisconnect}
              className="rounded-md border border-nexus-border bg-nexus-surface px-2.5 py-1 text-[10px] font-medium text-nexus-text-dim transition-colors hover:border-nexus-error hover:text-nexus-error"
            >
              Disconnect
            </button>
          ) : connecting ? (
            <span className="px-2.5 py-1 text-[10px] font-medium text-nexus-warning">
              Connecting...
            </span>
          ) : mcp.oauthConfigured ? (
            <button
              onClick={onConnect}
              className="rounded-md bg-nexus-accent px-2.5 py-1 text-[10px] font-medium text-nexus-base transition-colors hover:opacity-90"
            >
              Connect
            </button>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-medium text-nexus-text-dim">
              Not available
            </span>
          )}
        </div>
      )}
    </div>
  );
}
