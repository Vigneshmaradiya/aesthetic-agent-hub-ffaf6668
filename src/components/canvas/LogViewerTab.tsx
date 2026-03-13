"use client";

import { useCallback, useState } from "react";
import { useLogStore } from "@/stores/log-store";
import { parseLogFile } from "@/lib/log-parser/parser";
import { DropZone } from "@/components/log-viewer/DropZone";
import { LogFilter } from "@/components/log-viewer/LogFilter";
import { LogTable } from "@/components/log-viewer/LogTable";

export function LogViewerTab() {
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
    <div
      role="tabpanel"
      id="canvas-tabpanel-logs"
      aria-labelledby="canvas-tab-logs"
      className="flex flex-1 flex-col gap-3 overflow-hidden p-4"
    >
      {error && (
        <div
          role="alert"
          className="rounded-md border border-nexus-error/30 bg-nexus-error/10 px-3 py-2 text-xs text-nexus-error"
        >
          {error}
        </div>
      )}

      {!parsedLog ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <DropZone fileName={null} onFile={handleFile} onError={setError} />
          </div>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-nexus-text">
                {parsedLog.fileName}
              </h3>
              <span className="text-[10px] text-nexus-text-dim">
                {parsedLog.totalLines} lines &middot; {parsedLog.format} format
              </span>
            </div>
            <button
              type="button"
              onClick={clearLog}
              className="rounded-md border border-nexus-border px-2.5 py-1 text-[10px] font-medium text-nexus-text-muted transition-colors hover:bg-nexus-surface-raised hover:text-nexus-text"
            >
              Close file
            </button>
          </div>

          {/* Filters */}
          <LogFilter
            activeLevels={filters.levels}
            searchText={filters.searchText}
            summary={parsedLog.summary}
            onLevelChange={setLevelFilter}
            onSearchChange={setSearchText}
            onClear={handleClearFilters}
          />

          {/* Log table */}
          <div className="flex-1 overflow-auto">
            <LogTable entries={filteredEntries()} />
          </div>
        </>
      )}
    </div>
  );
}
