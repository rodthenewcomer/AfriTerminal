"use client";

import { cn } from "@wariba/core/utils";

export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/60 p-0.5 overflow-x-auto",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
            value === opt.value
              ? "bg-surface text-ink shadow-sm border border-line"
              : "text-ink-3 hover:text-ink"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
