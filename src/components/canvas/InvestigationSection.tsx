"use client";

import { useCallback, useEffect, useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { useLogStore } from "@/stores/log-store";
import { parseLogFile } from "@/lib/log-parser/parser";
import { CanvasSection } from "./CanvasSection";
import { DropZone } from "@/components/log-viewer/DropZone";
import { LogFilter } from "@/components/log-viewer/LogFilter";
import { LogTable } from "@/components/log-viewer/LogTable";
import { triggerChatAction } from "@/lib/chat/trigger";
import type { DiagnosticToolType, DiagnosticToolStatus } from "@/types/canvas";

// ── Diagnostic tool grid ───────────────────────────────────────────

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

function DiagnosticToolGrid() {
  const tools = useCanvasStore((s) => s.diagnosticTools);
  if (tools.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
        Tools{" "}
        <span className="ml-1 rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-nexus-text-dim">
          {tools.length}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2">
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
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{typeIcons[tool.type]}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-nexus-text">
                  {tool.label}
                </span>
              </div>
              <p className="line-clamp-2 text-[10px] leading-relaxed text-nexus-text-dim">
                {tool.description}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-medium ${style.text}`}>
                  {style.label}
                </span>
              </div>
              {tool.status === "completed" && tool.result && (
                <p className="mt-0.5 rounded bg-nexus-surface-raised px-1.5 py-1 text-[10px] text-nexus-text-muted">
                  {tool.result}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Log viewer ─────────────────────────────────────────────────────

function LogViewer() {
  const parsedLog = useLogStore((s) => s.parsedLog);
  const filters = useLogStore((s) => s.filters);
  const filteredEntries = useLogStore((s) => s.filteredEntries);
  const setParsedLog = useLogStore((s) => s.setParsedLog);
  const setLevelFilter = useLogStore((s) => s.setLevelFilter);
  const setSearchText = useLogStore((s) => s.setSearchText);
  const clearLog = useLogStore((s) => s.clearLog);

  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const content = await file.text();
        const result = parseLogFile(content, undefined, file.name);
        setParsedLog(result);
      } catch {
        setError("Failed to parse the log file. Please check the format.");
      }
    },
    [setParsedLog],
  );

  const handleClearFilters = useCallback(() => {
    setLevelFilter(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]);
    setSearchText("");
  }, [setLevelFilter, setSearchText]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
        Log Analysis
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-nexus-error/30 bg-nexus-error/10 px-3 py-2 text-xs text-nexus-error"
        >
          {error}
        </div>
      )}

      {!parsedLog ? (
        <div className="w-full max-w-sm">
          <DropZone fileName={null} onFile={handleFile} onError={setError} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-nexus-text">
                {parsedLog.fileName}
              </span>
              <span className="text-[10px] text-nexus-text-dim">
                {parsedLog.totalLines} lines · {parsedLog.format} format
              </span>
            </div>
            <button
              type="button"
              onClick={clearLog}
              className="rounded-md border border-nexus-border px-2.5 py-1 text-[10px] font-medium text-nexus-text-muted transition-colors hover:bg-nexus-surface-raised hover:text-nexus-text"
            >
              Clear
            </button>
          </div>
          <LogFilter
            activeLevels={filters.levels}
            searchText={filters.searchText}
            summary={parsedLog.summary}
            onLevelChange={setLevelFilter}
            onSearchChange={setSearchText}
            onClear={handleClearFilters}
          />
          <div className="max-h-[400px] overflow-auto">
            <LogTable entries={filteredEntries()} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Combined section ───────────────────────────────────────────────

export function InvestigationSection() {
  const setSectionState = useCanvasStore((s) => s.setSectionState);

  // Investigation has no async fetch — clear loading immediately on mount
  // so the skeleton doesn't block the log drop zone and diagnostic tool grid.
  useEffect(() => {
    setSectionState("troubleshooting-tools", { loading: false });
  }, [setSectionState]);

  return (
    <CanvasSection sectionId="troubleshooting-tools" title="Investigation">
      <div className="space-y-5 px-4 pb-4">
        <DiagnosticToolGrid />
        <LogViewer />
      </div>
    </CanvasSection>
  );
}
