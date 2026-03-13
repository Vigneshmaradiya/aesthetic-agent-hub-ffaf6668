"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore, SECTION_DISPLAY_NAMES } from "@/stores/canvas-store";
import type { CanvasSectionId } from "@/types/canvas";
import { WorkflowProgressBar } from "./WorkflowProgressBar";
import { SectionNavBar } from "./SectionNavBar";
import { ResolutionInsightsSection } from "./ResolutionInsightsSection";
import { TicketReadinessSection } from "./TicketReadinessSection";
import { NextBestActionSection } from "./NextBestActionSection";
import { TicketIntelligenceSection } from "./TicketIntelligenceSection";
import { IntelSection } from "./IntelSection";
import { CustomerIntelSection } from "./CustomerIntelSection";
import { CaseClassificationSection } from "./CaseClassificationSection";
import { SimilarCasesSection } from "./SimilarCasesSection";
import { ResolutionStageContainer } from "./ResolutionStageContainer";
import { IncidentDetectionSection } from "./IncidentDetectionSection";
import { KnowledgeCaptureSection } from "./KnowledgeCaptureSection";
import { TimelineSection } from "./TimelineSection";
import { InvestigationSection } from "./InvestigationSection";
import { CommunicationDock } from "./CommunicationDock";

// ─── Empty State ─────────────────────────────────────────────────────────

function EmptyCanvasState() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm text-nexus-text-dim">
          Load a ticket to start the resolution workflow
        </p>
        <p className="mt-1 text-xs text-nexus-text-dim">
          Nexus will guide you through intake, classification, resolution, and
          capture
        </p>
        <p className="mt-2 text-xs text-nexus-text-dim">
          Press{" "}
          <kbd className="rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px]">
            {"\u2318"}K
          </kbd>{" "}
          for commands or type{" "}
          <kbd className="rounded bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[10px]">
            /readiness
          </kbd>{" "}
          to check ticket completeness
        </p>
      </div>
    </div>
  );
}

// ─── Section Loading Skeleton ────────────────────────────────────────────

/** Generic loading skeleton shown when focused section has no data yet. */
function SectionLoadingSkeleton({ sectionId }: { sectionId: CanvasSectionId }) {
  const title = SECTION_DISPLAY_NAMES[sectionId] ?? "Section";
  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-surface">
      <div className="px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
          {title}
        </span>
      </div>
      <div className="animate-pulse space-y-3 px-4 pb-4">
        <div className="h-3 w-3/4 rounded bg-nexus-border" />
        <div className="h-3 w-1/2 rounded bg-nexus-border" />
        <div className="h-3 w-5/6 rounded bg-nexus-border" />
        <div className="h-8 w-full rounded bg-nexus-border/60" />
        <div className="h-3 w-2/3 rounded bg-nexus-border" />
      </div>
    </div>
  );
}

// ─── Focused Section Renderer ────────────────────────────────────────────

/** Maps a focused section ID to its React component. */
function sectionComponent(sectionId: CanvasSectionId): React.ReactNode {
  switch (sectionId) {
    case "ticket-intelligence":
      return <IntelSection />;
    case "customer-intelligence":
      return <CustomerIntelSection />;
    case "ticket-readiness":
      return <TicketReadinessSection />;
    case "case-classification":
      return <CaseClassificationSection />;
    case "resolution-insights":
      return <ResolutionInsightsSection />;
    case "next-best-action":
      return <NextBestActionSection />;
    case "similar-cases":
      return <SimilarCasesSection />;
    case "incident-detection":
      return <IncidentDetectionSection />;
    case "ticket-timeline":
      return <TimelineSection />;
    case "knowledge-capture":
      return <KnowledgeCaptureSection />;
    case "troubleshooting-tools":
    case "diagnostics":
      return <InvestigationSection />;
    // Resolution module sections render the full container
    case "root-cause":
    case "expert-swarming":
    case "suggested-actions":
    case "resolution-summary":
      return <ResolutionStageContainer />;
    default:
      return null;
  }
}

/**
 * Renders the focused section, or a loading skeleton if the section
 * component returned null (data not yet loaded).
 */
function FocusedSectionRenderer({ sectionId }: { sectionId: CanvasSectionId }) {
  const section = useCanvasStore((s) => s.sections[sectionId]);
  const content = sectionComponent(sectionId);

  // If the section component has no data yet, show a loading skeleton
  if (!content && section?.lastUpdated === null) {
    return <SectionLoadingSkeleton sectionId={sectionId} />;
  }

  return content;
}

// ─── Canvas Panel ────────────────────────────────────────────────────────

export function CanvasPanel() {
  const sections = useCanvasStore((s) => s.sections);
  const focusedSection = useCanvasStore((s) => s.focusedSection);

  const hasAnyData = Object.values(sections).some(
    (s) => s.lastUpdated !== null,
  );
  const hasVisibleSections = Object.values(sections).some((s) => s.visible);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Canvas header */}
      <div className="flex items-center justify-between border-b border-nexus-border bg-nexus-surface px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-dim">
          Resolution Canvas
        </span>
      </div>

      {/* Always-visible progress bar */}
      {(hasAnyData || hasVisibleSections) && (
        <div className="border-b border-nexus-border bg-nexus-surface px-4 py-2">
          <WorkflowProgressBar />
        </div>
      )}

      {/* Section navigation chip bar */}
      {(hasAnyData || hasVisibleSections) && <SectionNavBar />}

      {/* Focused section (full remaining height) */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {focusedSection ? (
            <motion.div
              key={focusedSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <FocusedSectionRenderer sectionId={focusedSection} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Empty state when no ticket is loaded */}
        {!focusedSection && !hasAnyData && <EmptyCanvasState />}
      </div>

      {/* Communication Dock (persistent, outside scroll area) */}
      <CommunicationDock />
    </div>
  );
}
