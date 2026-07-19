"use client";

import { useEffect, useRef } from "react";
import { cn } from "@wariba/core/utils";

export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [value]);

  return (
    <div
      ref={listRef}
      className={cn(
        "flex w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2/60 p-0.5 [scrollbar-width:thin] [scrollbar-color:var(--line)_transparent] overscroll-x-contain",
        className
      )}
      role="tablist"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "snap-start rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
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
