const variantClasses = {
  default: "bg-nexus-surface-raised text-nexus-text border border-nexus-border",
  success:
    "bg-nexus-success/15 text-nexus-success border border-nexus-success/30",
  warning:
    "bg-nexus-warning/15 text-nexus-warning border border-nexus-warning/30",
  error: "bg-nexus-error/15 text-nexus-error border border-nexus-error/30",
  info: "bg-nexus-info/15 text-nexus-info border border-nexus-info/30",
} as const;

type Variant = keyof typeof variantClasses;

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
