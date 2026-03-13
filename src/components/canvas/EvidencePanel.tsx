"use client";

import { ConfidenceBadge } from "./ConfidenceBadge";
import type { EvidenceSourceType } from "@/types/canvas";

interface EvidenceItem {
  type: EvidenceSourceType;
  title: string;
  id: string;
  url?: string;
}

interface EvidencePanelProps {
  recommendation: string;
  confidence: number;
  evidence: EvidenceItem[];
}

const TYPE_ICONS: Record<EvidenceSourceType, string> = {
  ticket: "\u{1F3AB}",
  kb: "\u{1F4D6}",
  slack: "\u{1F4AC}",
  jira: "\u{1F41B}",
  incident: "\u{1F6A8}",
};

export function EvidencePanel({
  recommendation,
  confidence,
  evidence,
}: EvidencePanelProps) {
  return (
    <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-3">
      {/* Recommendation + confidence */}
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs leading-relaxed text-nexus-text">
          {recommendation}
        </p>
        <ConfidenceBadge score={confidence} />
      </div>

      {/* Evidence list */}
      {evidence.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-nexus-text-dim">
            Evidence
          </p>
          {evidence.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span className="text-[10px]">
                {TYPE_ICONS[item.type] ?? "\u{1F4CE}"}
              </span>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-[10px] text-nexus-accent hover:underline"
                >
                  {item.title || item.id}
                </a>
              ) : (
                <span className="truncate text-[10px] text-nexus-text-muted">
                  {item.title || item.id}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
