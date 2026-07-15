import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { allDividendEvents, dividendsByMonth, isRecurring } from "@/lib/dividend-calendar";
import { fcfa, dateFr } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Term } from "@/components/ui/term";

export const metadata: Metadata = {
  title: "Calendrier des dividendes",
  description:
    "Saisonnalité réelle des dividendes BRVM : quels mois de l'année les sociétés cotées ont historiquement versé un dividende, et le journal complet des versements.",
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

/**
 * Pas de dates d'ex-dividende publiées par la BRVM dans un format
 * structuré — la seule vue « à venir » honnête est la saisonnalité :
 * ce que chaque société a versé, mois par mois, les années passées.
 * Jamais présenté comme une date certaine (voir bandeau + méthodologie).
 */
export default function DividendCalendarPage() {
  const snapshots = getSnapshots();
  const tickers = snapshots.filter((s) => s.real).map((s) => s.ticker);
  const nameOf = new Map(snapshots.map((s) => [s.ticker, s.name]));
  const byMonth = dividendsByMonth(tickers);
  const events = allDividendEvents(tickers);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const orderedMonths = Array.from({ length: 12 }, (_, i) => ((currentMonth - 1 + i) % 12) + 1);
  const upNext = orderedMonths.slice(0, 3);

  return (
    <div className="stagger max-w-4xl space-y-4">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
          <CalendarClock className="h-5 w-5 text-accent" /> Calendrier des dividendes
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          La BRVM ne publie pas de date d&apos;ex-dividende à l&apos;avance dans
          un format exploitable : ceci n&apos;est donc pas un calendrier
          d&apos;annonces mais une{" "}
          <Term id="saisonnalite">saisonnalité</Term> — les mois où chaque société
          a réellement versé un dividende net par le passé.{" "}
          <strong className="text-ink-2">Récurrence n&apos;est pas garantie</strong>{" "}
          — chaque montant vient du dernier versement réel, pas d&apos;une
          prévision.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {upNext.map((m) => {
          const entries = byMonth[m].filter(isRecurring);
          return (
            <Card key={m}>
              <CardHeader
                title={MONTH_NAMES[m - 1]}
                subtitle={
                  entries.length > 0
                    ? `${entries.length} société${entries.length > 1 ? "s" : ""} récurrente${entries.length > 1 ? "s" : ""}`
                    : "Aucun historique récurrent"
                }
              />
              <CardBody className="space-y-1.5">
                {entries.length === 0 ? (
                  <p className="text-xs text-ink-3">
                    Pas de versement observé au moins deux années sur ce mois.
                  </p>
                ) : (
                  entries.slice(0, 6).map((e) => (
                    <Link
                      key={e.ticker}
                      href={`/stocks/${e.ticker}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-surface-2"
                    >
                      <span className="min-w-0 truncate text-ink-2">
                        <span className="font-semibold text-ink">{e.ticker}</span>{" "}
                        <span className="text-ink-3">· {e.years.length} ans</span>
                      </span>
                      <span className="num shrink-0 font-medium text-ink">
                        {fcfa(e.lastNet)}
                      </span>
                    </Link>
                  ))
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title="Les 12 mois de l'année"
          subtitle="Toutes les sociétés ayant versé un dividende ce mois-ci au moins une fois depuis 2019 — badge doré si récurrent (≥ 2 années)."
        />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MONTH_NAMES.map((label, i) => {
            const m = i + 1;
            const entries = byMonth[m];
            if (entries.length === 0) return null;
            return (
              <div key={m} className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="mb-1.5 text-xs font-semibold text-ink">{label}</p>
                <div className="flex flex-wrap gap-1">
                  {entries.map((e) => (
                    <Link key={e.ticker} href={`/stocks/${e.ticker}`}>
                      <Badge tone={isRecurring(e) ? "gold" : "neutral"}>
                        {e.ticker}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Journal des versements"
          subtitle={`${events.length} versements réels enregistrés, du plus récent au plus ancien.`}
        />
        <CardBody className="max-h-[28rem] overflow-y-auto p-0">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-2 text-left sm:px-5">Société</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right sm:px-5">Net / action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={`${e.ticker}-${e.date}-${i}`} className="border-t border-line/60">
                  <td className="px-4 py-2 sm:px-5">
                    <Link href={`/stocks/${e.ticker}`} className="font-medium text-ink hover:text-accent">
                      {e.ticker}
                    </Link>
                    <span className="ml-1.5 hidden text-ink-3 sm:inline">
                      {nameOf.get(e.ticker)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{dateFr(e.date)}</td>
                  <td className="num px-4 py-2 text-right font-medium text-ink sm:px-5">
                    {fcfa(e.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <p className="text-[10px] text-ink-3">
        Montants nets par action, après IRVM 10 % — issus des bulletins
        officiels BRVM. Pour vos titres détenus, voir la projection de revenu
        dans{" "}
        <Link href="/portfolio" className="underline hover:text-ink">
          Portefeuille
        </Link>
        . Détail des sources :{" "}
        <Link href="/methodologie" className="underline hover:text-ink">
          méthodologie
        </Link>
        .
      </p>
    </div>
  );
}
