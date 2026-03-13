"use client";

import { useCallback, useState } from "react";

const ACCEPTED_EXTENSIONS = new Set([".log", ".txt", ".json"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface UseDropZoneOptions {
  onFile: (file: File) => void;
  onError?: (message: string) => void;
}

interface UseDropZoneReturn {
  isDragOver: boolean;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

function validateFile(file: File, onError?: (msg: string) => void): boolean {
  const ext = getExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    onError?.(
      `Unsupported file type "${ext}". Accepted: ${[...ACCEPTED_EXTENSIONS].join(", ")}`,
    );
    return false;
  }

  if (file.size > MAX_SIZE_BYTES) {
    onError?.(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`,
    );
    return false;
  }

  return true;
}

export function useDropZone({
  onFile,
  onError,
}: UseDropZoneOptions): UseDropZoneReturn {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (!file) {
        onError?.("No file was dropped.");
        return;
      }

      if (validateFile(file, onError)) {
        onFile(file);
      }
    },
    [onFile, onError],
  );

  return {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
