"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { cn } from "@wariba/core/utils";
import { Bell, FileText, Sparkles } from "lucide-react";
import { getSectorStats, getSnapshot, getSnapshots } from "@/lib/data";
import { getRealQuote, LATEST_TRADING_DATE } from "@/lib/real-data";
import { getRealFundamentals, growthPct } from "@/lib/real-fundamentals";
import { newsDate, newsForTicker } from "@/lib/news";
import { realDocsForTicker } from "@/lib/real-documents";
import { DIVIDEND_MAP } from "@/lib/mock/dividends";
import {
  compactFcfa,
  compactVolume,
  dateFr,
  fcfa,
  millions,
  pct,
  ratio,
} from "@wariba/core/format";
import { MainChart } from "@/components/charts/main-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AIInsightCard } from "./ai-insight-card";
import { PriceChange, ScoreBadge, SignalBadges } from "./badges";
import { DividendPanel } from "./dividend-panel";
import { MetricCard } from "./metric-card";
import { SectorComparison } from "./sector-comparison";
import { DividendHistory } from "./dividend-history";
import { RiskStats } from "./risk-stats";
import { operationsForTicker } from "@/lib/real-operations";
import { Landmark } from "lucide-react";
import { WatchlistButton } from "./watchlist-button";
import { PriceAlertDialog } from "./price-alert-dialog";
import { usePriceAlerts } from "@/hooks/use-price-alerts";
import { useState } from "react";

const STOCK_TABS = [
  { id: "graphique", label: "Graphique" },
  { id: "fondamentaux", label: "Fondamentaux" },
  { id: "risque", label: "Risque & opérations" },
  { id: "actus", label: "Actus & documents" },
] as const;

type StockTabId = (typeof STOCK_TABS)[number]["id"];

const HASH_TO_TAB: Record<string, StockTabId> = {
  "#chart": "graphique",
  "#fondamentaux": "fondamentaux",
  "#actualites": "actus",
  "#documents": "actus",
};

