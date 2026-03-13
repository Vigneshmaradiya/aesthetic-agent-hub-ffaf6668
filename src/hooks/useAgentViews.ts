"use client";

/**
 * Hook for managing personal agent views (Morning Brief bookmarks).
 *
 * Follows the same localStorage hydration pattern as ThemeProvider.tsx:
 * - useState initializes with empty defaults (SSR-safe)
 * - useEffect reads localStorage on mount (client-only)
 *
 * Storage key: "nexus-agent-views" (matching the nexus-* prefix convention).
 * Max 10 views per agent to prevent unbounded localStorage growth.
 */

import { useCallback, useEffect, useState } from "react";
import type { AgentView, AgentViewsState } from "@/types/agent-views";

const STORAGE_KEY = "nexus-agent-views";
const MAX_VIEWS = 10;

const DEFAULT_STATE: AgentViewsState = { views: [], activeViewId: null };

// ─── localStorage helpers ─────────────────────────────────────

function readFromStorage(): AgentViewsState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as AgentViewsState;
    // Basic shape validation
    if (!Array.isArray(parsed.views)) return DEFAULT_STATE;
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeToStorage(state: AgentViewsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silent failure
  }
}

// ─── Cross-instance sync event ────────────────────────────────
// All hook instances listen for this event and re-read localStorage
// so that creating/updating/deleting a view in one component (e.g.
// ViewEditor) is immediately reflected in every other component that
// also calls useAgentViews (e.g. ViewSelector, TicketQueue).
const SYNC_EVENT = "nexus-agent-views-update";

// ─── Hook ─────────────────────────────────────────────────────

export function useAgentViews() {
  const [state, setState] = useState<AgentViewsState>(DEFAULT_STATE);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    setState(readFromStorage());
  }, []);

  // Re-sync when any sibling hook instance writes a change
  useEffect(() => {
    function onExternalUpdate() {
      setState(readFromStorage());
    }
    window.addEventListener(SYNC_EVENT, onExternalUpdate);
    return () => window.removeEventListener(SYNC_EVENT, onExternalUpdate);
  }, []);

  const persist = useCallback((next: AgentViewsState) => {
    setState(next);
    writeToStorage(next);
    // Notify all other hook instances mounted in the same tab
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }, []);

  // ── CRUD operations ───────────────────────────────────────

  const addView = useCallback(
    (view: AgentView) => {
      const current = readFromStorage();
      if (current.views.length >= MAX_VIEWS) {
        throw new Error(`Maximum ${MAX_VIEWS} views allowed`);
      }
      persist({
        views: [...current.views, view],
        activeViewId: view.id, // Auto-activate the new view
      });
    },
    [persist],
  );

  const updateView = useCallback(
    (
      id: string,
      partial: Partial<
        Pick<AgentView, "label" | "naturalLanguage" | "compiledQuery">
      >,
    ) => {
      const current = readFromStorage();
      const now = new Date().toISOString();
      persist({
        ...current,
        views: current.views.map((v) =>
          v.id === id ? { ...v, ...partial, updatedAt: now } : v,
        ),
      });
    },
    [persist],
  );

  const removeView = useCallback(
    (id: string) => {
      const current = readFromStorage();
      persist({
        views: current.views.filter((v) => v.id !== id),
        activeViewId: current.activeViewId === id ? null : current.activeViewId,
      });
    },
    [persist],
  );

  const setActiveViewId = useCallback(
    (id: string | null) => {
      const current = readFromStorage();
      persist({ ...current, activeViewId: id });
    },
    [persist],
  );

  // ── Derived state ─────────────────────────────────────────

  const activeView =
    state.views.find((v) => v.id === state.activeViewId) ?? null;

  return {
    /** All saved views. */
    views: state.views,
    /** ID of the active view (null = default). */
    activeViewId: state.activeViewId,
    /** The active view object, or null for default. */
    activeView,
    /** The compiled query to use, or null for the default system query. */
    activeQuery: activeView?.compiledQuery ?? null,
    /** Max views limit. */
    maxViews: MAX_VIEWS,
    /** Add a new view and auto-activate it. */
    addView,
    /** Update fields of an existing view. */
    updateView,
    /** Delete a view. Falls back to default if it was active. */
    removeView,
    /** Switch the active view. Pass null for default. */
    setActiveViewId,
  };
}
