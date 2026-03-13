"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { triggerChatAction } from "@/lib/chat/trigger";
import type { DiagnosticToolType, DiagnosticToolStatus } from "@/types/canvas";

const typeIcons: Record<DiagnosticToolType, string> = {
  logs: "\u{1F4CB}",
  diagnostics: "\u{1F50D}",
  deployments: "\u{1F680}",
  metrics: "\u{1F4CA}",
};

const statusStyles: Record<
  DiagnosticToolStatus,
  { dot: string; text: string; label: string }
> = {
  available: {
    dot: "bg-nexus-text-dim",
    text: "text-nexus-text-dim",
    label: "Available",
  },
  running: {
    dot: "bg-nexus-accent animate-pulse",
    text: "text-nexus-accent",
    label: "Running...",
  },
  completed: {
    dot: "bg-nexus-success",
    text: "text-nexus-success",
    label: "Completed",
  },
  failed: {
    dot: "bg-red-400",
    text: "text-red-400",
    label: "Failed",
  },
};

export function TroubleshootingToolsSection() {
  const tools = useCanvasStore((s) => s.diagnosticTools);

  if (tools.length === 0) return null;

  return (
    <CanvasSection
      sectionId="troubleshooting-tools"
      title="Troubleshooting Tools"
      badge={
        <span className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
          {tools.length} tools
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {tools.map((tool) => {
          const style = statusStyles[tool.status];
          const isClickable = tool.status === "available" && tool.chatPrompt;

          return (
            <button
              key={tool.id}
              onClick={() => {
                if (isClickable && tool.chatPrompt) {
                  triggerChatAction(tool.chatPrompt);
                }
              }}
              disabled={!isClickable}
              className={`flex flex-col gap-1.5 rounded-md border border-nexus-border p-2.5 text-left transition-colors ${
                isClickable
                  ? "cursor-pointer bg-nexus-surface-raised/50 hover:border-nexus-accent/30"
                  : "cursor-default bg-nexus-surface-raised/30"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{typeIcons[tool.type]}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-nexus-text">
                  {tool.label}
                </span>
              </div>

              {/* Description */}
              <p className="line-clamp-2 text-[10px] leading-relaxed text-nexus-text-dim">
                {tool.description}
              </p>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-medium ${style.text}`}>
                  {style.label}
                </span>
              </div>

              {/* Result (if completed) */}
              {tool.status === "completed" && tool.result && (
                <p className="mt-0.5 rounded bg-nexus-surface-raised px-1.5 py-1 text-[10px] text-nexus-text-muted">
                  {tool.result}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </CanvasSection>
  );
}
