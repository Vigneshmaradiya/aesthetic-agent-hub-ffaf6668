"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { TroubleshootingToolsSection } from "./TroubleshootingToolsSection";
import { RootCauseSection } from "./RootCauseSection";
import { DiagnosticsSection } from "./DiagnosticsSection";
import { ActionButton } from "./ActionButton";
import { fetchExperts } from "@/lib/chat/canvas-bridge";

/**
 * SwarmPrompt: Appears when confidence is low + priority is high.
 * Prompts the engineer to consider swarming for expert help.
 */
function SwarmPrompt() {
  const ticketId = useCanvasStore((s) => s.activeTicketId);
  const activateSwarming = useCanvasStore((s) => s.activateSwarming);

  function handleActivate() {
    activateSwarming();
    if (ticketId) {
      fetchExperts(ticketId);
    }
  }

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">{"\u{1F9E0}"}</span>
        <p className="flex-1 text-xs font-medium text-amber-400">
          Consider swarming
        </p>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-nexus-text-muted">
        Confidence is low and this is a high-priority ticket. Consider bringing
        in subject matter experts to help resolve this faster.
      </p>
      <div className="mt-2">
        <button
          onClick={handleActivate}
          className="rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
        >
          Find Experts
        </button>
      </div>
    </div>
  );
}

export function TroubleshootingModule() {
  const rootCauseSignals = useCanvasStore((s) => s.rootCauseSignals);
  const ticketIntelligence = useCanvasStore((s) => s.ticketIntelligence);
  const swarmingActive = useCanvasStore(
    (s) => s.resolutionWorkflow.swarmingActive,
  );

  // Show swarm prompt when confidence is low + priority is high/urgent
  const shouldShowSwarmPrompt =
    !swarmingActive &&
    rootCauseSignals.length > 0 &&
    rootCauseSignals[0].confidence < 0.5 &&
    (ticketIntelligence?.priority === "high" ||
      ticketIntelligence?.priority === "urgent");

  return (
    <div className="space-y-3">
      <TroubleshootingToolsSection />
      <RootCauseSection />
      <DiagnosticsSection />
      {shouldShowSwarmPrompt && <SwarmPrompt />}
      {!rootCauseSignals.length && (
        <div className="px-1">
          <ActionButton
            label="Start Root Cause Analysis"
            chatPrompt="Perform a root cause analysis for this ticket. Check logs, diagnostics, and similar cases to identify the underlying issue."
            variant="primary"
          />
        </div>
      )}
    </div>
  );
}
