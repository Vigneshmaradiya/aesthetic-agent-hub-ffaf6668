"use client";

import { useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/session-store";

export function ResizeHandle() {
  const setPanelRatio = useSessionStore((s) => s.setPanelRatio);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const ratio = moveEvent.clientX / window.innerWidth;
        setPanelRatio(ratio);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [setPanelRatio],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      tabIndex={0}
      className="group flex w-1 cursor-col-resize items-center justify-center hover:bg-nexus-accent/20"
      onMouseDown={handleMouseDown}
    >
      <div className="h-8 w-0.5 rounded-full bg-nexus-border transition-colors group-hover:bg-nexus-accent" />
    </div>
  );
}
