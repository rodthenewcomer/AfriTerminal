import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  Calendar,
  FileText,
  Flame,
  Radar,
  Rocket,
  TrendingDown,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { getIndices, getSnapshots } from "@/lib/data";
import { LATEST_TRADING_DATE } from "@/lib/real-data";
import { TODAY } from "@/lib/mock/stocks";
import { alertsOfDay } from "@/lib/mock/alerts";
import { latestDocuments } from "@/lib/mock/documents";
import { upcomingDividends } from "@/lib/mock/dividends";
import { IPOS } from "@/lib/mock/ipos";
import { dateFr, fcfa, num, pct } from "@/lib/format";
import { Sparkline } from "@/components/charts/sparkline";
import { PriceChange, SignalBadges } from "@/components/stocks/badges";
import { AlertCard } from "@/components/alerts/alert-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportanceBadge } from "@/components/documents/document-card";

export const metadata: Metadata = { title: "Dashboard" };

function MoverRow({
  ticker,
  name,
  price,
  change,
  extra,
}: {
  ticker: string;
  name: string;
  price: number;
  change: number;
  extra?: string;
}) {
  return (
    <Link
      href={`/stocks/${ticker}`}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-2 transition-colors"
    >
      <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold text-accent">
        {ticker}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-ink">{name}</span>
        {extra ? <span className="block text-[10px] text-ink-3">{extra}</span> : null}
      </span>
      <span className="text-right">
        <span className="block num text-xs font-semibold text-ink">{fcfa(price)}</span>
        <PriceChange value={change} className="text-[11px]" arrow={false} />
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const snapshots = getSnapshots();
  const indices = getIndices();
  const gainers = [...snapshots].sort((a, b) => b.dayChange - a.dayChange).slice(0, 5);
  const losers = [...snapshots].sort((a, b) => a.dayChange - b.dayChange).slice(0, 5);
  const unusualVolume = snapshots
    .filter((s) => s.volumeRatio >= 1.5)
    .sort((a, b) => b.volumeRatio - a.volumeRatio)
    .slice(0, 5);
  // Sur données réelles, pas de scores fondamentaux fiables : on classe par
  // amplitude du mouvement (variation absolue + ratio de volume) plutôt que
  // par qualité/momentum/risque (fictifs pour les tickers réels).
  const watchScore = (s: (typeof snapshots)[number]) =>
    s.real
      ? Math.abs(s.weekChange) * 1.5 + s.volumeRatio * 10
      : s.scores.quality + s.scores.momentum - s.scores.risk;
  const toWatch = [...snapshots].sort((a, b) => watchScore(b) - watchScore(a)).slice(0, 4);
  const dayAlerts = alertsOfDay();
  const docs = latestDocuments(4);
  const dividends = upcomingDividends(TODAY).slice(0, 5);
  const liveOps = IPOS.filter((i) => i.status !== "Clôturée").slice(0, 2);

  return (
    <div className="space-y-5 fade-in">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Votre radar BRVM intelligent
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Séance du {dateFr(LATEST_TRADING_DATE)} · Ne regarde pas seulement
            le prix. Comprends le mouvement.
          </p>
        </div>
        <Badge tone="positive" title="Cours, variations, volumes et indices réels (bulletins officiels BRVM) — alertes, documents et IPO restent simulés">
          Cours &amp; indices réels · alertes en démo
        </Badge>
      </div>

      {/* Indices */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {indices.map((idx) => (
          <Card key={idx.code} className="px-4 py-3.5 sm:px-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                {idx.name}
              </p>
              <p className="num mt-1 text-2xl font-bold text-ink">
                {idx.level.toFixed(2)}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs">
                <PriceChange value={idx.dayChange} />
                <span className="num text-ink-3">YTD {pct(idx.ytdChange)}</span>
              </p>
            </div>
            <Sparkline data={idx.spark} width={130} height={44} />
          </Card>
        ))}
      </div>

      {/* Movers */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-up" /> Top hausses
              </span>
            }
          />
          <CardBody className="space-y-0.5">
            {gainers.map((s) => (
              <MoverRow key={s.ticker} ticker={s.ticker} name={s.name} price={s.lastPrice} change={s.dayChange} />
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-down" /> Top baisses
              </span>
            }
          />
          <CardBody className="space-y-0.5">
            {losers.map((s) => (
              <MoverRow key={s.ticker} ticker={s.ticker} name={s.name} price={s.lastPrice} change={s.dayChange} />
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-warn" /> Volumes anormaux
              </span>
            }
          />
          <CardBody className="space-y-0.5">
            {unusualVolume.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-3">
                Aucun volume inhabituel aujourd&apos;hui.
              </p>
            ) : (
              unusualVolume.map((s) => (
                <MoverRow
                  key={s.ticker}
                  ticker={s.ticker}
                  name={s.name}
                  price={s.lastPrice}
                  change={s.dayChange}
                  extra={`${num(s.dayVolume)} titres · ${s.volumeRatio.toFixed(1)}× la moyenne`}
                />
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Alertes IA du jour */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Bell className="h-4 w-4 text-accent" /> Alertes intelligentes du jour
          </h2>
          <Link href="/alerts" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
            Tout voir <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-2.5 lg:grid-cols-3">
          {dayAlerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      </section>

      {/* Actions à surveiller + Documents */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <Radar className="h-3.5 w-3.5 text-violet" /> Actions à surveiller cette semaine
              </span>
            }
            subtitle="Plus forte amplitude (semaine × volume)"
          />
          <CardBody className="space-y-3">
            {toWatch.map((s) => (
              <Link
                key={s.ticker}
                href={`/stocks/${s.ticker}`}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {s.name} <span className="text-[11px] font-bold text-accent">{s.ticker}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="num text-sm font-semibold">{fcfa(s.lastPrice)}</span>
                    <PriceChange value={s.dayChange} className="text-xs" arrow={false} />
                  </span>
                </div>
                {s.real ? (
                  <p className="text-[11px] text-ink-3">
                    Variation 1 sem. {pct(s.weekChange)} · volume {s.volumeRatio.toFixed(1)}× la moyenne
                  </p>
                ) : (
                  <SignalBadges signals={s.signals} max={3} />
                )}
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-accent" /> Derniers documents BRVM
              </span>
            }
            action={
              <Link href="/documents" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <CardBody className="space-y-2.5">
            {docs.map((d) => (
              <Link
                key={d.id}
                href="/documents"
                className="flex items-start gap-3 rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold text-accent">
                  {d.ticker}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">{d.title}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-3 line-clamp-1">{d.summary}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <ImportanceBadge level={d.importance} />
                  <time className="text-[10px] text-ink-3">{dateFr(d.date)}</time>
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Dividendes + IPO */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gold" /> Dividendes à venir
              </span>
            }
            subtitle="Prochains détachements (net après IRVM 10 %)"
          />
          <CardBody>
            <ul className="divide-y divide-line/60">
              {dividends.map((d) => (
                <li key={d.ticker}>
                  <Link
                    href={`/stocks/${d.ticker}`}
                    className="flex items-center gap-3 py-2 hover:bg-surface-2 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-md bg-gold/10 text-[9px] font-bold text-gold">
                      {d.ticker}
                    </span>
                    <span className="flex-1 text-xs text-ink-2">
                      Détachement le{" "}
                      <span className="font-medium text-ink">{d.exDate ? dateFr(d.exDate) : "—"}</span>
                    </span>
                    <span className="num text-xs font-semibold text-ink">
                      {fcfa(d.net)} <span className="font-normal text-ink-3">net</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <Rocket className="h-3.5 w-3.5 text-accent" /> IPO & opérations en cours
              </span>
            }
            action={
              <Link href="/ipo" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <CardBody className="space-y-2.5">
            {liveOps.map((op) => (
              <Link
                key={op.id}
                href="/ipo"
                className="block rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{op.name}</span>
                  <Badge tone={op.status === "En cours" ? "positive" : "accent"}>{op.status}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-ink-3 line-clamp-2">{op.summary}</p>
              </Link>
            ))}
            <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 to-violet/10 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Flame className="h-3.5 w-3.5 text-accent" /> Comprendre le marché avant le marché
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
                Les documents officiels, transformés en signaux simples. Passez à
                AfriTerminal Pro pour le screener complet et les alertes IA.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
