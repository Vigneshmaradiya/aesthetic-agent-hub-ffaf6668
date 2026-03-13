"use client";

import { useEffect } from "react";

type ShortcutHandler = (e: KeyboardEvent) => void;

interface ShortcutMap {
  [key: string]: ShortcutHandler;
}

function parseShortcut(shortcut: string) {
  const parts = shortcut.toLowerCase().split("+");
  return {
    meta: parts.includes("meta") || parts.includes("cmd"),
    ctrl: parts.includes("ctrl"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts[parts.length - 1],
  };
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow meta/ctrl shortcuts even in inputs
        if (!e.metaKey && !e.ctrlKey) return;
      }

      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const parsed = parseShortcut(shortcut);
        const isMac = navigator.platform.toUpperCase().includes("MAC");

        // Handle meta (Cmd on Mac, Ctrl on Windows)
        const metaMatch = parsed.meta ? (isMac ? e.metaKey : e.ctrlKey) : true;
        const ctrlMatch = parsed.ctrl ? e.ctrlKey : !parsed.meta || true;
        const shiftMatch = parsed.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = parsed.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === parsed.key;

        if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          callback(e);
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
