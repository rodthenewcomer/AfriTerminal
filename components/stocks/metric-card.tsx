import type { ReactNode } from "react";
import { cn } from "@wariba/core/utils";
import { Term } from "@/components/ui/term";

export function MetricCard({
  label,
  value,
  hint,
  tone,
  term,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "up" | "down" | "warn";
  /** Clé du glossaire (lib/glossary.ts) : le libellé devient une définition au survol/tap. */
  term?: string;
}) {
  return (
    <div className="card-glass px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
        {term ? <Term id={term}>{label}</Term> : label}
      </p>
      <p
        className={cn(
          "mt-1 num text-lg font-semibold text-ink",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "warn" && "text-warn"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-ink-3">{hint}</p> : null}
    </div>
  );
}
