import { create } from "zustand";
import type { LogEntry, LogLevel, ParsedLog } from "@/lib/log-parser/types";

interface LogFilters {
  levels: LogLevel[];
  searchText: string;
}

interface LogState {
  parsedLog: ParsedLog | null;
  filters: LogFilters;

  /** Derived filtered entries. */
  filteredEntries: () => LogEntry[];

  setParsedLog: (log: ParsedLog | null) => void;
  setLevelFilter: (levels: LogLevel[]) => void;
  setSearchText: (text: string) => void;
  clearLog: () => void;
}

const ALL_LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

export const useLogStore = create<LogState>((set, get) => ({
  parsedLog: null,
  filters: {
    levels: ALL_LEVELS,
    searchText: "",
  },

  filteredEntries: () => {
    const { parsedLog, filters } = get();
    if (!parsedLog) return [];

    const levelsSet = new Set(filters.levels);
    const search = filters.searchText.toLowerCase();

    return parsedLog.entries.filter((entry) => {
      if (!levelsSet.has(entry.level)) return false;
      if (
        search &&
        !entry.message.toLowerCase().includes(search) &&
        !entry.source.toLowerCase().includes(search) &&
        !entry.raw.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  },

  setParsedLog: (log) => set({ parsedLog: log }),

  setLevelFilter: (levels) =>
    set((state) => ({
      filters: { ...state.filters, levels },
    })),

  setSearchText: (text) =>
    set((state) => ({
      filters: { ...state.filters, searchText: text },
    })),

  clearLog: () =>
    set({
      parsedLog: null,
      filters: { levels: ALL_LEVELS, searchText: "" },
    }),
}));
