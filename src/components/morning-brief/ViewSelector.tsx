"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAgentViews } from "@/hooks/useAgentViews";

interface ViewSelectorProps {
  /** Called when the user wants to create a new view. */
  onCreateNew: () => void;
}

export function ViewSelector({ onCreateNew }: ViewSelectorProps) {
  const { views, activeView, setActiveViewId, removeView } = useAgentViews();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (id: string | null) => {
      setActiveViewId(id);
      setOpen(false);
    },
    [setActiveViewId],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      removeView(id);
    },
    [removeView],
  );

  const activeLabel = activeView?.label ?? "Default Queue";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-nexus-border px-2.5 py-1 text-xs text-nexus-text-muted transition-colors hover:border-nexus-accent/40 hover:text-nexus-text"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2 4h12M2 8h12M2 12h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="max-w-[120px] truncate">{activeLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-nexus-border bg-nexus-surface shadow-lg"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {/* Default option */}
            <button
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-nexus-surface-raised ${
                !activeView
                  ? "font-medium text-nexus-accent"
                  : "text-nexus-text-muted"
              }`}
              role="option"
              aria-selected={!activeView}
            >
              {!activeView && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {activeView && <span className="w-[10px]" />}
              Default Queue
            </button>

            {/* Saved views */}
            {views.length > 0 && (
              <>
                <div className="mx-3 border-t border-nexus-border-subtle" />
                {views.map((view) => (
                  <div key={view.id} className="group flex items-center">
                    <button
                      onClick={() => handleSelect(view.id)}
                      className={`flex flex-1 items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-nexus-surface-raised ${
                        activeView?.id === view.id
                          ? "font-medium text-nexus-accent"
                          : "text-nexus-text-muted"
                      }`}
                      role="option"
                      aria-selected={activeView?.id === view.id}
                    >
                      {activeView?.id === view.id ? (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8l3.5 3.5L13 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="w-[10px]" />
                      )}
                      <span className="truncate">{view.label}</span>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, view.id)}
                      className="mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-nexus-error/10 hover:text-nexus-error group-hover:opacity-100"
                      aria-label={`Delete ${view.label}`}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 4L4 12M4 4l8 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* New view */}
            <div className="mx-3 border-t border-nexus-border-subtle" />
            <button
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-nexus-accent transition-colors hover:bg-nexus-surface-raised"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              New View…
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
