"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAgentViews } from "@/hooks/useAgentViews";
import type { AgentView, CompileViewResponse } from "@/types/agent-views";

type EditorState = "idle" | "compiling" | "preview" | "error";

interface ViewEditorProps {
  /** Called after the view is saved. */
  onSave: () => void;
  /** Called when the user cancels editing. */
  onCancel: () => void;
  /** If provided, editing an existing view instead of creating a new one. */
  existingView?: AgentView;
}

export function ViewEditor({
  onSave,
  onCancel,
  existingView,
}: ViewEditorProps) {
  const { addView, updateView, views, maxViews } = useAgentViews();

  const [instruction, setInstruction] = useState(
    existingView?.naturalLanguage ?? "",
  );
  const [editorState, setEditorState] = useState<EditorState>("idle");
  const [compiledQuery, setCompiledQuery] = useState("");
  const [label, setLabel] = useState(existingView?.label ?? "");
  const [explanation, setExplanation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isAtLimit = !existingView && views.length >= maxViews;

  async function handleCompile() {
    if (!instruction.trim() || instruction.trim().length < 3) return;

    setEditorState("compiling");
    setErrorMessage("");

    try {
      const res = await fetch("/api/views/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalLanguage: instruction.trim() }),
      });

      const data = (await res.json()) as CompileViewResponse & {
        error?: string;
        message?: string;
      };

      if (!res.ok || data.error) {
        setEditorState("error");
        setErrorMessage(
          data.message ?? data.error ?? "Failed to compile view.",
        );
        return;
      }

      setCompiledQuery(data.compiledQuery);
      setLabel(data.label || "Custom View");
      setExplanation(data.explanation ?? "");
      setEditorState("preview");
    } catch {
      setEditorState("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  function handleSave() {
    if (!compiledQuery) return;

    const now = new Date().toISOString();

    if (existingView) {
      updateView(existingView.id, {
        label,
        naturalLanguage: instruction.trim(),
        compiledQuery,
      });
    } else {
      const view: AgentView = {
        id: crypto.randomUUID(),
        label,
        naturalLanguage: instruction.trim(),
        compiledQuery,
        provider: "zendesk",
        createdAt: now,
        updatedAt: now,
      };
      addView(view);
    }

    onSave();
  }

  return (
    <motion.div
      className="mb-4 rounded-lg border border-nexus-accent/20 bg-nexus-accent/5 p-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <p className="mb-3 text-xs font-medium text-nexus-accent">
        {existingView ? "Edit View" : "New Custom View"}
      </p>

      {/* At limit warning */}
      {isAtLimit && (
        <div className="mb-3 rounded-md border border-nexus-warning/30 bg-nexus-warning/5 px-3 py-2">
          <p className="text-xs text-nexus-warning">
            Maximum {maxViews} views reached. Delete an existing view to create
            a new one.
          </p>
        </div>
      )}

      {/* Instruction input */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isAtLimit) void handleCompile();
          }}
          placeholder="e.g., Show only high-priority tickets updated this week"
          disabled={editorState === "compiling" || isAtLimit}
          className="flex-1 rounded-md border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-text placeholder:text-nexus-text-dim focus:border-nexus-accent focus:outline-none focus:ring-1 focus:ring-nexus-accent/30 disabled:opacity-50"
          autoFocus
        />
        <button
          onClick={() => void handleCompile()}
          disabled={
            !instruction.trim() ||
            instruction.trim().length < 3 ||
            editorState === "compiling" ||
            isAtLimit
          }
          className="rounded-md bg-nexus-accent px-4 py-2 text-sm font-medium text-nexus-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editorState === "compiling" ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="28"
                  strokeDashoffset="8"
                  strokeLinecap="round"
                />
              </svg>
              Compiling…
            </span>
          ) : (
            "Compile"
          )}
        </button>
      </div>

      {/* Preview state */}
      {editorState === "preview" && (
        <div className="space-y-3">
          {/* Compiled query display */}
          <div className="rounded-md border border-nexus-border bg-nexus-surface p-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-nexus-text-dim">
              Zendesk Query
            </p>
            <code className="block text-xs text-nexus-accent">
              {compiledQuery}
            </code>
            {explanation && (
              <p className="mt-2 text-xs text-nexus-text-muted">
                {explanation}
              </p>
            )}
          </div>

          {/* Editable label */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-nexus-text-dim">
              View Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-nexus-border bg-nexus-surface px-3 py-1.5 text-sm text-nexus-text focus:border-nexus-accent focus:outline-none focus:ring-1 focus:ring-nexus-accent/30"
              maxLength={50}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-xs text-nexus-text-muted transition-colors hover:text-nexus-text"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setEditorState("idle");
                setCompiledQuery("");
              }}
              className="rounded-md border border-nexus-border px-3 py-1.5 text-xs text-nexus-text-muted transition-colors hover:text-nexus-text"
            >
              Re-compile
            </button>
            <button
              onClick={handleSave}
              disabled={!label.trim() || !compiledQuery}
              className="rounded-md bg-nexus-accent px-4 py-1.5 text-xs font-medium text-nexus-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {existingView ? "Update View" : "Save View"}
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {editorState === "error" && (
        <div className="space-y-2">
          <div className="rounded-md border border-nexus-error/30 bg-nexus-error/5 px-3 py-2">
            <p className="text-xs text-nexus-error">{errorMessage}</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-xs text-nexus-text-muted transition-colors hover:text-nexus-text"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleCompile()}
              className="rounded-md border border-nexus-border px-3 py-1.5 text-xs text-nexus-text-muted transition-colors hover:text-nexus-text"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Idle cancel */}
      {editorState === "idle" && (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-nexus-text-muted transition-colors hover:text-nexus-text"
          >
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}
