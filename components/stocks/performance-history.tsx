"use client";

import { useEffect, useMemo, useState } from "react";
import type { OHLCV, RealQuote } from "@wariba/core/types";
import {
  TIMEFRAME_OPTIONS,
  sliceSeriesByTimeframe,
  summarizePeriod,
} from "@wariba/core/market-series";
import { compactVolume, dateFr, fcfa, pct } from "@wariba/core/format";
import { realSeriesForTimeframe } from "@/lib/real-data";
import { dividendHistoryFor } from "@/lib/real-dividends";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function PerformanceHistory({
  ticker,
  quote,
}: {
  ticker: string;
  quote: RealQuote;
}) {
  const [series, setSeries] = useState<OHLCV[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void realSeriesForTimeframe(ticker, "MAX")
      .then((result) => {
        if (!cancelled) setSeries(result.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const rows = useMemo(() => {
    const dividends = dividendHistoryFor(ticker);
    return TIMEFRAME_OPTIONS.map(({ value, label }) => {
      const data = sliceSeriesByTimeframe(series, value);
      return {
        label,
        summary: summarizePeriod(data, value, dividends, {
          previousClose: quote.prevClose,
        }),
      };
    });
  }, [quote.prevClose, series, ticker]);

  return (
    <Card>
      <CardHeader
        title="Performance par période"
        subtitle="Cours, rendement total et liquidité calculés avec les mêmes règles que le graphique"
      />
      <CardBody>
        {failed ? (
          <p className="text-xs text-down">Historique indisponible. Réessayez plus tard.</p>
        ) : series.length === 0 ? (
          <p className="text-xs text-ink-3">Chargement de l&apos;historique officiel…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-[11px]">
              <thead>
                <tr className="border-b border-line text-ink-3">
                  <th className="py-2 font-medium">Période</th>
                  <th className="px-2 py-2 font-medium">Dates</th>
                  <th className="px-2 py-2 text-right font-medium">Cours</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2 text-right font-medium">Annualisé</th>
                  <th className="px-2 py-2 text-right font-medium">Plus haut</th>
                  <th className="px-2 py-2 text-right font-medium">Plus bas</th>
                  <th className="px-2 py-2 text-right font-medium">Vol. moyen</th>
                  <th className="py-2 text-right font-medium">Sans échange</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ label, summary }) => (
                  <tr key={label} className="border-b border-line/60">
                    <th className="py-2.5 font-semibold text-ink">{label}</th>
                    <td className="px-2 py-2.5 text-ink-3">
                      {summary ? `${dateFr(summary.startDate)} → ${dateFr(summary.endDate)}` : "N/D"}
                    </td>
                    <td className="num px-2 py-2.5 text-right text-ink-2">
                      {summary ? pct(summary.priceReturnPct, { digits: 2 }) : "N/D"}
                    </td>
                    <td className="num px-2 py-2.5 text-right text-ink-2">
                      {summary ? pct(summary.totalReturnPct, { digits: 2 }) : "N/D"}
                    </td>
                    <td className="num px-2 py-2.5 text-right text-ink-2">
                      {summary?.annualizedReturnPct !== null && summary?.annualizedReturnPct !== undefined
                        ? pct(summary.annualizedReturnPct, { digits: 2 })
                        : "N/D"}
                    </td>
                    <td className="num px-2 py-2.5 text-right text-ink-2">
                      {summary ? fcfa(summary.high) : "N/D"}
                    </td>
                    <td className="num px-2 py-2.5 text-right text-ink-2">
                      {summary ? fcfa(summary.low) : "N/D"}
                    </td>
                    <td className="num px-2 py-2.5 text-right text-ink-2">
                      {summary ? compactVolume(summary.averageVolume) : "N/D"}
                    </td>
                    <td className="num py-2.5 text-right text-ink-2">
                      {summary ? `${summary.sessionsWithoutTrade}/${summary.sessions}` : "N/D"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] leading-4 text-ink-3">
          « Total » ajoute les dividendes nets enregistrés pendant la période. Les cours ne sont pas ajustés rétroactivement aux opérations de capital.
        </p>
      </CardBody>
    </Card>
  );
}
