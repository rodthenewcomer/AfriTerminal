"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  type Time,
} from "lightweight-charts";
import type { PortfolioTransaction } from "@wariba/core/portfolio";
import { portfolioValueSeries } from "@wariba/core/portfolio";
import {
  realDailyClosesSince,
  realIndexDailyClosesSince,
  isRealTicker,
} from "@/lib/real-data";
import { CHART_COLORS } from "@/lib/chart-utils";
import { Skeleton } from "@/components/ui/skeleton";

const FMT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Courbe du patrimoine : valeur du portefeuille séance par séance
 * (séries BOC réelles), montant net investi en pointillé (les achats
 * font des « marches » — l'écart entre les deux courbes EST la
 * plus/moins-value), et BRVM Composite rebasé au point de départ à
 * titre de comparaison.
 */
export function PerformanceChart({
  transactions,
}: {
  transactions: PortfolioTransaction[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [tooShort, setTooShort] = useState(false);

  // clé stable : re-calcule quand les transactions changent réellement
  const txKey = JSON.stringify(
    transactions.map((t) => [t.ticker, t.side, t.date, t.quantity, t.price, t.fees])
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || transactions.length === 0) return;
    let cancelled = false;
    let chart: ReturnType<typeof createChart> | null = null;
    setReady(false);
    setTooShort(false);

    async function run() {
      const firstDate = [...transactions].sort((a, b) =>
        a.date.localeCompare(b.date)
      )[0].date;
      const tickers = [...new Set(transactions.map((t) => t.ticker))].filter(
        isRealTicker
      );

      const closesEntries = await Promise.all(
        tickers.map(async (t) => [t, await realDailyClosesSince(t, firstDate)] as const)
      );
      const composite = await realIndexDailyClosesSince("BRVMC", firstDate);
      if (cancelled) return;

      const series = portfolioValueSeries(
        transactions,
        Object.fromEntries(closesEntries)
      );
      if (series.length < 2) {
        setTooShort(true);
        setReady(true);
        return;
      }

      const dark = resolvedTheme !== "light";
      const ink2 = dark ? "#a1a1aa" : "#475569";
      const grid = dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)";

      const c = createChart(el!, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: ink2,
          fontSize: 11,
          attributionLogo: false,
        },
        grid: { vertLines: { color: grid }, horzLines: { color: grid } },
        crosshair: { mode: CrosshairMode.Magnet },
        rightPriceScale: { borderColor: "transparent" },
        timeScale: { borderColor: "transparent", rightOffset: 2 },
        localization: {
          locale: "fr-FR",
          priceFormatter: (p: number) => FMT.format(p),
        },
      });
      chart = c;

      const value = c.addSeries(AreaSeries, {
        lineColor: CHART_COLORS.accent,
        topColor: "rgba(226,166,61,0.22)",
        bottomColor: "rgba(226,166,61,0.02)",
        lineWidth: 2,
        title: "Valeur",
      });
      value.setData(series.map((p) => ({ time: p.time as Time, value: p.value })));

      const invested = c.addSeries(LineSeries, {
        color: ink2,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "Investi net",
      });
      invested.setData(
        series.map((p) => ({ time: p.time as Time, value: p.invested }))
      );

      // Composite rebasé sur la valeur de départ du portefeuille
      const base = series[0].value;
      const compInRange = composite.filter((d) => d.time >= series[0].time);
      if (compInRange.length > 1 && base > 0) {
        const comp0 = compInRange[0].close;
        const comp = c.addSeries(LineSeries, {
          color: CHART_COLORS.violet,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: "BRVM Composite (rebasé)",
        });
        comp.setData(
          compInRange.map((d) => ({
            time: d.time as Time,
            value: (d.close / comp0) * base,
          }))
        );
      }

      c.timeScale().fitContent();
      setReady(true);
    }

    run();
    return () => {
      cancelled = true;
      chart?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txKey, resolvedTheme]);

  if (transactions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-line bg-surface/40 sm:h-72">
        {!ready ? <Skeleton className="absolute inset-2" /> : null}
        {ready && tooShort ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-sm text-ink-3">
              La courbe apparaîtra dès que vos positions auront au moins deux
              séances de cotation derrière elles.
            </p>
          </div>
        ) : null}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <p className="text-[10px] leading-relaxed text-ink-3">
        Aire ambre : valeur du portefeuille (clôtures officielles).
        Pointillé : montant net investi — l&apos;écart entre les deux est
        votre plus/moins-value ; les achats font des « marches ». Ligne
        violette : BRVM Composite rebasé sur votre point de départ, à titre
        de comparaison.
      </p>
    </div>
  );
}
