import { cn } from "@wariba/core/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-lg", className)}
      aria-hidden="true"
    />
  );
}
