"use client";

import { useCallback, useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { RichTextEditor, getPlainText } from "@/components/ui/RichTextEditor";
import { triggerChatAction } from "@/lib/chat/trigger";

export function ResponseDraftSection() {
  const draftResponse = useCanvasStore((s) => s.draftResponse);
  const setDraftResponse = useCanvasStore((s) => s.setDraftResponse);
  const [copied, setCopied] = useState(false);

  const plainText = getPlainText(draftResponse);
  const count =
    plainText.trim().length === 0 ? 0 : plainText.trim().split(/\s+/).length;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [plainText]);

  const handleUpdate = useCallback(
    (html: string) => {
      setDraftResponse(html);
    },
    [setDraftResponse],
  );

  const handleSend = useCallback(() => {
    if (plainText.trim().length === 0) return;
    triggerChatAction(
      `Send the following response to the ticket:\n\n${plainText}`,
    );
  }, [plainText]);

  return (
    <CanvasSection sectionId="response-draft" title="Response Draft">
      <div className="flex flex-col gap-2 px-4 pb-4">
        <RichTextEditor
          initialContent={draftResponse}
          placeholder="Draft your response here..."
          onUpdate={handleUpdate}
        />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-nexus-text-dim">
            {count} {count === 1 ? "word" : "words"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={plainText.trim().length === 0}
              className="rounded-md border border-nexus-border px-3 py-1 text-xs font-medium text-nexus-text transition-colors hover:bg-nexus-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleSend}
              disabled={plainText.trim().length === 0}
              title="Send to ticket (requires Human-in-the-Loop approval if enabled)"
              className="rounded-md bg-nexus-accent px-3 py-1 text-xs font-medium text-nexus-base transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send to Ticket
            </button>
          </div>
        </div>
      </div>
    </CanvasSection>
  );
}
