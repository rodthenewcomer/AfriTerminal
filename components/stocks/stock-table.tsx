"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { StockSnapshot } from "@wariba/core/types";
import { LATEST_TRADING_DATE } from "@/lib/real-data";
import { compactVolume, dateFr, fcfa, pct, ratio } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";
import { getSeries } from "@/lib/mock/series";
import { Sparkline } from "@/components/charts/sparkline";
import { Badge } from "@/components/ui/badge";
import { PriceChange, SignalBadges } from "./badges";
import { WatchlistStar } from "./watchlist-star";

type SortKey =
  | "ticker"
  | "lastPrice"
  | "dayChange"
  | "weekChange"
  | "ytdChange"
  | "dayVolume"
  | "per"
  | "yieldNet"
  | "pos52";

// Toutes les colonnes sont réelles : les anciennes Capitalisation/P/B/
// ROE/Qualité/Risque affichaient « — » sur CHAQUE ligne depuis le passage
// de tout l'univers en données réelles (fondamentaux non publiés au
// bulletin) — cinq colonnes mortes remplacées par Var. semaine et la
// position dans la fourchette 52 semaines (dérivée des séries BOC).
const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "ticker", label: "Société" },
  { key: "lastPrice", label: "Cours", align: "right" },
  { key: "dayChange", label: "Var. jour", align: "right" },
  { key: "weekChange", label: "Var. sem.", align: "right" },
  { key: "ytdChange", label: "YTD", align: "right" },
  { key: "dayVolume", label: "Volume", align: "right" },
  { key: "per", label: "PER", align: "right" },
  { key: "yieldNet", label: "Rdt net", align: "right" },
  { key: "pos52", label: "52 semaines", align: "right" },
];

/** Position du cours dans sa fourchette 52 semaines, 0 (plus bas) à 1. */
function pos52(s: StockSnapshot): number {
  const r = s.real;
  if (!r || r.week52High <= r.week52Low) return 0.5;
  return (r.lastClose - r.week52Low) / (r.week52High - r.week52Low);
}

function sortValue(s: StockSnapshot, key: SortKey): number | string {
  switch (key) {
    case "ticker": return s.ticker;
    case "pos52": return pos52(s);
    default: return s[key];
  }
}

export function StockTable({ stocks }: { stocks: StockSnapshot[] }) {
  // "marketCap" n'a pas d'équivalent réel (pas d'actions en circulation
  // publiées) — tri par défaut sur une colonne réelle pour ne pas ouvrir
  // sur un ordre basé sur une valeur cachée.
  const [sortKey, setSortKey] = useState<SortKey>("ytdChange");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...stocks].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp =
        typeof va === "string"
          ? va.localeCompare(vb as string)
          : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [stocks, sortKey, asc]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key === "ticker");
    }
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2/50 text-[11px] uppercase tracking-wide text-ink-3">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 font-medium cursor-pointer select-none whitespace-nowrap hover:text-ink",
                    c.align === "right" ? "text-right" : "text-left"
                  )}
                  onClick={() => onSort(c.key)}
                  title={
                    { per: "Cours / bénéfice par action", yieldNet: "Dividende net (après IRVM 10 %) / cours", pos52: "Position du cours entre son plus bas et son plus haut des 52 dernières semaines" }[c.key as string]
                  }
                >
                  <span className="inline-flex items-center gap-0.5">
                    {c.label}
                    {sortKey === c.key ? (
                      asc ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const stale = !!s.real && s.real.asOfDate !== LATEST_TRADING_DATE;
              return (
                <tr
                  key={s.ticker}
                  className="group border-b border-line/60 last:border-0 hover:bg-surface-2/50 transition-colors"
                >
                <td className="px-3 py-2.5">
                  <Link href={`/stocks/${s.ticker}`} className="flex items-center gap-2">
                    <WatchlistStar ticker={s.ticker} />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[9px] font-bold text-accent">
                      {s.ticker}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink group-hover:text-accent">
                        {s.name}
                      </span>
                      <span className="block text-[11px] text-ink-3">
                        {s.sector} · {s.country}
                        {stale ? (
                          <Badge tone="warning" className="ml-1" title={`Dernière cotation disponible : ${dateFr(s.real!.asOfDate)}`}>
                            suspendue
                          </Badge>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right num font-medium">{fcfa(s.lastPrice)}</td>
                <td className="px-3 py-2.5 text-right"><PriceChange value={s.dayChange} arrow={false} /></td>
                <td className="px-3 py-2.5 text-right"><PriceChange value={s.weekChange} arrow={false} /></td>
                <td className="px-3 py-2.5 text-right"><PriceChange value={s.ytdChange} arrow={false} /></td>
                <td className="px-3 py-2.5 text-right num" style={undefined}>
                  <span className={cn(s.volumeRatio >= 3 ? "text-warn font-semibold" : "text-ink-2")}>
                    {compactVolume(s.dayVolume)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right num text-ink-2">{s.per > 0 ? ratio(s.per) : "—"}</td>
                <td className="px-3 py-2.5 text-right num text-ink-2">{pct(s.yieldNet, { signed: false, digits: 1 })}</td>
                <td className="px-3 py-2.5">
                  {s.real ? (
                    <span
                      className="block"
                      title={`52 sem : ${fcfa(s.real.week52Low)} – ${fcfa(s.real.week52High)}`}
                    >
                      <span className="relative block h-1.5 w-20 ml-auto rounded-full bg-surface-2">
                        <span
                          className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-sm bg-accent"
                          style={{ left: `calc(${(pos52(s) * 100).toFixed(0)}% - 2px)` }}
                        />
                      </span>
                    </span>
                  ) : (
                    <span className="block text-right text-ink-3">—</span>
                  )}
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes compactes */}
      <div className="grid gap-2.5 md:hidden">
        {sorted.map((s) => {
          const stale = !!s.real && s.real.asOfDate !== LATEST_TRADING_DATE;
          return (
            <Link key={s.ticker} href={`/stocks/${s.ticker}`} className="min-w-0 card-glass p-3.5 active:scale-[0.99] transition-transform">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[9px] font-bold text-accent">
                {s.ticker}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
                <p className="text-[11px] text-ink-3">
                  {s.sector} · {s.country}
                  {stale ? (
                    <Badge tone="warning" className="ml-1" title={`Dernière cotation disponible : ${dateFr(s.real!.asOfDate)}`}>
                      suspendue
                    </Badge>
                  ) : null}
                </p>
              </div>
              <Sparkline
                data={s.real ? s.real.sparkline : getSeries(s.ticker).daily.slice(-30).map((d) => d.close)}
                width={72}
                height={28}
              />
              <div className="text-right">
                <p className="num text-sm font-semibold text-ink">{fcfa(s.lastPrice)}</p>
                <PriceChange value={s.dayChange} className="text-xs" />
              </div>
              <WatchlistStar ticker={s.ticker} />
            </div>
            {!s.real && s.signals.length > 0 ? (
              <div className="mt-2.5">
                <SignalBadges signals={s.signals} max={3} />
              </div>
            ) : null}
            </Link>
          );
        })}
      </div>
    </>
  );
}
