import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { millions, pct } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";
import { describeNetIncomeTrend } from "@wariba/core/real-analysis";
import type { RealFundamentals } from "@/lib/real-fundamentals";

interface MetricPair {
  id: string;
  label: string;
  current: number;
  previous: number;
}

function comparisonPairs(fundamental: RealFundamentals): MetricPair[] {
  const candidates: { id: string; label: string; current: number | null; previous: number | null }[] = [
    { id: "revenue", label: fundamental.revenueLabel, current: fundamental.revenueM, previous: fundamental.revenuePrevM },
    { id: "net", label: "Résultat net", current: fundamental.netIncomeM, previous: fundamental.netIncomePrevM },
    { id: "ordinary", label: "Résultat ordinaire", current: fundamental.ordinaryIncomeM, previous: fundamental.ordinaryIncomePrevM },
    { id: "equity", label: "Capitaux propres", current: fundamental.equityM, previous: fundamental.equityPrevM },
    { id: "deposits", label: "Dépôts clientèle", current: fundamental.depositsM, previous: fundamental.depositsPrevM },
    { id: "loans", label: "Crédits clientèle", current: fundamental.loansM, previous: fundamental.loansPrevM },
  ];
  return candidates.filter(
    (pair): pair is MetricPair => pair.current !== null && pair.previous !== null && pair.previous !== 0,
  );
}

function ComparisonCard({ pair, year }: { pair: MetricPair; year: number }) {
  const growth = ((pair.current - pair.previous) / Math.abs(pair.previous)) * 100;
  const max = Math.max(Math.abs(pair.current), Math.abs(pair.previous), 1);
  const previousWidth = Math.max(5, (Math.abs(pair.previous) / max) * 100);
  const currentWidth = Math.max(5, (Math.abs(pair.current) / max) * 100);
  const isProfitMetric = pair.id === "net" || pair.id === "ordinary";
  const financialTrend = isProfitMetric
    ? describeNetIncomeTrend(pair.current, pair.previous)
    : null;
  const needsSemanticTrend = Boolean(financialTrend && (pair.current <= 0 || pair.previous <= 0));
  const Icon = pair.current > pair.previous ? ArrowUpRight : pair.current < pair.previous ? ArrowDownRight : Minus;
  const changeTone = needsSemanticTrend
    ? financialTrend?.tone === "positive"
      ? "bg-up/10 text-up"
      : financialTrend?.tone === "warning"
        ? "bg-warn/10 text-warn"
        : financialTrend?.tone === "negative"
          ? "bg-down/10 text-down"
          : "bg-surface-2 text-ink-3"
    : growth > 0
      ? "bg-up/10 text-up"
      : growth < 0
        ? "bg-down/10 text-down"
        : "bg-surface-2 text-ink-3";
  const changeLabel = needsSemanticTrend && financialTrend
    ? financialTrend.id === "loss-reduction" || financialTrend.id === "loss-widening"
      ? `${financialTrend.label} · ${pct(Math.abs(growth), { signed: false, digits: 1 })}`
      : financialTrend.label
    : pct(growth, { digits: 1 });
  const trendTone = needsSemanticTrend
    ? financialTrend?.tone
    : growth > 0
      ? "positive"
      : growth < 0
        ? "negative"
        : "neutral";
  const cardTone = trendTone === "positive"
    ? "border-up/30 bg-gradient-to-br from-up/10 via-surface to-surface shadow-[0_10px_30px_-24px_rgba(34,197,94,0.9)]"
    : trendTone === "negative"
      ? "border-down/30 bg-gradient-to-br from-down/10 via-surface to-surface shadow-[0_10px_30px_-24px_rgba(239,68,68,0.9)]"
      : "border-line bg-surface";
  const accentTone = trendTone === "positive"
    ? "bg-up"
    : trendTone === "negative"
      ? "bg-down"
      : "bg-ink-3/40";

  return (
    <article
      className={cn("relative overflow-hidden rounded-xl border p-4", cardTone)}
      role="img"
      aria-label={`${pair.label} : ${millions(pair.previous)} en ${year - 1}, ${millions(pair.current)} en ${year}, ${changeLabel}`}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", accentTone)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-ink">{pair.label}</h3>
          <p className="mt-0.5 text-[10px] text-ink-3">Exercices publiés, millions FCFA</p>
        </div>
        <span className={cn(
          "num inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold",
          changeTone,
        )}>
          <Icon className="h-3 w-3" /> {changeLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-line/70 bg-surface/80 p-2.5">
          <span className="num text-[10px] font-semibold text-ink-3">{year - 1}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-ink-3/35" style={{ width: `${previousWidth}%` }} />
          </span>
          <span className="num min-w-24 text-right text-[11px] font-semibold text-ink-2">{millions(pair.previous)}</span>
        </div>
        <div className={cn(
          "grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2.5",
          trendTone === "negative" ? "border-down/25 bg-down/[0.08]" : "border-up/25 bg-up/[0.08]",
        )}>
          <span className="num text-[10px] font-bold text-accent">{year}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className={cn("block h-full rounded-full", pair.current < 0 ? "bg-down" : "bg-accent")} style={{ width: `${currentWidth}%` }} />
          </span>
          <span className={cn("num min-w-24 text-right text-[11px] font-bold", pair.current < 0 ? "text-down" : "text-ink")}>{millions(pair.current)}</span>
        </div>
      </div>
    </article>
  );
}

export function FinancialYearComparison({ fundamental }: { fundamental: RealFundamentals }) {
  const pairs = comparisonPairs(fundamental);
  if (!pairs.length) return null;

  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface-2/30 p-4 sm:p-5" aria-labelledby="year-comparison-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="year-comparison-title" className="text-sm font-bold text-ink">Comparaison {fundamental.fiscalYear - 1} / {fundamental.fiscalYear}</h2>
          <p className="mt-1 text-xs text-ink-3">Chaque carte compare les deux exercices publiés ; vert = progression, rouge = recul.</p>
        </div>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-ink-3">N-1 vs N</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {pairs.map((pair) => <ComparisonCard key={pair.id} pair={pair} year={fundamental.fiscalYear} />)}
      </div>
    </section>
  );
}
