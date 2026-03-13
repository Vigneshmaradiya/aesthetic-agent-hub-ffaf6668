/**
 * Shared HITL pending approvals map.
 * Used by both the chat route (to register) and the approve route (to resolve).
 *
 * Stored on globalThis so it survives Next.js hot-module replacement in dev.
 * Without this, saving any file in the import chain resets the Map and the
 * approve endpoint can't find the pending approval → 404.
 *
 * For horizontal scaling, replace with Redis pub/sub.
 */

export interface PendingApproval {
  resolve: (approved: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
}

declare global {
  // eslint-disable-next-line no-var
  var __nexusHitlApprovals: Map<string, PendingApproval> | undefined;
}

if (!globalThis.__nexusHitlApprovals) {
  globalThis.__nexusHitlApprovals = new Map<string, PendingApproval>();
}

export const pendingApprovals = globalThis.__nexusHitlApprovals;
