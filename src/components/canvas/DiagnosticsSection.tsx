"use client";

import { useCallback, useState } from "react";
import { useLogStore } from "@/stores/log-store";
import { parseLogFile } from "@/lib/log-parser/parser";
import { CanvasSection } from "./CanvasSection";
import { DropZone } from "@/components/log-viewer/DropZone";
import { LogFilter } from "@/components/log-viewer/LogFilter";
import { LogTable } from "@/components/log-viewer/LogTable";

export function DiagnosticsSection() {
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
    <CanvasSection sectionId="diagnostics" title="Diagnostics">
      <div className="flex flex-col gap-3 px-4 pb-4">
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
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-nexus-text">
                  {parsedLog.fileName}
                </h3>
                <span className="text-[10px] text-nexus-text-dim">
                  {parsedLog.totalLines} lines &middot; {parsedLog.format}{" "}
                  format
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
          </>
        )}
      </div>
    </CanvasSection>
  );
}
