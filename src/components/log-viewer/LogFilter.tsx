"use client";

import { useCallback } from "react";
import type { LogLevel, ParsedLog } from "@/lib/log-parser/types";
import { levelBadgeClass } from "./LogHighlighter";

const ALL_LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

interface LogFilterProps {
  activeLevels: LogLevel[];
  searchText: string;
  summary: ParsedLog["summary"] | null;
  onLevelChange: (levels: LogLevel[]) => void;
  onSearchChange: (text: string) => void;
  onClear: () => void;
}

export function LogFilter({
  activeLevels,
  searchText,
  summary,
  onLevelChange,
  onSearchChange,
  onClear,
}: LogFilterProps) {
  const handleLevelToggle = useCallback(
    (level: LogLevel) => {
      if (activeLevels.includes(level)) {
        onLevelChange(activeLevels.filter((l) => l !== level));
      } else {
        onLevelChange([...activeLevels, level]);
      }
    },
    [activeLevels, onLevelChange],
  );

  const hasActiveFilters =
    activeLevels.length < ALL_LEVELS.length || searchText.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-nexus-border bg-nexus-surface p-3">
      {/* Level checkboxes */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_LEVELS.map((level) => {
          const count = summary?.byLevel[level] ?? 0;
          const checked = activeLevels.includes(level);
          return (
            <label
              key={level}
              className="flex cursor-pointer select-none items-center gap-1.5"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleLevelToggle(level)}
                className="h-3.5 w-3.5 rounded border-nexus-border bg-nexus-base accent-nexus-accent"
              />
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${levelBadgeClass(level)}`}
              >
                {level}
                <span className="ml-0.5 rounded-sm bg-black/20 px-1 text-[9px] font-normal">
                  {count}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-nexus-border" aria-hidden="true" />

      {/* Search input */}
      <div className="relative flex-1">
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search log entries..."
          aria-label="Search log entries"
          className="w-full min-w-[180px] rounded-md border border-nexus-border bg-nexus-base px-3 py-1.5 text-xs text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent focus:outline-none focus:ring-1 focus:ring-nexus-accent"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-nexus-border px-2.5 py-1.5 text-[10px] font-medium text-nexus-text-muted transition-colors hover:bg-nexus-surface-raised hover:text-nexus-text"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
