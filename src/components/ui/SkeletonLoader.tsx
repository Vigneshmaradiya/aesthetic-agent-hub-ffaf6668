interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
}

export function SkeletonLoader({
  width,
  height,
  rounded = false,
  className = "",
}: SkeletonLoaderProps) {
  return (
    <div
      className={[
        "animate-pulse bg-nexus-surface-raised",
        rounded ? "rounded-full" : "rounded-md",
        className,
      ].join(" ")}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}
