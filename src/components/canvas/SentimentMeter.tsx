"use client";

import type { SentimentValue } from "@/types/canvas";

const sentimentConfig: Record<
  SentimentValue,
  { label: string; color: string; bgGradient: string }
> = {
  positive: {
    label: "Positive",
    color: "text-nexus-success",
    bgGradient: "from-nexus-success/20 to-nexus-success/5",
  },
  neutral: {
    label: "Neutral",
    color: "text-nexus-warning",
    bgGradient: "from-nexus-warning/20 to-nexus-warning/5",
  },
  negative: {
    label: "Negative",
    color: "text-nexus-error",
    bgGradient: "from-nexus-error/20 to-orange-500/5",
  },
  angry: {
    label: "Angry",
    color: "text-nexus-error",
    bgGradient: "from-red-600/30 to-nexus-error/5",
  },
};

interface SentimentMeterProps {
  sentiment: SentimentValue;
}

export { sentimentConfig };

export function SentimentMeter({ sentiment }: SentimentMeterProps) {
  const config = sentimentConfig[sentiment];
  const positions: Record<SentimentValue, string> = {
    positive: "left-[10%]",
    neutral: "left-[40%]",
    negative: "left-[70%]",
    angry: "left-[90%]",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-nexus-text-muted">Sentiment</span>
        <span className={config.color}>{config.label}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-nexus-surface-raised">
        <div className="absolute inset-0 bg-gradient-to-r from-nexus-success via-nexus-warning to-nexus-error" />
        <div
          className={`absolute top-0 h-full w-3 -translate-x-1/2 rounded-full border-2 border-nexus-text bg-nexus-base ${positions[sentiment]}`}
        />
      </div>
    </div>
  );
}
