"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ActionButton } from "./ActionButton";

export function ServiceRequestModule() {
  const data = useCanvasStore((s) => s.serviceRequestSummary);
  const suggestedActions = useCanvasStore((s) => s.suggestedActions);

  // Show with either dedicated data or existing suggested actions
  if (!data && suggestedActions.length === 0) return null;

  return (
    <CanvasSection sectionId="suggested-actions" title="Service Request">
      <div className="space-y-3 px-4 pb-4">
        {/* Request summary */}
        {data && (
          <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-nexus-success/15 px-2 py-0.5 text-[10px] font-medium text-nexus-success">
                {data.requestType}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-nexus-text-muted">
              {data.summary}
            </p>
          </div>
        )}

        {/* Suggested actions from AI enrichment */}
        {suggestedActions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-nexus-text-dim">
              Suggested Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action) => (
                <ActionButton
                  key={action.id}
                  label={action.label}
                  mcpTool={action.mcpTool}
                  mcpArgs={action.mcpArgs}
                  chatPrompt={action.chatPrompt}
                  variant="secondary"
                />
              ))}
            </div>
          </div>
        )}

        {/* Primary action */}
        {data?.suggestedAction && (
          <ActionButton
            label={data.suggestedAction.label}
            mcpTool={data.suggestedAction.mcpTool}
            mcpArgs={data.suggestedAction.mcpArgs}
            chatPrompt={data.suggestedAction.chatPrompt}
            variant={data.suggestedAction.variant}
            requiresHitl={data.suggestedAction.requiresHitl}
          />
        )}

        {/* Default action if no dedicated data */}
        {!data && (
          <ActionButton
            label="Acknowledge Request"
            chatPrompt="Draft an acknowledgment reply confirming receipt of this service request and outlining the next steps."
            variant="primary"
          />
        )}
      </div>
    </CanvasSection>
  );
}
