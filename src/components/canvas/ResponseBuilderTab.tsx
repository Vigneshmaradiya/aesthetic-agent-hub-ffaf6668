"use client";

import { useCallback, useState } from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { RichTextEditor, getPlainText } from "@/components/ui/RichTextEditor";

export function ResponseBuilderTab() {
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

  return (
    <div
      role="tabpanel"
      id="canvas-tabpanel-response"
      aria-labelledby="canvas-tab-response"
      className="flex flex-1 flex-col overflow-hidden p-4"
    >
      {/* Rich Text Editor */}
      <RichTextEditor
        initialContent={draftResponse}
        placeholder="Draft your response here..."
        onUpdate={handleUpdate}
      />

      {/* Footer bar */}
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="text-xs text-nexus-text-dim">
          {count} {count === 1 ? "word" : "words"}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={plainText.trim().length === 0}
            className="rounded-md border border-nexus-border px-3 py-1 text-xs font-medium text-nexus-text transition-colors hover:bg-nexus-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            disabled
            title="Requires Human-in-the-Loop approval"
            className="rounded-md bg-nexus-accent/20 px-3 py-1 text-xs font-medium text-nexus-accent-dim transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send to Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