export function StockView({ ticker }: { ticker: string }) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [tab, setTab] = useState<StockTabId>("graphique");
  // Deep-links historiques (#fondamentaux…) → bon onglet au montage.
  useEffect(() => {
    const mapped = HASH_TO_TAB[window.location.hash];
    if (mapped) setTab(mapped);
  }, []);
  const alertCount = usePriceAlerts((s) => s.alerts).filter(
    (a) => a.ticker === ticker
  ).length;
  // Ouvrir une fiche depuis le bas d'une longue liste (48 lignes) pouvait
  // conserver la position de scroll : la page arrivait « ouverte en bas ».
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ticker]);
  const stock = useMemo(() => getSnapshot(ticker), [ticker]);
  const real = useMemo(() => getRealQuote(ticker), [ticker]);
  const realFund = useMemo(() => getRealFundamentals(ticker), [ticker]);
  const news = useMemo(() => newsForTicker(ticker), [ticker]);

  if (!stock) return null;
  const docs = realDocsForTicker(ticker);
  const latestFinancialDoc = docs.find(
    (document) =>
      document.type === "Résultats" || document.type === "États financiers"
  );
  const dividend = DIVIDEND_MAP.get(ticker);
  const sectorStats = getSectorStats().find((s) => s.sector === stock.sector);
  const f = stock.fundamentals;

  const lastPrice = real?.lastClose ?? stock.lastPrice;
  const dayChange = real?.dayChangePct ?? stock.dayChange;
  const staleQuote = !!real && real.asOfDate !== LATEST_TRADING_DATE;

  return (
    <div className="space-y-4 fade-in">
      {/* Sticky price header */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-gold/20 text-[10px] font-black text-accent border border-accent/20">
            {stock.ticker}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
              {stock.name}
            </h1>
            <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
              BRVM · {stock.sector} · {stock.country}
              {real ? (
                <Badge
                  tone={staleQuote ? "warning" : "positive"}
                  title={`Données réelles BRVM au ${dateFr(real.asOfDate)}`}
                >
                  {staleQuote ? "Cotation suspendue" : "Données réelles"}
                </Badge>
              ) : (
                <Badge tone="gold">Scénario illustratif</Badge>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="num text-xl font-bold text-ink sm:text-2xl">
              {fcfa(lastPrice)}
            </p>
            <PriceChange value={dayChange} className="text-sm" />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <WatchlistButton ticker={stock.ticker} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertOpen(true)}
              title="Alerte de prix locale : seuil vérifié à chaque ouverture contre le dernier cours officiel"
            >
              <Bell className="h-3.5 w-3.5" /> Alerte
              {alertCount > 0 ? (
                <span className="rounded-full bg-accent/20 px-1.5 text-[10px] text-accent">
                  {alertCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </div>

      {/* Chart + résumé */}
      {/* min-w-0 sur l'item : 1fr = minmax(auto,1fr), le min-content de la
          toolbar défilante élargirait toute la page sur mobile sinon */}
      {/* Vrais onglets (audit produit) : la fiche empilait ~10 sections
          en un très long défilement, pénible sur mobile. Rendu paresseux :
          seul l'onglet actif est monté (le chart ne charge que sur le
          sien). Les anciens deep-links #fondamentaux etc. sont honorés
          au montage. */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Sections de la fiche">
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/60 p-0.5">
          {STOCK_TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-8 items-center whitespace-nowrap rounded-md px-3 text-xs font-medium cursor-pointer transition-colors",
                tab === id
                  ? "bg-surface text-ink shadow-sm border border-line"
                  : "text-ink-3 hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "graphique" ? (
        <>
      <div id="chart" className="scroll-mt-20 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="min-w-0 p-4 sm:p-5">
          <MainChart ticker={stock.ticker} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Résumé" />
            <CardBody className="space-y-3">
              {!real ? (
                <div className="grid grid-cols-2 gap-2">
                  <ScoreBadge kind="quality" value={stock.scores.quality} />
                  <ScoreBadge kind="valuation" value={stock.scores.valuation} />
                  <ScoreBadge kind="momentum" value={stock.scores.momentum} />
                  <ScoreBadge kind="risk" value={stock.scores.risk} />
                </div>
              ) : null}
              {real ? (
                <dl className="space-y-1.5 border-b border-line pb-3 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-3">Ouverture</dt>
                    <dd className="num font-medium text-ink">{fcfa(real.dayOpen)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-3">+ Haut / + Bas du jour</dt>
                    <dd className="num font-medium text-ink">
                      {fcfa(real.dayHigh)} / {fcfa(real.dayLow)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-3">Clôture veille</dt>
                    <dd className="num font-medium text-ink">{fcfa(real.prevClose)}</dd>
                  </div>
                  {real.dayValueFcfa ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-3">Valeur échangée</dt>
                      <dd className="num font-medium text-ink">{compactFcfa(real.dayValueFcfa)}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              <dl className="space-y-1.5 text-xs">
                {[
                  ["Variation 1 semaine", <PriceChange key="w" value={real?.weekChangePct ?? stock.weekChange} arrow={false} />],
                  ["Variation 1 mois", <PriceChange key="m" value={real?.monthChangePct ?? stock.monthChange} arrow={false} />],
                  ["Variation YTD", <PriceChange key="y" value={real?.ytdChangePct ?? stock.ytdChange} arrow={false} />],
                  ["Variation 1 an", <PriceChange key="a" value={real?.yearChangePct ?? stock.yearChange} arrow={false} />],
                ].map(([label, node], i) => (
                  <div key={i} className="flex items-center justify-between">
                    <dt className="text-ink-3">{label}</dt>
                    <dd className="num font-medium">{node}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <dt className="text-ink-3">Volume du jour</dt>
                  <dd className={`num font-medium ${(real?.volumeRatio ?? stock.volumeRatio) >= 3 ? "text-warn" : "text-ink"}`}>
                    {real?.quoteStatus === "delayed-live" ? (
                      <span className="text-ink-3">— · volume officiel après clôture</span>
                    ) : (
                      <>{compactVolume(real?.dayVolume ?? stock.dayVolume)}{" "}
                      <span className="text-ink-3">({(real?.volumeRatio ?? stock.volumeRatio).toFixed(1)}×)</span></>
                    )}
                  </dd>
                </div>
              </dl>
              {!real && stock.signals.length > 0 ? (
                <div className="border-t border-line pt-3">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Signaux détectés
                  </p>
                  <SignalBadges signals={stock.signals} />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="À propos" />
            <CardBody className="space-y-3">
              <p className="text-xs leading-relaxed text-ink-2">{stock.description}</p>
              {real ? (
                <div className="space-y-2.5 border-t border-line pt-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-ink-3">
                      <span>Clôtures extrêmes 52 semaines</span>
                      <span className="num text-ink-2">
                        {fcfa(real.week52Low)} – {fcfa(real.week52High)}
                      </span>
                    </div>
                    {/* Position du cours dans la fourchette 52 semaines */}
                    <div className="relative mt-1.5 h-1.5 rounded-full bg-surface-2">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-down/50 to-up/60"
                        style={{
                          width: `${
                            real.week52High > real.week52Low
                              ? Math.min(100, Math.max(0, ((real.lastClose - real.week52Low) / (real.week52High - real.week52Low)) * 100))
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-ink-3">
                      {real.lastClose >= real.week52High
                        ? "Au plus haut de ses 52 dernières semaines."
                        : `À ${pct(((real.lastClose - real.week52High) / real.week52High) * 100, { digits: 1 })} de son plus haut 52 semaines.`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-3">Record de clôture (depuis 2019)</span>
                    <span className="num font-medium text-ink">
                      {fcfa(real.allTimeHigh)}{" "}
                      <span className="font-normal text-ink-3">
                        le {dateFr(real.allTimeHighDate)}
                      </span>
                    </span>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

        </>
      ) : null}

      {tab === "fondamentaux" ? (
        <>
      {/* Métriques */}
      <section id="fondamentaux" className="scroll-mt-20">
        <h2 className="mb-2.5 text-sm font-semibold text-ink">Fondamentaux</h2>
        {real ? (
          <>
            {latestFinancialDoc ? (
              <a
                href={latestFinancialDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3.5 transition-colors hover:bg-accent/15"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-ink">
                    Dernière publication financière · {dateFr(latestFinancialDoc.date)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-2">
                    {latestFinancialDoc.title}
                  </span>
                  <span className="mt-1 block text-[10px] text-ink-3">
                    {realFund?.source === latestFinancialDoc.url
                      ? "Chiffres structurés ci-dessous issus de ce document vérifié."
                      : "Document officiel disponible immédiatement. Les chiffres structurés ci-dessous peuvent encore refléter la publication annuelle vérifiée précédente."}
                  </span>
                </span>
                <Badge tone={realFund?.source === latestFinancialDoc.url ? "positive" : "warning"}>
                  {realFund?.source === latestFinancialDoc.url ? "Intégrée" : "À lire"}
                </Badge>
              </a>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MetricCard label="PER" term="per" value={real.per ? ratio(real.per) : "—"} />
              <MetricCard
                label="Rendement net"
                term="rendement-net"
                value={real.netYieldPct ? pct(real.netYieldPct, { signed: false, digits: 2 }) : "—"}
                tone={real.netYieldPct && real.netYieldPct >= 6 ? "up" : undefined}
              />
              <MetricCard label="Vol. moyen 30 j" term="vol-moyen" value={compactVolume(real.avgVolume30d)} />
              <MetricCard
                label="Dernier dividende net"
                term="dividende-net"
                value={real.lastDividendNet ? fcfa(real.lastDividendNet) : "—"}
                hint={real.lastDividendDate ? `Payé le ${dateFr(real.lastDividendDate)}` : undefined}
              />
              {realFund?.sharesOutstanding ? (
                <>
                  <MetricCard
                    label="Capitalisation"
                    term="capitalisation"
                    value={compactFcfa(realFund.sharesOutstanding * lastPrice)}
                    hint={`${(realFund.sharesOutstanding / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M d'actions`}
                  />
                  <MetricCard
                    label={`BPA ${realFund.fiscalYear}`}
                    value={fcfa((realFund.netIncomeM * 1e6) / realFund.sharesOutstanding)}
                    hint="Bénéfice net par action"
                  />
                  {realFund.equityM ? (
                    <MetricCard
                      label="P/B"
                      term="pb"
                      value={ratio(
                        lastPrice / ((realFund.equityM * 1e6) / realFund.sharesOutstanding)
                      )}
                    />
                  ) : null}
                </>
              ) : null}
              {/* Le ROE n'a pas besoin du nombre d'actions — affiché dès
                  que les capitaux propres sont vérifiés (ex. ETIT). */}
              {realFund?.equityM ? (
                <MetricCard
                  label={`ROE ${realFund.fiscalYear}`}
                  term="roe"
                  value={pct((realFund.netIncomeM / realFund.equityM) * 100, { signed: false, digits: 1 })}
                />
              ) : null}
              {realFund ? (
                <>
                  <MetricCard
                    label={`${realFund.revenueLabel} ${realFund.fiscalYear}`}
                    value={millions(realFund.revenueM)}
                    hint={(() => {
                      const g = growthPct(realFund.revenueM, realFund.revenuePrevM);
                      return g !== null ? `${pct(g, { digits: 1 })} vs ${realFund.fiscalYear - 1}` : undefined;
                    })()}
                  />
                  <MetricCard
                    label={`Résultat net ${realFund.fiscalYear}`}
                    value={millions(realFund.netIncomeM)}
                    hint={(() => {
                      const g = growthPct(realFund.netIncomeM, realFund.netIncomePrevM);
                      return g !== null ? `${pct(g, { digits: 1 })} vs ${realFund.fiscalYear - 1}` : undefined;
                    })()}
                  />
                  <MetricCard
                    label="Marge nette"
                    term="marge-nette"
                    value={pct((realFund.netIncomeM / realFund.revenueM) * 100, { signed: false, digits: 1 })}
                  />
                  {realFund.ordinaryIncomeM !== null ? (
                    <MetricCard
                      label="Résultat ordinaire"
                      term="resultat-ordinaire"
                      value={millions(realFund.ordinaryIncomeM)}
                      tone={realFund.ordinaryIncomeM < 0 ? "down" : undefined}
                    />
                  ) : null}
                  {realFund.cirPct !== null ? (
                    <MetricCard
                      label="Coefficient d'exploitation"
                      term="cir"
                      value={pct(realFund.cirPct, { signed: false, digits: 1 })}
                      hint={realFund.cirPrevPct !== null ? `${pct(realFund.cirPrevPct, { signed: false, digits: 1 })} en ${realFund.fiscalYear - 1}` : undefined}
                    />
                  ) : null}
                  {realFund.costOfRiskM !== null ? (
                    <MetricCard
                      label="Coût du risque"
                      term="cout-du-risque"
                      value={millions(realFund.costOfRiskM)}
                      hint={realFund.costOfRiskM < 0 ? "Négatif = reprise nette" : undefined}
                    />
                  ) : null}
                  {realFund.depositsM !== null ? (
                    <MetricCard
                      label="Dépôts clientèle"
                      value={millions(realFund.depositsM)}
                      hint={(() => {
                        const g = growthPct(realFund.depositsM, realFund.depositsPrevM);
                        return g !== null ? `${pct(g, { digits: 1 })} vs ${realFund.fiscalYear - 1} — l'argent que les clients confient` : "L'argent que les clients confient à la banque";
                      })()}
                    />
                  ) : null}
                  {realFund.loansM !== null ? (
                    <MetricCard
                      label="Crédits clientèle"
                      value={millions(realFund.loansM)}
                      hint={
                        realFund.depositsM
                          ? `${pct((realFund.loansM / realFund.depositsM) * 100, { signed: false, digits: 0 })} des dépôts sont prêtés`
                          : "Ce que la banque prête"
                      }
                    />
                  ) : null}
                  {realFund.proposedGrossDividend !== null ? (
                    <MetricCard
                      label="Dividende brut proposé"
                      value={fcfa(realFund.proposedGrossDividend)}
                      hint={`Au titre de ${realFund.fiscalYear}, soumis à l'AG`}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
            {realFund ? (
              <p className="mt-2.5 text-[11px] text-ink-3">
                États financiers exercice {realFund.fiscalYear} publiés le{" "}
                {dateFr(realFund.publishedOn)} —{" "}
                <a
                  href={realFund.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  document source (BRVM)
                </a>
                , extraction vérifiée et recoupée avec l&apos;exercice précédent.
                {realFund.sharesOutstanding
                  ? realFund.equityM !== null
                    ? " Capitalisation, BPA, P/B et ROE sont calculés sur le nombre d'actions et les capitaux propres vérifiés au document."
                    : " Capitalisation et BPA sont calculés sur le nombre d'actions vérifié (deux sources concordantes) ; P/B et ROE attendent des capitaux propres lisibles au bilan."
                  : realFund.equityM !== null
                    ? " ROE calculé sur les capitaux propres vérifiés au document ; capitalisation, BPA et P/B attendent un nombre d'actions confirmé par deux sources concordantes."
                    : " Capitalisation, BPA, P/B et ROE restent indisponibles : nombre d'actions non confirmé par deux sources et capitaux propres absents ou non lisibles dans la publication liée."}
              </p>
            ) : (
              <p className="mt-2.5 text-[11px] text-ink-3">
                Capitalisation, P/B, ROE, résultat net et payout ne sont pas
                disponibles : la BRVM ne publie pas les états financiers dans le
                bulletin quotidien — seulement les cours et les dividendes.
              </p>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Capitalisation" term="capitalisation" value={compactFcfa(stock.marketCap)} />
            <MetricCard
              label="PER"
              value={stock.per > 0 ? ratio(stock.per) : "—"}
              hint={sectorStats ? `Secteur : ${ratio(sectorStats.avgPer)}` : undefined}
            />
            <MetricCard label="P/B" term="pb" value={ratio(f.pb)} />
            <MetricCard label="ROE" term="roe" value={pct(f.roe, { signed: false, digits: 1 })} />
            <MetricCard
              label="Rendement net"
              value={pct(stock.yieldNet, { signed: false, digits: 2 })}
              tone={stock.yieldNet >= 6 ? "up" : undefined}
            />
            <MetricCard
              label="Payout"
              term="payout"
              value={pct(f.payout, { signed: false, digits: 0 })}
              tone={f.payout > 90 ? "warn" : undefined}
            />
            <MetricCard
              label={`${f.revenueLabel} ${f.revenueLabel === "PNB" ? "" : "annuel"}`}
              value={millions(f.revenue)}
              hint={`${pct(stock.revenueGrowth, { digits: 1 })} vs N-1`}
            />
            <MetricCard
              label="Résultat net"
              value={millions(f.netIncome)}
              hint={`${pct(stock.netIncomeGrowth, { digits: 1 })} vs N-1`}
              tone={f.ordinaryIncome < 0 ? "warn" : undefined}
            />
            <MetricCard
              label="Résultat ordinaire"
              value={millions(f.ordinaryIncome)}
              tone={f.ordinaryIncome < 0 ? "down" : undefined}
              hint={f.ordinaryIncome < 0 ? "Cœur d'activité déficitaire" : undefined}
            />
            <MetricCard
              label="Vol. moyen 30 j"
              value={compactVolume(stock.avgVolume30d)}
              hint={`Aujourd'hui : ${stock.volumeRatio.toFixed(1)}×`}
            />
          </div>
        )}
      </section>

      {/* Historique réel des dividendes (si ≥ 2 versements connus) */}
      {real ? <DividendHistory ticker={stock.ticker} /> : null}

      {/* Analyse IA + dividendes */}
      {real ? (
        <Card>
          <CardBody className="flex items-start gap-3 py-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
            <p className="text-xs leading-relaxed text-ink-2">
              {realFund
                ? `L'analyse IA, les signaux et la comparaison sectorielle ne sont pas encore calculés sur données réelles — les états financiers ${realFund.fiscalYear} de cette société sont intégrés (voir Fondamentaux), mais un score robuste exige encore un historique pluriannuel normalisé, un benchmark sectoriel et une méthodologie publiée.`
                : "L'analyse IA, les signaux et la comparaison sectorielle restent indisponibles tant qu'aucune publication financière vérifiée n'est intégrée pour cette valeur. Les cours, volumes, PER et dividendes affichés restent issus des sources BRVM."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AIInsightCard insight={stock.insight} />
          <div className="space-y-4">
            <DividendPanel stock={stock} dividend={dividend} />
            <SectorComparison stock={stock} stats={sectorStats} />
          </div>
        </div>
      )}

        </>
      ) : null}

      {tab === "risque" ? (
        <>
      {/* Profil de risque calculé (volatilité, bêta, perte max) */}
      <RiskStats ticker={stock.ticker} />

      {/* Opérations sur capital de la société (splits, augmentations) */}
      {(() => {
        const ops = operationsForTicker(stock.ticker);
        if (ops.length === 0) return null;
        return (
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-accent" /> Opérations
                  sur capital
                </span>
              }
              subtitle="Splits, augmentations et réductions actés à la BRVM pour cette société"
            />
            <CardBody className="space-y-1.5">
              {ops.map((op, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/50 px-3 py-2 text-xs"
                >
                  <Badge tone="accent">{op.kind}</Badge>
                  {op.date ? <time className="text-ink-3">{dateFr(op.date)}</time> : null}
                  {op.parity ? (
                    <span className="min-w-0 flex-1 truncate text-ink-2">{op.parity}</span>
                  ) : null}
                  {op.avisPdf ? (
                    <a
                      href={op.avisPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline text-ink-3 hover:text-ink"
                    >
                      Avis officiel
                    </a>
                  ) : null}
                </div>
              ))}
            </CardBody>
          </Card>
        );
      })()}

      {/* Valeurs comparables : même secteur, les plus liquides */}
      {(() => {
        const peers = getSnapshots()
          .filter((s) => s.sector === stock.sector && s.ticker !== stock.ticker)
          .sort((a, b) => b.avgVolume30d * b.lastPrice - a.avgVolume30d * a.lastPrice)
          .slice(0, 4);
        if (peers.length === 0) return null;
        return (
          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-ink">
              Dans le même secteur ({stock.sector})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {peers.map((s) => (
                <Link
                  key={s.ticker}
                  href={`/stocks/${s.ticker}`}
                  className="min-w-0 rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-accent">{s.ticker}</span>
                    <PriceChange value={s.dayChange} className="text-[11px]" arrow={false} />
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium text-ink">{s.name}</p>
                  <p className="mt-1 flex items-center justify-between text-[11px] text-ink-3">
                    <span className="num text-ink-2">{fcfa(s.lastPrice)}</span>
                    <span className="num">PER {s.per > 0 ? ratio(s.per) : "—"}</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

        </>
      ) : null}

      {tab === "actus" ? (
        <>
      {/* Actualités réelles */}
      {news.length > 0 ? (
        <section id="actualites" className="scroll-mt-20">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Actualités</h2>
            <Badge tone="positive">Sources réelles</Badge>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {news.map((n) => (
              <a
                key={n.link}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                <p className="text-xs font-semibold text-ink line-clamp-2">{n.title}</p>
                {n.summary ? (
                  <p className="mt-1 text-[11px] text-ink-3 line-clamp-2">{n.summary}</p>
                ) : null}
                <p className="mt-1.5 text-[10px] text-ink-3">
                  {n.source} · {newsDate(n.publishedAt)}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* Documents */}
      <section id="documents" className="scroll-mt-20">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Documents officiels</h2>
          <Badge tone="neutral">{docs.length} document{docs.length > 1 ? "s" : ""}</Badge>
        </div>
        {docs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-3">
            Aucun document référencé pour cette valeur.
          </Card>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {docs.map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-w-0 rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
              >
                <p className="text-xs font-semibold text-ink group-hover:text-accent">
                  {d.title}
                </p>
                <p className="mt-1 text-[11px] text-ink-3">
                  {d.type} · {dateFr(d.date)} · PDF officiel (brvm.org)
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

        </>
      ) : null}

      <PriceAlertDialog
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        ticker={stock.ticker}
        lastPrice={lastPrice}
      />

      <p className="text-[10px] text-ink-3">
        {real
          ? `${real.quoteStatus === "delayed-live" ? "Cours différé de 15 min" : "Clôture"}, volumes officiels, PER, dividendes, documents et alertes réels (sources BRVM, au ${dateFr(real.asOfDate)}).`
          : "Les informations présentées sont fournies à titre éducatif et informatif sur scénario illustratif, sans cotation vérifiée."}{" "}
        Ceci ne constitue pas un conseil en investissement.
      </p>

    </div>
  );
}
