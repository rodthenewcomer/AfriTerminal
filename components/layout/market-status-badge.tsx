"use client";

import { useEffect, useState } from "react";
import { getMarketPhase, type MarketPhase } from "@/lib/market-status";
import { cn } from "@wariba/core/utils";

export function MarketStatusBadge() {
  const [phase, setPhase] = useState<MarketPhase | null>(null);

  useEffect(() => {
    const update = () => setPhase(getMarketPhase());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!phase) {
    return (
      <span className="inline-flex h-6 w-24 rounded-full bg-surface-2" aria-hidden />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        phase.isOpen
          ? "border-up/25 bg-up/10 text-up"
          : phase.phase === "pre-ouverture"
            ? "border-warn/25 bg-warn/10 text-warn"
            : "border-line bg-surface-2 text-ink-3"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          phase.isOpen ? "bg-up animate-pulse" : phase.phase === "pre-ouverture" ? "bg-warn" : "bg-ink-3"
        )}
      />
      BRVM · {phase.label}
    </span>
  );
}
