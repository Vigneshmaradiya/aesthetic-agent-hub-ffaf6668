"use client";

import { useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { triggerChatAction } from "@/lib/chat/trigger";
import type { CommunicationType, CommunicationTone } from "@/types/canvas";

const typeLabels: Record<CommunicationType, string> = {
  customer_reply: "Customer Reply",
  internal_note: "Internal Note",
  escalation_message: "Escalation",
};

const toneStyles: Record<CommunicationTone, { color: string; label: string }> =
  {
    empathetic: { color: "bg-blue-500/15 text-blue-400", label: "Empathetic" },
    technical: {
      color: "bg-nexus-surface-raised text-nexus-text-dim",
      label: "Technical",
    },
    escalation: {
      color: "bg-orange-500/15 text-orange-400",
      label: "Escalation",
    },
  };

export function CustomerCommunicationSection() {
  const templates = useCanvasStore((s) => s.communicationTemplates);
  const setDraftResponse = useCanvasStore((s) => s.setDraftResponse);
  const [selectedType, setSelectedType] = useState<CommunicationType | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  if (templates.length === 0) return null;

  // Get unique types present
  const availableTypes = Array.from(new Set(templates.map((t) => t.type)));

  // Auto-select first available type if none selected
  const activeType =
    selectedType && availableTypes.includes(selectedType)
      ? selectedType
      : availableTypes[0];

  const activeTemplate = templates.find((t) => t.type === activeType);

  if (!activeTemplate) return null;

  const tone = toneStyles[activeTemplate.tone];

  function handleCopy() {
    if (activeTemplate) {
      navigator.clipboard.writeText(activeTemplate.body).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <CanvasSection
      sectionId="customer-communication"
      title="Customer Communication"
      badge={
        <span className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim">
          {templates.length} templates
        </span>
      }
    >
      <div className="space-y-3 px-4 pb-4">
        {/* Tab-like buttons */}
        {availableTypes.length > 1 && (
          <div className="flex gap-1">
            {availableTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  type === activeType
                    ? "bg-nexus-accent/20 text-nexus-accent"
                    : "bg-nexus-surface-raised text-nexus-text-dim hover:text-nexus-text-muted"
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
        )}

        {/* Tone badge */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.color}`}
          >
            {tone.label}
          </span>
          {activeTemplate.subject && (
            <span className="text-[10px] text-nexus-text-dim">
              Subject: {activeTemplate.subject}
            </span>
          )}
        </div>

        {/* Template body */}
        <div className="rounded-md border border-nexus-border bg-nexus-surface-raised/50 p-3">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-nexus-text">
            {activeTemplate.body}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="rounded-md border border-nexus-border bg-nexus-surface-raised px-3 py-1.5 text-xs font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent hover:text-nexus-accent"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => setDraftResponse(activeTemplate.body)}
            className="rounded-md border border-nexus-border bg-nexus-surface-raised px-3 py-1.5 text-xs font-medium text-nexus-text-muted transition-colors hover:border-nexus-accent hover:text-nexus-accent"
          >
            Edit in Draft
          </button>
          <button
            onClick={() =>
              triggerChatAction(
                `Send the ${typeLabels[activeType].toLowerCase()} for the current ticket.`,
              )
            }
            className="rounded-md bg-nexus-accent px-3 py-1.5 text-xs font-medium text-nexus-base transition-colors hover:opacity-90"
          >
            Send
          </button>
        </div>
      </div>
    </CanvasSection>
  );
}
