import { useEffect, useMemo } from "react";
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
  const setMcpConnection = useSessionStore((s) => s.setMcpConnection);

  // Seed MCP connection state on mount
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
        // Non-fatal
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

      {/* Top Header Bar */}
      <header className="glass-header flex h-12 items-center justify-between border-b border-nexus-border px-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nexus-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-nexus-accent" style={{ boxShadow: '0 0 12px rgb(var(--nexus-accent))' }} />
          </span>
          <span className="text-sm font-bold uppercase tracking-widest text-nexus-accent">
            Nexus
          </span>
        </div>

        <button
          onClick={() => toggleOmniBar()}
          className="mx-8 flex max-w-[600px] flex-1 items-center gap-2 rounded-lg border border-nexus-border bg-nexus-base px-4 py-2 text-sm text-nexus-text-dim transition-all hover:border-nexus-accent-dim focus:border-nexus-accent focus:shadow-[0_0_0_3px_var(--nexus-glow)] focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search or jump to…</span>
          <kbd className="ml-auto rounded border border-nexus-border bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-nexus-text-dim">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-nexus-border text-nexus-text-muted transition-all hover:-translate-y-px hover:border-nexus-accent-dim hover:bg-nexus-surface-raised hover:text-nexus-accent">
            ⚙
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-nexus-border text-nexus-text-muted transition-all hover:-translate-y-px hover:border-nexus-accent-dim hover:bg-nexus-surface-raised hover:text-nexus-accent">
            🔔
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-nexus-border text-nexus-text-muted transition-all hover:-translate-y-px hover:border-nexus-accent-dim hover:bg-nexus-surface-raised hover:text-nexus-accent">
            👤
          </button>
        </div>
      </header>

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
