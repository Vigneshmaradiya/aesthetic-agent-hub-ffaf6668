"use client";

import {
  useCanvasStore,
  SECTION_DISPLAY_NAMES,
  CONTEXT_TAB_SECTIONS,
} from "@/stores/canvas-store";
import type { CanvasSectionId } from "@/types/canvas";

/**
 * Horizontal chip bar showing all data-bearing canvas sections.
 * The currently focused section is highlighted; clicking a chip switches focus.
 * A trailing 💬 chip toggles the Communication Dock.
 */
export function SectionNavBar() {
  const sections = useCanvasStore((s) => s.sections);
  const focusedSection = useCanvasStore((s) => s.focusedSection);
  const setFocusedSection = useCanvasStore((s) => s.setFocusedSection);
  const suggestedDraft = useCanvasStore((s) => s.suggestedDraft);
  const commExpanded = useCanvasStore((s) => s.communicationDockExpanded);
  const setCommExpanded = useCanvasStore((s) => s.setCommunicationDockExpanded);

  // Build list of chips: only sections that have data or are visible (loading)
  const chips: CanvasSectionId[] = CONTEXT_TAB_SECTIONS.filter((id) => {
    const s = sections[id];
    return s && (s.lastUpdated !== null || s.visible);
  });

  // Also include module-specific sections not in CONTEXT_TAB_SECTIONS
  for (const id of [
    "resolution-summary",
    "knowledge-capture",
  ] as CanvasSectionId[]) {
    if (
      !chips.includes(id) &&
      sections[id] &&
      (sections[id].lastUpdated !== null || sections[id].visible)
    ) {
      chips.push(id);
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-nexus-border bg-nexus-surface px-3 py-2">
      {chips.map((id) => {
        const isFocused = id === focusedSection;
        const label = SECTION_DISPLAY_NAMES[id] ?? id;
        return (
          <button
            key={id}
            onClick={() => setFocusedSection(id)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              isFocused
                ? "bg-nexus-accent/20 text-nexus-accent ring-1 ring-nexus-accent/30"
                : "bg-nexus-surface-raised/60 text-nexus-text-muted hover:bg-nexus-surface-raised hover:text-nexus-text"
            }`}
          >
            {label}
          </button>
        );
      })}

      {/* Communication toggle chip */}
      <button
        onClick={() => setCommExpanded(!commExpanded)}
        className={`ml-auto shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
          commExpanded
            ? "bg-nexus-accent/20 text-nexus-accent ring-1 ring-nexus-accent/30"
            : "bg-nexus-surface-raised/60 text-nexus-text-muted hover:bg-nexus-surface-raised hover:text-nexus-text"
        }`}
      >
        {"\u{1F4AC}"} {suggestedDraft ? "Draft" : "Comm"}
      </button>
    </div>
  );
}
