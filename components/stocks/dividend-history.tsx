"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { dividendHistoryFor } from "@/lib/real-dividends";
import { realDailyClosesSince } from "@/lib/real-data";
import { dateFr, fcfa, pct } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function DividendHistory({ ticker }: { ticker: string }) {
  const history = dividendHistoryFor(ticker);
  const [paymentYields, setPaymentYields] = useState<Record<number, number>>({});
  const annual = useMemo(() => {
    const byYear = new Map<number, { year: number; net: number; lastDate: string }>();
    for (const event of history) {
      const year = Number(event.date.slice(0, 4));
      const current = byYear.get(year);
      byYear.set(year, {
        year,
        net: (current?.net ?? 0) + event.net,
        lastDate: current && current.lastDate > event.date ? current.lastDate : event.date,
      });
    }
    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [history]);

  useEffect(() => {
    if (!annual.length) return;
    let cancelled = false;
    void realDailyClosesSince(ticker, annual[0].lastDate)
      .then((closes) => {
        if (cancelled) return;
        const yields: Record<number, number> = {};
        for (const item of annual) {
          const close = closes.find((row) => row.time >= item.lastDate)?.close;
          if (close && close > 0) yields[item.year] = (item.net / close) * 100;
        }
        setPaymentYields(yields);
      })
      .catch(() => {
        if (!cancelled) setPaymentYields({});
      });
    return () => {
      cancelled = true;
    };
  }, [annual, ticker]);

  if (!annual.length) {
    return (
      <Card>
        <CardHeader title="Dividendes" subtitle="Historique officiel par action" />
        <CardBody>
          <p className="text-xs text-ink-3">
            N/D — aucun versement suffisamment fiable n&apos;est enregistré pour {ticker} dans l&apos;historique disponible.
          </p>
        </CardBody>
      </Card>
    );
  }

  const max = Math.max(...annual.map((item) => item.net));
  const last = annual[annual.length - 1];
  const first = annual[0];
  const yearSpan = Math.max(0, last.year - first.year);
  const coveredYears = yearSpan + 1;
  const regularity = annual.length / coveredYears;
  const growth =
    first.net > 0 && yearSpan > 0
      ? ((last.net / first.net) ** (1 / yearSpan) - 1) * 100
      : null;

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-accent" /> Historique des dividendes nets
          </span>
        }
        subtitle={`${annual.length} année${annual.length > 1 ? "s" : ""} avec versement depuis ${first.year} · régularité ${annual.length}/${coveredYears} an${coveredYears > 1 ? "s" : ""}${
          growth !== null
            ? ` · croissance annualisée ${growth >= 0 ? "+" : ""}${growth.toFixed(1)} %`
            : ""
        }`}
      />
      <CardBody className="space-y-4">
        <div className="flex items-end gap-2 overflow-x-auto pb-1" role="img" aria-label={`Dividendes nets de ${ticker} par année`}>
          {annual.map((item) => (
            <div
              key={item.year}
              className="flex min-w-12 flex-1 flex-col items-center gap-1"
              title={`Année ${item.year} : ${fcfa(item.net)} net par action · dernier paiement le ${dateFr(item.lastDate)}`}
            >
              <span className="num text-[10px] font-medium text-ink-2">{fcfa(item.net)}</span>
              <div
                className="w-full max-w-14 rounded-t-[3px] bg-gold/70"
                style={{ height: `${Math.max(6, (item.net / max) * 96)}px` }}
              />
              <span className="text-[10px] text-ink-3">{item.year}</span>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-[11px]">
            <thead className="text-ink-3">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Année</th>
                <th className="py-2 font-medium">Dividende net/action</th>
                <th className="py-2 font-medium">Dernier paiement</th>
                <th className="py-2 text-right font-medium">Rendement au paiement</th>
              </tr>
            </thead>
            <tbody>
              {[...annual].reverse().map((item) => (
                <tr key={item.year} className="border-b border-line/60">
                  <td className="py-2 font-semibold text-ink">{item.year}</td>
                  <td className="num py-2 text-ink-2">{fcfa(item.net)}</td>
                  <td className="py-2 text-ink-2">{dateFr(item.lastDate)}</td>
                  <td className="num py-2 text-right text-ink-2">
                    {paymentYields[item.year] === undefined
                      ? "N/D"
                      : pct(paymentYields[item.year], { signed: false, digits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="grid grid-cols-1 gap-2 border-t border-line pt-3 text-[11px] sm:grid-cols-3">
          <div><dt className="text-ink-3">Prochaine assemblée générale</dt><dd className="mt-0.5 font-semibold text-ink">N/D · aucune date officielle</dd></div>
          <div><dt className="text-ink-3">Prochain détachement</dt><dd className="mt-0.5 font-semibold text-ink">N/D · aucune date officielle</dd></div>
          <div><dt className="text-ink-3">Prochain paiement</dt><dd className="mt-0.5 font-semibold text-ink">N/D · aucune date officielle</dd></div>
        </dl>
        <p className="text-[10px] text-ink-3">
          Vérifié : bulletins officiels BRVM, montants nets après IRVM 10 %. Rendement calculé par WARIBA au premier cours de clôture disponible à la date de paiement. Régularité {regularity >= 0.8 ? "élevée" : regularity >= 0.5 ? "intermédiaire" : "faible"} sur l&apos;historique couvert.
        </p>
      </CardBody>
    </Card>
  );
}
