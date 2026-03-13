"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "@/stores/session-store";
import type { MCPServiceName, MCPToolCallResult } from "@/lib/mcp/types";

interface UseMCPOptions {
  onDegraded?: (service: string) => void;
}

export function useMCP(options?: UseMCPOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setMcpConnection = useSessionStore((s) => s.setMcpConnection);

  const callTool = useCallback(
    async (
      service: MCPServiceName,
      tool: string,
      args: Record<string, unknown> = {},
    ): Promise<MCPToolCallResult & { degraded: boolean }> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/mcp/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service, tool, arguments: args }),
        });

        if (res.status === 503) {
          setMcpConnection(service, "error");
          options?.onDegraded?.(service);
          const data = await res.json();
          return { degraded: true, error: data.error };
        }

        if (!res.ok) {
          throw new Error(`MCP call failed: ${res.statusText}`);
        }

        setMcpConnection(service, "connected");
        const data = await res.json();
        return { ...data, degraded: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setMcpConnection(service, "error");
        return { degraded: true, error: message };
      } finally {
        setLoading(false);
      }
    },
    [options, setMcpConnection],
  );

  return { callTool, loading, error };
}
