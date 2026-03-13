"use client";

import { useCanvasStore } from "@/stores/canvas-store";
import { CanvasSection } from "./CanvasSection";
import { SentimentMeter } from "./SentimentMeter";

const tierColors: Record<string, string> = {
  enterprise: "bg-nexus-accent/15 text-nexus-accent",
  premium: "bg-nexus-warning/15 text-nexus-warning",
  standard: "bg-nexus-info/15 text-nexus-info",
  free: "bg-nexus-text-dim/15 text-nexus-text-dim",
};

export function CustomerIntelSection() {
  const customer = useCanvasStore((s) => s.customerIntelligence);

  if (!customer) return null;

  const tierColor =
    tierColors[customer.tier.toLowerCase()] ?? tierColors.standard;

  return (
    <CanvasSection
      sectionId="customer-intelligence"
      title="Customer Intelligence"
    >
      <div className="space-y-3 px-4 pb-4">
        {/* Customer header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-nexus-text">
              {customer.name}
            </p>
            <p className="text-xs text-nexus-text-muted">{customer.email}</p>
            {customer.org && (
              <p className="text-xs text-nexus-text-dim">{customer.org}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {customer.arr != null && (
              <span className="font-mono text-[10px] text-nexus-text-dim">
                ${customer.arr.toLocaleString()} ARR
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${tierColor}`}
            >
              {customer.tier}
            </span>
          </div>
        </div>

        {/* Ticket stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-nexus-text">
              {customer.openTickets}
            </p>
            <p className="text-[10px] text-nexus-text-dim">Open</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-nexus-text">
              {customer.totalTickets}
            </p>
            <p className="text-[10px] text-nexus-text-dim">Total</p>
          </div>
        </div>

        {/* Sentiment */}
        <SentimentMeter sentiment={customer.sentiment} />

        {/* Recent Incidents */}
        {customer.recentIncidents && customer.recentIncidents.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-dim">
              Recent Incidents
            </p>
            {customer.recentIncidents.map((incident) => {
              const incidentStatusColors: Record<string, string> = {
                open: "text-red-400",
                resolved: "text-nexus-success",
                investigating: "text-nexus-warning",
              };
              const incidentColor =
                incidentStatusColors[incident.status.toLowerCase()] ??
                "text-nexus-text-muted";
              return (
                <div
                  key={incident.id}
                  className="flex items-center gap-2 rounded-md border border-nexus-border bg-nexus-surface-raised/50 px-2 py-1.5"
                >
                  <span className="shrink-0 font-mono text-[10px] text-nexus-text-dim">
                    {incident.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-nexus-text">
                    {incident.title}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-medium ${incidentColor}`}
                  >
                    {incident.status}
                  </span>
                  <span className="shrink-0 text-[10px] text-nexus-text-dim">
                    {incident.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tags */}
        {customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-nexus-surface-raised px-2 py-0.5 text-[10px] text-nexus-text-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </CanvasSection>
  );
}
