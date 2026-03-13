interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd
      className={[
        "inline-flex items-center justify-center rounded border border-nexus-border bg-nexus-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-nexus-text-muted",
        className,
      ].join(" ")}
    >
      {children}
    </kbd>
  );
}
