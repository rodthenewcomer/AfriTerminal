import type { HTMLAttributes } from "react";
import { cn } from "@wariba/core/utils";
import type { SignalTone } from "@wariba/core/types";

const tones: Record<SignalTone | "accent" | "gold", string> = {
  positive: "bg-up/12 text-up border-up/25",
  negative: "bg-down/12 text-down border-down/25",
  warning: "bg-warn/12 text-warn border-warn/25",
  neutral: "bg-surface-2 text-ink-2 border-line",
  accent: "bg-accent/12 text-accent border-accent/25",
  gold: "bg-gold/12 text-gold border-gold/30",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
