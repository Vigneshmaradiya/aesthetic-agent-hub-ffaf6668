"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { triggerChatAction } from "@/lib/chat/trigger";
import type { ExpertAvailability } from "@/types/canvas";

const availabilityStyles: Record<
  ExpertAvailability,
  { dot: string; label: string }
> = {
  available: { dot: "bg-nexus-success", label: "Available" },
  busy: { dot: "bg-nexus-warning", label: "Busy" },
  offline: { dot: "bg-red-400", label: "Offline" },
};

export function ExpertSwarmingSection() {
  const data = useCanvasStore((s) => s.expertSwarming);

  if (!data) return null;

  return (
    <CanvasSection
      sectionId="expert-swarming"
      title="Expert Swarming"
      badge={
        <span className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
          {data.suggestedExperts.length} experts
        </span>
      }
    >
      <div className="space-y-3 px-4 pb-4">
        {/* Expert cards */}
        <div className="space-y-2">
          {data.suggestedExperts.map((expert) => {
            const avail = availabilityStyles[expert.availability];
            return (
              <div
                key={expert.name}
                className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-2.5"
              >
                {/* Name + Availability */}
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${avail.dot}`}
                    title={avail.label}
                  />
                  <span className="flex-1 text-xs font-medium text-nexus-text">
                    {expert.name}
                  </span>
                  <span className="rounded bg-nexus-surface-raised px-1.5 py-0.5 text-[10px] text-nexus-text-dim">
                    Resolved {expert.resolvedSimilar} similar
                  </span>
                </div>

                {/* Expertise tags */}
                {expert.expertise.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {expert.expertise.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-nexus-accent/10 px-2 py-0.5 text-[10px] text-nexus-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Invite button */}
                <div className="mt-2">
                  <button
                    onClick={() =>
                      triggerChatAction(
                        `Invite ${expert.name}${expert.slackHandle ? ` (@${expert.slackHandle})` : ""} to swarm on this ticket via Slack.`,
                      )
                    }
                    className="rounded-md border border-nexus-border bg-nexus-surface-raised px-2.5 py-1 text-[10px] font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent hover:text-nexus-accent"
                  >
                    Invite to Swarm
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reasoning */}
        <p className="text-xs leading-relaxed text-nexus-text-muted">
          {data.reasoning}
        </p>

        {/* Slack channel suggestion */}
        {data.slackChannelSuggestion && (
          <p className="text-[10px] text-nexus-text-dim">
            Suggested channel:{" "}
            <span className="font-mono text-nexus-accent">
              #{data.slackChannelSuggestion}
            </span>
          </p>
        )}
      </div>
    </CanvasSection>
  );
}
