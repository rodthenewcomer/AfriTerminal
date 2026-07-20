import { cn } from "@wariba/core/utils";
import { pct } from "@wariba/core/format";
import type { Signal } from "@wariba/core/types";
import { Badge } from "@/components/ui/badge";

export function PriceChange({
  value,
  className,
  arrow = true,
}: {
  value: number;
  className?: string;
  arrow?: boolean;
}) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num font-medium",
        up ? "text-up" : "text-down",
        className
      )}
    >
      {arrow ? (up ? "▲ " : "▼ ") : null}
      {pct(value)}
    </span>
  );
}

const SCORE_LABELS: Record<string, string> = {
  quality: "Qualité",
  valuation: "Valorisation",
  momentum: "Momentum",
  dividend: "Dividende",
  liquidity: "Liquidité",
  risk: "Risque",
};

export function ScoreBadge({
  kind,
  value,
  compact,
}: {
  kind: "quality" | "valuation" | "momentum" | "dividend" | "liquidity" | "risk";
  value: number;
  compact?: boolean;
}) {
  // Pour le risque, un score élevé est mauvais.
  const good = kind === "risk" ? 100 - value : value;
  const color =
    good >= 65 ? "text-up bg-up/10 border-up/25" :
    good >= 40 ? "text-warn bg-warn/10 border-warn/25" :
    "text-down bg-down/10 border-down/25";
  return (
    <span
      title={`${SCORE_LABELS[kind]} : ${value}/100`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] num font-semibold",
        color
      )}
    >
      {compact ? null : (
        <span className="font-normal opacity-75">{SCORE_LABELS[kind]}</span>
      )}
      {value}
    </span>
  );
}

export function SignalBadges({
  signals,
  max,
  className,
}: {
  signals: Signal[];
  max?: number;
  className?: string;
}) {
  const shown = max ? signals.slice(0, max) : signals;
  const rest = max ? signals.length - shown.length : 0;
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {shown.map((s) => (
        <Badge key={s.id} tone={s.tone} title={s.detail}>
          {s.label}
        </Badge>
      ))}
      {rest > 0 ? <Badge tone="neutral">+{rest}</Badge> : null}
    </span>
  );
}
