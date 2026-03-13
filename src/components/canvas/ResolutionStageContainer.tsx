"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { SelfServiceModule } from "./SelfServiceModule";
import { ServiceRequestModule } from "./ServiceRequestModule";
import { KnownIssueModule } from "./KnownIssueModule";
import { TroubleshootingModule } from "./TroubleshootingModule";
import { ExpertSwarmingSection } from "./ExpertSwarmingSection";
import type { ResolutionModule } from "@/types/canvas";

const MODULE_LABELS: Record<ResolutionModule, { label: string; icon: string }> =
  {
    "self-service": { label: "Self-Service", icon: "\u{1F4D6}" },
    "service-request": { label: "Service Request", icon: "\u{1F4CB}" },
    "known-issue": { label: "Known Issue", icon: "\u{1F41B}" },
    troubleshooting: { label: "Troubleshooting", icon: "\u{1F50D}" },
    swarming: { label: "Expert Swarming", icon: "\u{1F9E0}" },
  };

function ModuleHeader({ module }: { module: ResolutionModule }) {
  const meta = MODULE_LABELS[module];
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="text-sm">{meta.icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
        Resolution Path: {meta.label}
      </span>
    </div>
  );
}

export function ResolutionStageContainer() {
  const activeModule = useCanvasStore((s) => s.resolutionWorkflow.activeModule);
  const swarmingActive = useCanvasStore(
    (s) => s.resolutionWorkflow.swarmingActive,
  );

  if (!activeModule) return null;

  return (
    <div className="space-y-3">
      {/* Module header showing which resolution path */}
      <ModuleHeader module={activeModule} />

      {/* Render the appropriate module */}
      {activeModule === "self-service" && <SelfServiceModule />}
      {activeModule === "service-request" && <ServiceRequestModule />}
      {activeModule === "known-issue" && <KnownIssueModule />}
      {activeModule === "troubleshooting" && <TroubleshootingModule />}

      {/* Swarming overlays on troubleshooting when activated */}
      {swarmingActive && <ExpertSwarmingSection />}
    </div>
  );
}
