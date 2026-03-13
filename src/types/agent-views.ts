/**
 * Types for the Personal Agent Views feature.
 *
 * Each agent can create custom Morning Brief views by describing
 * their preferred queue filter in natural language. The system
 * compiles the instruction into a ticketing-engine query (Zendesk
 * search syntax) and saves it as a reusable bookmark.
 */

/**
 * Ticketing provider identifier. Currently only Zendesk is supported,
 * but the abstraction allows future engines (Salesforce, Jira Service Desk).
 */
export type TicketingProvider = "zendesk" | "salesforce" | "jira-service-desk";

/**
 * A single saved agent view (bookmark).
 * Stored as JSON in localStorage under "nexus-agent-views".
 */
export interface AgentView {
  /** Unique identifier (crypto.randomUUID()). */
  id: string;
  /** Short human-readable label shown in the dropdown (e.g., "High Priority Only"). */
  label: string;
  /** Original natural-language description the agent typed. */
  naturalLanguage: string;
  /** Compiled query string for the ticketing provider (e.g., Zendesk search syntax). */
  compiledQuery: string;
  /** Which ticketing engine this query targets. */
  provider: TicketingProvider;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last modification. */
  updatedAt: string;
}

/**
 * Full shape stored in localStorage.
 * Keeps the list of views and tracks which one is active.
 */
export interface AgentViewsState {
  /** Ordered list of saved views. */
  views: AgentView[];
  /** ID of the currently active view, or null for the default system view. */
  activeViewId: string | null;
}

/**
 * Request body for POST /api/views/compile.
 */
export interface CompileViewRequest {
  /** The agent's natural-language description of the view. */
  naturalLanguage: string;
  /** Target ticketing provider. Defaults to "zendesk". */
  provider?: TicketingProvider;
}

/**
 * Response body for POST /api/views/compile.
 */
export interface CompileViewResponse {
  /** The compiled query string. */
  compiledQuery: string;
  /** Short label for the view. */
  label: string;
  /** The provider the query targets. */
  provider: TicketingProvider;
  /** Brief explanation of what the query does. */
  explanation?: string;
  /** Error message if compilation failed. */
  error?: string;
}
