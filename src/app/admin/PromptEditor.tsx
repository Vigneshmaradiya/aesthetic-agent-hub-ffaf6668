"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { PromptEntry, PromptVersion } from "@/lib/prompts/prompt-registry";

interface Props {
  initialPrompts: PromptEntry[];
}

export default function PromptEditor({ initialPrompts }: Props) {
  const [prompts, setPrompts] = useState<PromptEntry[]>(initialPrompts);
  const [selectedKey, setSelectedKey] = useState<string>(
    initialPrompts[0]?.key ?? "",
  );
  const [editContent, setEditContent] = useState<string>(
    initialPrompts[0]?.content ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [confirmDeleteVersion, setConfirmDeleteVersion] = useState<PromptVersion | null>(null);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const selected = prompts.find((p) => p.key === selectedKey);
  const isDirty = selected ? editContent !== selected.content : false;
  const isDefault = selected ? editContent === selected.defaultContent : true;

  const selectPrompt = useCallback(
    (key: string) => {
      const p = prompts.find((x) => x.key === key);
      if (!p) return;
      setSelectedKey(key);
      setEditContent(p.content);
      setStatus(null);
    },
    [prompts],
  );

  // ── Live save ────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selected.key, content: editContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Save failed");
      }
      setPrompts((prev) =>
        prev.map((p) =>
          p.key === selected.key
            ? { ...p, content: editContent, activeVersionId: null }
            : p,
        ),
      );
      setStatus({ type: "success", message: "Changes saved." });
    } catch (e) {
      setStatus({
        type: "error",
        message: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Reset to default ─────────────────────────────────────────────────────────

  const reset = async () => {
    if (!selected) return;
    setResetting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selected.key, reset: true }),
      });
      if (!res.ok) throw new Error("Reset failed");
      const defaultContent = selected.defaultContent;
      setPrompts((prev) =>
        prev.map((p) =>
          p.key === selected.key
            ? { ...p, content: defaultContent, activeVersionId: null }
            : p,
        ),
      );
      setEditContent(defaultContent);
      setStatus({ type: "success", message: "Prompt reset to default." });
    } catch (e) {
      setStatus({
        type: "error",
        message: e instanceof Error ? e.message : "Reset failed",
      });
    } finally {
      setResetting(false);
    }
  };

  // ── Save as version ───────────────────────────────────────────────────────────

  const saveAsVersion = async (label: string) => {
    if (!selected) return;
    setSavingVersion(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selected.key,
          action: "save_version",
          label,
          content: editContent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to save version");
      }
      const data = (await res.json()) as {
        version: PromptVersion;
        updatedContent: string;
      };
      setPrompts((prev) =>
        prev.map((p) =>
          p.key === selected.key
            ? {
                ...p,
                content: data.updatedContent,
                versions: [...p.versions, data.version],
                activeVersionId: data.version.id,
              }
            : p,
        ),
      );
      setShowSaveVersionModal(false);
      setVersionLabel("");
      setStatus({ type: "success", message: `Version "${label}" saved and activated.` });
    } catch (e) {
      setStatus({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to save version",
      });
    } finally {
      setSavingVersion(false);
    }
  };

  // ── Activate version ──────────────────────────────────────────────────────────

  const handleActivateVersion = async (versionId: string) => {
    if (!selected) return;
    const version = selected.versions.find((v) => v.id === versionId);
    if (!version) return;
    setStatus(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selected.key,
          action: "activate_version",
          versionId,
        }),
      });
      if (!res.ok) throw new Error("Failed to activate version");
      setPrompts((prev) =>
        prev.map((p) =>
          p.key === selected.key
            ? { ...p, content: version.content, activeVersionId: versionId }
            : p,
        ),
      );
      setEditContent(version.content);
      setStatus({ type: "success", message: `"${version.label}" is now active.` });
    } catch (e) {
      setStatus({
        type: "error",
        message: e instanceof Error ? e.message : "Activation failed",
      });
    }
  };

  // ── Delete version ────────────────────────────────────────────────────────────

  const handleDeleteVersion = (versionId: string) => {
    if (!selected) return;
    const version = selected.versions.find((v) => v.id === versionId);
    if (!version) return;
    setConfirmDeleteVersion(version);
  };

  const confirmDelete = async () => {
    if (!selected || !confirmDeleteVersion) return;
    const version = confirmDeleteVersion;
    setConfirmDeleteVersion(null);
    setDeletingVersionId(version.id);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selected.key,
          action: "delete_version",
          versionId: version.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete version");
      setPrompts((prev) =>
        prev.map((p) =>
          p.key === selected.key
            ? {
                ...p,
                versions: p.versions.filter((v) => v.id !== version.id),
                activeVersionId:
                  p.activeVersionId === version.id ? null : p.activeVersionId,
              }
            : p,
        ),
      );
      toast.success(`Version "${version.label}" deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingVersionId(null);
    }
  };

  const busy = saving || resetting || savingVersion;

  // Group prompts by category for the sidebar
  const categories = Array.from(new Set(prompts.map((p) => p.category)));

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-white/10 flex flex-col">
        <div className="px-4 py-5 border-b border-white/10">
          <h1 className="text-sm font-semibold text-white tracking-wide uppercase">
            Prompt Management
          </h1>
          <p className="mt-1 text-xs text-white/40">
            Changes are live — resets on server restart
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <div className="px-4 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                {cat}
              </div>
              {prompts
                .filter((p) => p.category === cat)
                .map((p) => {
                  const active = p.key === selectedKey;
                  const modified = p.content !== p.defaultContent;
                  const hasVersions = p.versions.length > 0;
                  return (
                    <button
                      key={p.key}
                      onClick={() => selectPrompt(p.key)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-2 transition-colors ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white/90"
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {p.name}
                        </span>
                        <span className="block text-[11px] text-white/30 truncate mt-0.5">
                          {p.description.slice(0, 60)}…
                        </span>
                        {hasVersions && (
                          <span className="block text-[10px] text-white/20 mt-0.5">
                            {p.versions.length} version{p.versions.length !== 1 ? "s" : ""}
                            {p.activeVersionId
                              ? ` · ${p.versions.find((v) => v.id === p.activeVersionId)?.label}`
                              : ""}
                          </span>
                        )}
                      </span>
                      {modified && (
                        <span
                          className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400"
                          title="Modified from default"
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main editor ──────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-white/10 shrink-0 gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">
                  {selected.name}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {selected.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {/* Version dropdown — only when versions exist */}
                {selected.versions.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-white/30">Version:</span>
                    <select
                      value={selected.activeVersionId ?? ""}
                      onChange={(e) => {
                        if (e.target.value) handleActivateVersion(e.target.value);
                      }}
                      disabled={busy}
                      className="text-xs bg-[#1a1a1a] border border-white/15 rounded px-2 py-1.5 text-white/80 focus:outline-none focus:border-white/30 disabled:opacity-40"
                    >
                      {!selected.activeVersionId && (
                        <option value="" disabled>
                          — unsaved edit —
                        </option>
                      )}
                      {selected.versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.id === selected.activeVersionId
                            ? `✓ ${v.label}`
                            : v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => setShowSaveVersionModal(true)}
                  disabled={busy}
                  className="px-3 py-1.5 text-xs text-white/60 border border-white/15 rounded hover:bg-white/5 hover:text-white/90 transition-colors disabled:opacity-40"
                >
                  Save as Version
                </button>
                {!isDefault && (
                  <button
                    onClick={reset}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs text-white/50 border border-white/15 rounded hover:bg-white/5 hover:text-white/80 transition-colors disabled:opacity-40"
                  >
                    {resetting ? "Resetting…" : "Reset to Default"}
                  </button>
                )}
                <button
                  onClick={save}
                  disabled={!isDirty || busy}
                  className="px-4 py-1.5 text-xs font-medium bg-white text-black rounded hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Status banner */}
            {status && (
              <div
                className={`mx-6 mt-4 px-4 py-2.5 rounded text-sm shrink-0 ${
                  status.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {status.message}
              </div>
            )}

            {/* Saved Versions panel */}
            {selected.versions.length > 0 && (
              <div className="mx-6 mt-4 border border-white/10 rounded-lg overflow-hidden shrink-0">
                <div className="px-4 py-2 border-b border-white/8 bg-white/[0.02]">
                  <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                    Saved Versions
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {selected.versions.map((v) => {
                    const isActive = v.id === selected.activeVersionId;
                    return (
                      <div
                        key={v.id}
                        className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0 ${
                          isActive ? "bg-white/[0.04]" : ""
                        }`}
                      >
                        <span className="flex-1 text-xs text-white/70 truncate font-medium">
                          {v.label}
                        </span>
                        <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                        {isActive ? (
                          <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateVersion(v.id)}
                            disabled={busy}
                            className="text-[10px] text-white/40 hover:text-white/80 transition-colors disabled:opacity-40 shrink-0"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVersion(v.id)}
                          disabled={deletingVersionId === v.id || busy}
                          className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                        >
                          {deletingVersionId === v.id ? "…" : "Delete"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Textarea */}
            <div className="flex-1 flex flex-col px-6 pt-4 pb-6 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/30 font-mono">
                  {selected.key}
                  {selected.activeVersionId && (
                    <span className="ml-2 text-emerald-400/60">
                      ·{" "}
                      {
                        selected.versions.find(
                          (v) => v.id === selected.activeVersionId,
                        )?.label
                      }
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-white/30">
                  {editContent.length.toLocaleString()} chars ·{" "}
                  {editContent.split("\n").length.toLocaleString()} lines
                </span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  setStatus(null);
                }}
                spellCheck={false}
                className="flex-1 w-full bg-[#111111] border border-white/10 rounded-lg p-4 font-mono text-sm text-[#d4d4d4] leading-relaxed resize-none focus:outline-none focus:border-white/25 transition-colors"
                placeholder="Enter prompt content…"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Select a prompt from the sidebar
          </div>
        )}
      </main>

      {/* ── Delete Version confirmation modal ────────────────────── */}
      {confirmDeleteVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161616] border border-white/15 rounded-lg p-5 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1">
              Delete Version?
            </h3>
            <p className="text-xs text-white/40 mb-1">
              You are about to permanently delete:
            </p>
            <p className="text-xs font-medium text-white/80 mb-4 truncate">
              &quot;{confirmDeleteVersion.label}&quot;
            </p>
            <p className="text-xs text-red-400/70 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteVersion(null)}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save as Version modal ─────────────────────────────────── */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161616] border border-white/15 rounded-lg p-5 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1">
              Save as Version
            </h3>
            <p className="text-xs text-white/40 mb-4">
              Give this snapshot a label so you can switch back to it later.
            </p>
            <input
              autoFocus
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && versionLabel.trim()) {
                  saveAsVersion(versionLabel.trim());
                }
                if (e.key === "Escape") {
                  setShowSaveVersionModal(false);
                  setVersionLabel("");
                }
              }}
              placeholder='e.g. "v1.0 · Production"'
              className="w-full bg-[#111] border border-white/10 rounded px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/25 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveVersionModal(false);
                  setVersionLabel("");
                }}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveAsVersion(versionLabel.trim())}
                disabled={!versionLabel.trim() || savingVersion}
                className="px-4 py-1.5 text-xs font-medium bg-white text-black rounded hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {savingVersion ? "Saving…" : "Save Version"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
