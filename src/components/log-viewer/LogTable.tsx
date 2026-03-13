"use client";

import { useCallback, useState } from "react";
import type { LogEntry } from "@/lib/log-parser/types";
import { levelBadgeClass, HighlightedLine } from "./LogHighlighter";

interface LogTableProps {
  entries: LogEntry[];
}

export function LogTable({ entries }: LogTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = useCallback((lineNumber: number) => {
    setExpandedRow((prev) => (prev === lineNumber ? null : lineNumber));
  }, []);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-nexus-text-dim">
          No log entries match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Entry count */}
      <p className="px-1 text-xs text-nexus-text-muted">
        Showing {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </p>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-nexus-border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-nexus-border bg-nexus-surface">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-nexus-text-muted">
                Line&nbsp;#
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-nexus-text-muted">
                Timestamp
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-nexus-text-muted">
                Level
              </th>
              <th className="whitespace-nowrap px-3 py-2 font-medium text-nexus-text-muted">
                Source
              </th>
              <th className="px-3 py-2 font-medium text-nexus-text-muted">
                Message
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isExpanded = expandedRow === entry.lineNumber;
              return (
                <tr
                  key={entry.lineNumber}
                  className="cursor-pointer border-b border-nexus-border/50 transition-colors hover:bg-nexus-surface-raised"
                  onClick={() => toggleRow(entry.lineNumber)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleRow(entry.lineNumber);
                    }
                  }}
                >
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-nexus-text-dim">
                    {entry.lineNumber}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-nexus-accent-muted">
                    {entry.timestamp}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${levelBadgeClass(entry.level)}`}
                    >
                      {entry.level}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-nexus-text-muted">
                    {entry.source}
                  </td>
                  <td className="max-w-md truncate px-3 py-1.5 text-nexus-text">
                    {isExpanded ? (
                      <div className="whitespace-pre-wrap break-all">
                        <HighlightedLine raw={entry.raw} />
                      </div>
                    ) : (
                      entry.message
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
