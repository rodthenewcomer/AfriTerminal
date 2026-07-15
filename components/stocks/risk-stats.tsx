"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  annualizedVolatility,
  beta,
  maxDrawdown,
  type DailyClose,
} from "@wariba/core/risk";
import {
  isRealTicker,
  realDailyClosesSince,
  realIndexDailyClosesSince,
} from "@/lib/real-data";
import { dateFr, pct, ratio } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Term } from "@/components/ui/term";

interface Stats {
  vol1y: number | null;
  beta1y: number | null;
  dd: { pct: number; peakDate: string; troughDate: string } | null;
}

/**
 * Volatilité, bêta et perte maximale calculés côté client depuis les
 * séries quotidiennes réelles (import dynamique par ticker, comme le
 * chart) — aucune estimation, conventions standard documentées dans
 * lib/risk.ts.
 */
export function RiskStats({ ticker }: { ticker: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isRealTicker(ticker)) return;
    let cancelled = false;
    (async () => {
      const [all, index] = await Promise.all([
        realDailyClosesSince(ticker, "2019-01-01"),
        realIndexDailyClosesSince("BRVMC", "2019-01-01"),
      ]);
      if (cancelled) return;
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const cutoff = yearAgo.toISOString().slice(0, 10);
      const last1y: DailyClose[] = all.filter((d) => d.time >= cutoff);
      const index1y: DailyClose[] = index.filter((d) => d.time >= cutoff);
      setStats({
        vol1y: annualizedVolatility(last1y),
        beta1y: beta(last1y, index1y),
        dd: maxDrawdown(all),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (!isRealTicker(ticker) || stats === null) return null;
  if (stats.vol1y === null && stats.beta1y === null && stats.dd === null)
    return null;

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-accent" /> Profil de risque
          </span>
        }
        subtitle="Calculé sur les clôtures officielles — 1 an pour volatilité et bêta, tout l'historique (2019+) pour la perte max."
      />
      <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface-2/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-3">
            <Term id="volatilite">Volatilité 1 an</Term>
          </p>
          <p className="num mt-0.5 text-sm font-semibold text-ink">
            {stats.vol1y !== null ? pct(stats.vol1y, { signed: false, digits: 1 }) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-3">
            <Term id="beta">Bêta vs Composite</Term>
          </p>
          <p className="num mt-0.5 text-sm font-semibold text-ink">
            {stats.beta1y !== null ? ratio(stats.beta1y) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-2/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-3">
            <Term id="drawdown">Perte max. (2019+)</Term>
          </p>
          <p className="num mt-0.5 text-sm font-semibold text-down">
            {stats.dd ? pct(stats.dd.pct, { digits: 1 }) : "—"}
          </p>
          {stats.dd && stats.dd.pct < 0 ? (
            <p className="mt-0.5 text-[10px] text-ink-3">
              du {dateFr(stats.dd.peakDate)} au {dateFr(stats.dd.troughDate)}
            </p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
