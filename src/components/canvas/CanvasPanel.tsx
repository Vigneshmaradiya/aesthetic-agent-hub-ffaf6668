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
      <div className="animate-fade-in text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-nexus-border bg-nexus-surface" style={{ boxShadow: 'var(--nexus-shadow-accent)' }}>
          <span className="text-xl">📋</span>
        </div>
        <p className="text-sm font-medium text-nexus-text-muted">
          Load a ticket to start the resolution workflow
        </p>
        <p className="mt-2 text-xs text-nexus-text-dim">
          Nexus will guide you through intake, classification, resolution, and capture
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <kbd className="rounded-md border border-nexus-border bg-nexus-surface-raised px-2 py-1 font-mono text-[10px] text-nexus-text-dim">
            ⌘K
          </kbd>
          <span className="text-xs text-nexus-text-dim">for commands</span>
          <span className="text-nexus-text-dim">·</span>
          <kbd className="rounded-md border border-nexus-border bg-nexus-surface-raised px-2 py-1 font-mono text-[10px] text-nexus-text-dim">
            /readiness
          </kbd>
          <span className="text-xs text-nexus-text-dim">to check completeness</span>
        </div>
      </div>
    </div>
  );
}

// ─── Section Loading Skeleton ────────────────────────────────────────────

function SectionLoadingSkeleton({ sectionId }: { sectionId: CanvasSectionId }) {
  const title = SECTION_DISPLAY_NAMES[sectionId] ?? "Section";
  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface">
      <div className="px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
          {title}
        </span>
      </div>
      <div className="space-y-3 px-4 pb-4">
        {[75, 50, 85, 100, 66].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded bg-nexus-border/50"
            style={{
              width: `${w}%`,
              animation: "shimmer 2s linear infinite",
              background: "linear-gradient(90deg, rgb(var(--nexus-border) / 0.3) 25%, rgb(var(--nexus-border) / 0.5) 50%, rgb(var(--nexus-border) / 0.3) 75%)",
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Focused Section Renderer ────────────────────────────────────────────

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
    case "root-cause":
    case "expert-swarming":
    case "suggested-actions":
    case "resolution-summary":
      return <ResolutionStageContainer />;
    default:
      return null;
  }
}

function FocusedSectionRenderer({ sectionId }: { sectionId: CanvasSectionId }) {
  const section = useCanvasStore((s) => s.sections[sectionId]);
  const content = sectionComponent(sectionId);

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
      <div className="glass-header flex items-center justify-between border-b border-nexus-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-nexus-accent/10">
            <span className="text-xs text-nexus-accent">📊</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
            Resolution Canvas
          </span>
        </div>
      </div>

      {/* Always-visible progress bar */}
      {(hasAnyData || hasVisibleSections) && (
        <div className="border-b border-nexus-border bg-nexus-surface px-4 py-2.5">
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

      {/* Communication Dock */}
      <CommunicationDock />
    </div>
  );
}
