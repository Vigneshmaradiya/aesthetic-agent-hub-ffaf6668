"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

const variantClasses = {
  primary:
    "bg-nexus-accent text-nexus-base hover:bg-nexus-accent-muted hover:shadow-[0_0_16px_rgba(0,240,255,0.15)] hover:-translate-y-0.5 active:bg-nexus-accent-dim active:translate-y-0",
  secondary:
    "bg-nexus-surface-raised text-nexus-text border border-nexus-border hover:bg-nexus-surface hover:border-nexus-accent-dim hover:-translate-y-0.5 active:bg-nexus-border-subtle active:translate-y-0",
  danger:
    "bg-nexus-error/10 text-nexus-error border border-nexus-error/30 hover:bg-nexus-error/20 hover:border-nexus-error/50 hover:-translate-y-0.5 active:bg-nexus-error/30 active:translate-y-0",
  ghost:
    "bg-transparent text-nexus-text hover:bg-nexus-surface-raised hover:-translate-y-0.5 active:bg-nexus-border active:translate-y-0",
} as const;

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-2.5 text-base gap-2",
} as const;

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref,
  ) {
    const spinnerSize = size === "lg" ? "sm" : "sm";

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-base",
          "disabled:pointer-events-none disabled:opacity-50 disabled:transform-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && <Spinner size={spinnerSize} />}
        {children}
      </button>
    );
  },
);
