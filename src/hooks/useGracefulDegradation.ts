"use client";

import { useSessionStore } from "@/stores/session-store";

export function useGracefulDegradation() {
  const connections = useSessionStore((s) => s.mcpConnections);

  const isServiceAvailable = (service: string) =>
    connections[service] === "connected";

  const unavailableServices = Object.entries(connections)
    .filter(([, status]) => status === "error" || status === "disconnected")
    .map(([service]) => service);

  const hasAnyConnection = Object.values(connections).some(
    (s) => s === "connected",
  );

  return { isServiceAvailable, unavailableServices, hasAnyConnection };
}
