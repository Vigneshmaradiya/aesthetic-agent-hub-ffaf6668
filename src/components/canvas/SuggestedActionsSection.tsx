"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { ActionButton } from "./ActionButton";

export function SuggestedActionsSection() {
  const actions = useCanvasStore((s) => s.suggestedActions);

  if (actions.length === 0) return null;

  return (
    <CanvasSection sectionId="suggested-actions" title="Suggested Actions">
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        {actions.map((action) => (
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
    </CanvasSection>
  );
}
