"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CanvasSectionId } from "@/types/canvas";
import { useCanvasStore } from "@/stores/canvas-store";

interface CanvasSectionProps {
  sectionId: CanvasSectionId;
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function SectionSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[75, 50, 85].map((w, i) => (
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
  );
}

export function CanvasSection({
  sectionId,
  title,
  icon,
  badge,
  children,
}: CanvasSectionProps) {
  const section = useCanvasStore((s) => s.sections[sectionId]);
  const toggleSection = useCanvasStore((s) => s.toggleSection);

  return (
    <div
      id={`canvas-section-${sectionId}`}
      className="glow-border rounded-xl border border-nexus-border bg-nexus-surface transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)" }}
    >
      {/* Header */}
      <button
        onClick={() => toggleSection(sectionId)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-nexus-surface-raised/50"
      >
        {icon && <span className="shrink-0 text-nexus-accent/70">{icon}</span>}
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
          {title}
        </span>
        {badge}
        <svg
          className={`h-4 w-4 shrink-0 text-nexus-text-dim transition-transform duration-200 ${
            section.collapsed ? "-rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!section.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {section.loading ? (
              <SectionSkeleton />
            ) : section.error ? (
              <div className="px-4 pb-3">
                <div className="rounded-lg border border-nexus-error/20 bg-nexus-error/5 px-3 py-2">
                  <p className="text-xs text-nexus-error">{section.error}</p>
                </div>
              </div>
            ) : (
              children
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
