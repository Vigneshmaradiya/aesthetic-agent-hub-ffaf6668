"use client";

import { useQueryState } from "nuqs";
import {
  tabParser,
  ticketParser,
  logLevelParser,
  searchParser,
} from "@/lib/url-state";

/**
 * Custom hook that syncs UI state with URL query parameters
 * using nuqs. Enables deep-linking and shareable views.
 */
export function useUrlState() {
  const [activeTab, setActiveTab] = useQueryState("tab", tabParser);
  const [ticketId, setTicketId] = useQueryState("ticket", ticketParser);
  const [logLevel, setLogLevel] = useQueryState("logLevel", logLevelParser);
  const [searchQuery, setSearchQuery] = useQueryState("search", searchParser);

  return {
    activeTab,
    setActiveTab,
    ticketId,
    setTicketId,
    logLevel,
    setLogLevel,
    searchQuery,
    setSearchQuery,
  };
}
