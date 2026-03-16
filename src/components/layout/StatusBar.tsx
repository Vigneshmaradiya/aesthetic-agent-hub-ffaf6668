"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session-store";
import type { ConnectionStatus } from "@/stores/session-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { HitlToggle } from "@/components/hitl/HitlToggle";
import { AutonomousIndicator } from "@/components/hitl/AutonomousIndicator";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SLAStatusIndicator } from "@/components/canvas/SLATimerBadge";

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const colorMap: Record<ConnectionStatus, string> = {
    connected: "bg-nexus-success",
    connecting: "bg-nexus-warning animate-pulse",
    disconnected: "bg-nexus-text-dim",
    error: "bg-nexus-error animate-pulse",
  };

  const glowMap: Record<ConnectionStatus, string> = {
    connected: "0 0 8px rgb(var(--nexus-success) / 0.5)",
    connecting: "0 0 6px rgb(var(--nexus-warning) / 0.4)",
    disconnected: "none",
    error: "0 0 8px rgb(var(--nexus-error) / 0.5)",
  };

  return (
    <span
      className={`inline-block h-[6px] w-[6px] rounded-full ${colorMap[status]}`}
      style={{ boxShadow: glowMap[status] }}
      role="status"
      aria-label={`Status: ${status}`}
    />
  );
}

function formatUptime(startedAt: Date) {
  const diff = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function StatusBar() {
  const { mcpConnections, startedAt, llmModel, ticketingProvider, userName } =
    useSessionStore();
  const setShowMCPPanel = useSessionStore((s) => s.setShowMCPPanel);
  const setShowMorningBrief = useSessionStore((s) => s.setShowMorningBrief);
  const activeTicketId = useCanvasStore((s) => s.activeTicketId);
  const ticketIntelligence = useCanvasStore((s) => s.ticketIntelligence);
  const [uptime, setUptime] = useState("0h 0m");

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(formatUptime(startedAt));
    }, 60000);
    setUptime(formatUptime(startedAt));
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="glass-surface flex h-7 items-center justify-between border-t border-nexus-border px-4 text-[11px] text-nexus-text-muted">
      <div className="flex items-center gap-4">
        {/* Ticketing provider status */}
        {ticketingProvider && (
          <div className="flex items-center gap-1.5">
            <ConnectionDot status="connected" />
            <span className="capitalize">{ticketingProvider}</span>
            {userName && (
              <span className="text-nexus-text-dim">({userName})</span>
            )}
          </div>
        )}

        {/* MCP connections */}
        <button
          onClick={() => setShowMCPPanel(true)}
          className="flex items-center gap-3 rounded-md px-1.5 py-0.5 transition-colors hover:bg-nexus-surface-raised"
          title="Manage tool connections"
        >
          {Object.entries(mcpConnections)
            .filter(([, status]) => status !== "disconnected")
            .map(([service, status]) => (
              <div key={service} className="flex items-center gap-1.5">
                <ConnectionDot status={status} />
                <span>{service}</span>
              </div>
            ))}
          {Object.entries(mcpConnections).filter(
            ([, status]) => status !== "disconnected",
          ).length === 0 &&
            !ticketingProvider && (
              <span className="text-nexus-text-dim">No connections</span>
            )}
          <span className="text-nexus-text-dim" aria-hidden="true">
            +
          </span>
        </button>

        {/* Active ticket chip */}
        {activeTicketId && (
          <div className="flex items-center gap-1.5 rounded-md bg-nexus-accent/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-nexus-accent" style={{ boxShadow: '0 0 6px rgb(var(--nexus-accent) / 0.5)' }} />
            <span className="font-mono text-nexus-accent">#{activeTicketId}</span>
            {ticketIntelligence?.subject && (
              <span className="max-w-[200px] truncate text-nexus-text-muted">
                {ticketIntelligence.subject}
              </span>
            )}
          </div>
        )}

        {/* SLA status indicator */}
        <SLAStatusIndicator />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <HitlToggle />
          <AutonomousIndicator />
        </div>
        <span className="text-nexus-border">│</span>
        <ThemeToggle />
        <span className="text-nexus-border">│</span>
        {llmModel && (
          <>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-nexus-accent" style={{ boxShadow: '0 0 6px rgb(var(--nexus-accent) / 0.5)' }} />
              <span className="font-mono">{llmModel}</span>
            </span>
            <span className="text-nexus-border">│</span>
          </>
        )}
        <span className="font-mono">⏱ {uptime}</span>
        <button
          onClick={() => setShowMorningBrief(true)}
          className="rounded-md bg-nexus-accent/10 px-2 py-0.5 font-medium text-nexus-accent transition-all hover:bg-nexus-accent/20"
          style={{ boxShadow: "0 0 8px rgb(var(--nexus-accent) / 0.1)" }}
          title="Open Morning Brief"
        >
          Brief
        </button>
        <span className="text-nexus-border">│</span>
        <span className="text-nexus-text-dim">
          <kbd className="rounded border border-nexus-border bg-nexus-surface-raised px-1 font-mono text-[10px]">
            ⌘K
          </kbd>
        </span>
      </div>
    </div>
  );
}
