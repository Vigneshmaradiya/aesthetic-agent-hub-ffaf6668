"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTemplateStore } from "@/stores/template-store";
import { useCanvasStore } from "@/stores/canvas-store";
import {
  searchTemplates,
  insertTemplate,
} from "@/lib/templates/template-registry";

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
  const templates = useTemplateStore((s) => s.templates);
  const setDraftResponse = useCanvasStore((s) => s.setDraftResponse);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => searchTemplates(templates, searchQuery),
    [templates, searchQuery],
  );

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tpl of filtered) {
      const existing = map.get(tpl.category) ?? [];
      existing.push(tpl);
      map.set(tpl.category, existing);
    }
    return map;
  }, [filtered]);

  const handleSelect = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        const content = insertTemplate(template);
        setDraftResponse(content);
        onClose();
      }
    },
    [templates, setDraftResponse, onClose],
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-lg border border-nexus-border bg-nexus-surface shadow-xl"
    >
      {/* Search input */}
      <div className="border-b border-nexus-border p-2">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full rounded-md border border-nexus-border bg-nexus-base px-3 py-1.5 text-sm text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent-dim focus:outline-none focus:ring-1 focus:ring-nexus-accent-dim"
        />
      </div>

      {/* Template list */}
      <div className="max-h-64 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-nexus-text-dim">
            No templates found
          </div>
        ) : (
          Array.from(grouped.entries()).map(([category, categoryTemplates]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
                {category}
              </div>
              {categoryTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl.id)}
                  className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-nexus-surface-raised"
                >
                  <span className="text-sm font-medium text-nexus-text">
                    {tpl.title}
                  </span>
                  <span className="line-clamp-2 text-xs text-nexus-text-muted">
                    {tpl.content}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-nexus-border px-3 py-1.5">
        <span className="text-[10px] text-nexus-text-dim">
          Press Escape to dismiss
        </span>
      </div>
    </div>
  );
}
