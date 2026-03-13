"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSessionStore } from "@/stores/session-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { OmniBar } from "./OmniBar";
import { StatusBar } from "./StatusBar";
import { ResizeHandle } from "./ResizeHandle";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CanvasPanel } from "@/components/canvas/CanvasPanel";
import { MorningBriefOverlay } from "@/components/morning-brief/MorningBriefOverlay";
import { MCPConnectionsPanel } from "@/components/settings/MCPConnectionsPanel";

export function HudShell() {
  const panelRatio = useSessionStore((s) => s.panelRatio);
  const toggleOmniBar = useSessionStore((s) => s.toggleOmniBar);
  const setTicketingProvider = useSessionStore((s) => s.setTicketingProvider);
  const setUserInfo = useSessionStore((s) => s.setUserInfo);
  const setMcpConnection = useSessionStore((s) => s.setMcpConnection);

  // Sync session info into session store
  const { data: session } = useSession();
  useEffect(() => {
    if (session?.provider) {
      setTicketingProvider(session.provider as "zendesk" | "salesforce");
    }
    if (session?.user) {
      setUserInfo(session.user.name ?? null, session.user.email ?? null);
    }
  }, [session, setTicketingProvider, setUserInfo]);

  // Seed MCP connection state on mount so the StatusBar shows connected
  // MCPs immediately without requiring the user to open the panel first.
  useEffect(() => {
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then(
        (
          data: Array<{
            id: string;
            status: "connected" | "disconnected" | "unavailable";
          }>,
        ) => {
          for (const mcp of data) {
            setMcpConnection(
              mcp.id,
              mcp.status === "connected" ? "connected" : "disconnected",
            );
          }
        },
      )
      .catch(() => {
        // Non-fatal — StatusBar will show empty state
      });
  }, [setMcpConnection]);

  const shortcuts = useMemo(
    () => ({
      "meta+k": () => toggleOmniBar(),
    }),
    [toggleOmniBar],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-nexus-base">
      {/* Morning Brief Overlay */}
      <MorningBriefOverlay />

      {/* OmniBar Overlay */}
      <OmniBar />

      {/* MCP Connections Panel */}
      <MCPConnectionsPanel />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel (Left) */}
        <div
          className="flex flex-col overflow-hidden border-r border-nexus-border"
          style={{ width: `${panelRatio * 100}%` }}
        >
          <ChatPanel />
        </div>

        {/* Resize Handle */}
        <ResizeHandle />

        {/* Canvas Panel (Right) */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${(1 - panelRatio) * 100}%` }}
        >
          <CanvasPanel />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
