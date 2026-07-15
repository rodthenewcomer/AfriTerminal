import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@wariba/core/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-glass", className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-4 pt-4 pb-2 sm:px-5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 sm:px-5", className)} {...props} />;
}
