"use client";

import { CalendarDays, TrendingUp } from "lucide-react";
import type { DividendIncomeEvent, MonthForecast } from "@wariba/core/portfolio";
import { incomeByYear } from "@wariba/core/portfolio";
import { fcfa } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const MONTH_LABELS: Record<string, string> = {
  "01": "janv.", "02": "févr.", "03": "mars", "04": "avr.",
  "05": "mai", "06": "juin", "07": "juil.", "08": "août",
  "09": "sept.", "10": "oct.", "11": "nov.", "12": "déc.",
};

/**
 * Revenus passifs : perçus par année (croissance dans le temps) et
 * calendrier projeté des 12 prochains mois (mois historique de paiement
 * de chaque valeur × dernier dividende net — projection à dividende
 * constant, étiquetée comme telle).
 */
export function IncomePanel({
  events,
  forecast,
}: {
  events: DividendIncomeEvent[];
  forecast: MonthForecast[];
}) {
  const byYear = incomeByYear(events);
  const maxYear = Math.max(1, ...byYear.map((y) => y.amount));
  const maxMonth = Math.max(1, ...forecast.map((m) => m.total));
  const annualTotal = forecast.reduce((a, m) => a + m.total, 0);

  if (byYear.length === 0 && forecast.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {byYear.length > 0 ? (
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-accent" /> Revenu passif
                par année
              </span>
            }
            subtitle="Dividendes nets perçus (estimation) — regardez-le grandir"
          />
          <CardBody>
            <div className="flex items-end gap-3" role="img" aria-label="Dividendes perçus par année">
              {byYear.map((y) => (
                <div key={y.year} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${y.year} : ${fcfa(y.amount)}`}>
                  <span className="num max-w-full truncate text-[10px] font-medium text-ink-2">
                    {fcfa(y.amount)}
                  </span>
                  <div
                    className="w-full max-w-16 rounded-t-[3px] bg-up/60"
                    style={{ height: `${Math.max(6, (y.amount / maxYear) * 110)}px` }}
                  />
                  <span className="text-[10px] text-ink-3">{y.year}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {forecast.length > 0 ? (
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-accent" /> Calendrier
                projeté — 12 prochains mois
              </span>
            }
            subtitle={`≈ ${fcfa(annualTotal)} attendus si chaque société reconduit son dernier dividende au même mois`}
          />
          <CardBody className="space-y-1.5">
            {forecast.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-ink-2">
                  {MONTH_LABELS[m.month.slice(5, 7)]} {m.month.slice(0, 4)}
                </span>
                <div className="h-3.5 min-w-0 flex-1 rounded bg-surface-2/60">
                  <div
                    className="h-full rounded-[3px] bg-gold/70"
                    style={{ width: `${Math.max(2, (m.total / maxMonth) * 100)}%` }}
                    title={m.items.map((i) => `${i.ticker} ${fcfa(i.amount)}`).join(" · ")}
                  />
                </div>
                <span className="num w-24 shrink-0 text-right text-[11px] text-ink-2">
                  {fcfa(m.total)}
                </span>
                <span className="hidden w-16 shrink-0 truncate text-[10px] text-ink-3 sm:block">
                  {m.items.map((i) => i.ticker).join(", ")}
                </span>
              </div>
            ))}
            <p className="pt-1 text-[10px] leading-relaxed text-ink-3">
              Projection à dividende constant sur le mois historique de
              paiement de chaque société — pas une prévision.
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
