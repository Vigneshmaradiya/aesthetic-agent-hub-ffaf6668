"use client";

import { useCallback, useRef } from "react";
import { useDropZone } from "@/hooks/useDropZone";

interface DropZoneProps {
  fileName: string | null;
  onFile: (file: File) => void;
  onError?: (message: string) => void;
}

export function DropZone({ fileName, onFile, onError }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useDropZone({ onFile, onError });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [onFile],
  );

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a log file here or press Enter to browse"
      className={`flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-nexus-accent focus:ring-offset-2 focus:ring-offset-nexus-base ${
        isDragOver
          ? "border-nexus-accent bg-nexus-accent/5 shadow-[0_0_24px_var(--nexus-accent-glow)]"
          : "border-nexus-border hover:border-nexus-text-dim"
      } `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
    >
      {/* Upload icon */}
      <svg
        className={`h-10 w-10 transition-colors ${
          isDragOver ? "text-nexus-accent" : "text-nexus-text-dim"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>

      {fileName ? (
        <p className="text-sm font-medium text-nexus-accent">{fileName}</p>
      ) : (
        <div className="text-center">
          <p className="text-sm text-nexus-text-muted">
            Drag and drop a log file here
          </p>
          <button
            type="button"
            className="mt-1 text-xs text-nexus-accent hover:underline"
            onClick={handleBrowseClick}
          >
            or browse files
          </button>
        </div>
      )}

      <p className="text-[10px] text-nexus-text-dim">
        .log, .txt, .json &mdash; up to 10 MB
      </p>

      {/* Hidden file input fallback */}
      <input
        ref={inputRef}
        type="file"
        accept=".log,.txt,.json"
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
