"use client";

import { useCallback } from "react";
import { useHitlStore } from "@/stores/hitl-store";

/**
 * Hook that bridges the client-side HITL store with the server-side
 * /api/chat/approve endpoint. When the user approves or rejects an
 * action in the UI, this hook both:
 *   1. Updates the local Zustand store (for UI state)
 *   2. Sends the decision to the server (to unblock the agent loop)
 */
export function useHitlApproval() {
  const approveAction = useHitlStore((s) => s.approveAction);
  const rejectAction = useHitlStore((s) => s.rejectAction);

  const approve = useCallback(
    async (actionId: string) => {
      // Update local store first for instant UI feedback
      approveAction(actionId);

      // Notify server to unblock agent loop
      try {
        await fetch("/api/chat/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionId, approved: true }),
        });
      } catch {
        // Server may have already processed this
      }
    },
    [approveAction],
  );

  const reject = useCallback(
    async (actionId: string) => {
      // Update local store first
      rejectAction(actionId);

      // Notify server
      try {
        await fetch("/api/chat/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionId, approved: false }),
        });
      } catch {
        // Server may have already processed this
      }
    },
    [rejectAction],
  );

  return { approve, reject };
}
