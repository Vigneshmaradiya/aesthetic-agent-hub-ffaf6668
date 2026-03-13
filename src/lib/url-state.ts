import { parseAsString, parseAsStringEnum } from "nuqs";
import type { CanvasTabId } from "@/types/canvas";

const CANVAS_TABS: CanvasTabId[] = [
  "briefing",
  "troubleshooting",
  "response",
  "logs",
];

/**
 * URL query-param parser for the active canvas tab.
 * @deprecated Tabs replaced by progressive section layout. Kept for URL compat.
 */
export const tabParser =
  parseAsStringEnum<CanvasTabId>(CANVAS_TABS).withDefault("briefing");

/** URL query-param parser for the currently selected ticket ID. */
export const ticketParser = parseAsString;

/** URL query-param parser for the active log filter level. */
export const logLevelParser = parseAsString;

/** URL query-param parser for search/filter text. */
export const searchParser = parseAsString;
