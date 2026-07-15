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
import { latestSessionAlerts, REAL_ALERTS } from "@/lib/real-alerts";
import { MarketMap } from "@/components/markets/market-map";
import { SectorPerformance } from "@/components/markets/sector-performance";
import { latestNews, newsDate } from "@/lib/news";
import { latestNotices } from "@/lib/real-operations";
import { dateFr, fcfa, num, pct } from "@wariba/core/format";
import { Sparkline } from "@/components/charts/sparkline";
import { PriceChange, SignalBadges } from "@/components/stocks/badges";
import { AlertCard } from "@/components/alerts/alert-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/ui/info-hint";

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
  const dayAlerts = latestSessionAlerts(3);
  // Breadth de la dernière séance (barre hausses/baisses façon Finviz)
  const advancing = snapshots.filter((s) => s.dayChange > 0).length;
  const declining = snapshots.filter((s) => s.dayChange < 0).length;
  const unchanged = snapshots.length - advancing - declining;
  // Extrêmes 52 semaines depuis le moteur d'alertes (fenêtre 5 séances)
  const extremes = REAL_ALERTS.filter((a) => a.title.includes("52 semaines"));
  const highs = extremes.filter((a) => a.severity === "positive").slice(0, 5);
  const lows = extremes.filter((a) => a.severity === "warning").slice(0, 5);
  const byTicker = new Map(snapshots.map((s) => [s.ticker, s]));
  const news = latestNews(6);
  // Derniers dividendes réellement payés (bulletin officiel) — remplace
  // l'ancien calendrier fictif. Tri par date de paiement décroissante.
  const dividends = [...snapshots]
    .filter((s) => s.real?.lastDividendNet && s.real.lastDividendDate)
    .sort((a, b) =>
      b.real!.lastDividendDate!.localeCompare(a.real!.lastDividendDate!)
    )
    .slice(0, 5);
  const liveOps = latestNotices(3);

  return (
    <div className="space-y-5 stagger">
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
        <InfoHint
          label="Données réelles · scénarios séparés"
          text="Cours, variations, volumes, indices, alertes et documents réels (bulletins officiels BRVM et fiches sociétés) — seuls les cas pédagogiques de l'onglet Apprendre sont simulés."
        >
          <Badge tone="positive">Données réelles · scénarios séparés</Badge>
        </InfoHint>
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

      {/* Breadth : hausses / baisses de la séance */}
      <div className="card-glass px-4 py-3">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-up">Hausses {advancing}</span>
          <span className="text-ink-3">Inchangées {unchanged}</span>
          <span className="text-down">Baisses {declining}</span>
        </div>
        <div className="mt-1.5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
          <span className="bg-up" style={{ width: `${(advancing / snapshots.length) * 100}%` }} />
          <span className="bg-ink-3/30" style={{ width: `${(unchanged / snapshots.length) * 100}%` }} />
          <span className="bg-down" style={{ width: `${(declining / snapshots.length) * 100}%` }} />
        </div>
      </div>

      {/* Performance sectorielle — barres divergentes (moyenne du jour) */}
      <Card>
        <CardHeader
          title="Performance par secteur"
          subtitle="Moyenne des variations de la séance · nombre de valeurs à droite"
        />
        <CardBody>
          <SectorPerformance />
        </CardBody>
      </Card>

      {/* Mini carte + extrêmes 52 semaines */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Carte du marché"
            action={
              <Link href="/map" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Agrandir <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <CardBody>
            <MarketMap compact />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Extrêmes 52 semaines"
            subtitle="Franchissements des 5 dernières séances"
          />
          <CardBody className="space-y-0.5">
            {highs.length === 0 && lows.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-3">
                Aucun extrême franchi récemment.
              </p>
            ) : (
              <>
                {highs.map((a) => {
                  const s = a.ticker ? byTicker.get(a.ticker) : undefined;
                  return s ? (
                    <MoverRow key={a.id} ticker={s.ticker} name={s.name} price={s.lastPrice} change={s.dayChange} extra="Plus haut 52 semaines" />
                  ) : null;
                })}
                {lows.map((a) => {
                  const s = a.ticker ? byTicker.get(a.ticker) : undefined;
                  return s ? (
                    <MoverRow key={a.id} ticker={s.ticker} name={s.name} price={s.lastPrice} change={s.dayChange} extra="Plus bas 52 semaines" />
                  ) : null;
                })}
              </>
            )}
          </CardBody>
        </Card>
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
            <Bell className="h-4 w-4 text-accent" /> Alertes de la dernière séance
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

      {/* Actualités — après l'état du marché (hiérarchie revue sur
          audit produit : le terminal répond d'abord à « que s'est-il
          passé aujourd'hui ? », le contexte presse vient ensuite) */}
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-accent" /> Actualités marchés
              </span>
            }
            subtitle="Sika Finance · Financial Afrik — liens vers les articles originaux"
            action={
              <Link href="/news" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <CardBody className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {news.map((n) => (
              <a
                key={n.link}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                {n.tickers.length > 0 ? (
                  <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold text-accent">
                    {n.tickers[0]}
                  </span>
                ) : (
                  <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[9px] font-bold text-ink-3">
                    BRVM
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-ink line-clamp-2">{n.title}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-3">
                    {n.source} · {newsDate(n.publishedAt)}
                  </span>
                </span>
              </a>
            ))}
          </CardBody>
        </Card>

      {/* Actions à surveiller + Dividendes + Avis officiels */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <Radar className="h-3.5 w-3.5 text-accent" /> Actions à surveiller cette semaine
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
                <Calendar className="h-3.5 w-3.5 text-gold" /> Derniers dividendes payés
              </span>
            }
            subtitle="Dividendes nets réels (source : bulletins officiels BRVM)"
          />
          <CardBody>
            <ul className="divide-y divide-line/60">
              {dividends.map((s) => (
                <li key={s.ticker}>
                  <Link
                    href={`/stocks/${s.ticker}`}
                    className="flex items-center gap-3 py-2 hover:bg-surface-2 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-md bg-gold/10 text-[9px] font-bold text-gold">
                      {s.ticker}
                    </span>
                    <span className="flex-1 text-xs text-ink-2">
                      Payé le{" "}
                      <span className="font-medium text-ink">
                        {dateFr(s.real!.lastDividendDate!)}
                      </span>
                    </span>
                    <span className="num text-xs font-semibold text-ink">
                      {fcfa(s.real!.lastDividendNet!)}{" "}
                      <span className="font-normal text-ink-3">net</span>
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
                <Rocket className="h-3.5 w-3.5 text-accent" /> Avis officiels BRVM
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
              <a
                key={op.pdf}
                href={op.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink line-clamp-2">{op.title}</span>
                  <Badge tone="positive">Officiel</Badge>
                </div>
                <p className="mt-1 text-[11px] text-ink-3">{dateFr(op.date)} · PDF (brvm.org)</p>
              </a>
            ))}
            <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 to-gold/10 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Flame className="h-3.5 w-3.5 text-accent" /> Comprendre le marché avant le marché
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
                Les documents officiels deviennent un flux de surveillance. Les
                comptes, alertes personnalisées et synthèses avancées restent à
                brancher avant une offre Pro.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
