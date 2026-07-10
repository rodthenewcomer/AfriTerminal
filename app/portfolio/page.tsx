"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Briefcase,
  LineChart,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { usePortfolio, usePortfolioHydrated } from "@/hooks/use-portfolio";
import { computePositions, dividendIncome, projectedIncome, valuePortfolio } from "@/lib/portfolio";
import { dividendHistoryFor } from "@/lib/real-dividends";
import { Coins } from "lucide-react";
import { getSnapshot } from "@/lib/data";
import { dateFr, fcfa, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PriceChange } from "@/components/stocks/badges";
import { TransactionDialog } from "@/components/portfolio/transaction-dialog";
import { PerformanceChart } from "@/components/portfolio/performance-chart";
import { HoldingsFeed } from "@/components/portfolio/holdings-feed";

const PITCH: { icon: typeof BarChart3; text: string }[] = [
  {
    icon: BarChart3,
    text: "Suivez la performance réelle de vos actions : prix de revient, valeur actuelle, plus ou moins-value — actualisés avec chaque bulletin officiel.",
  },
  {
    icon: LineChart,
    text: "Visualisez la répartition de votre portefeuille par valeur et par secteur, pour voir d'un coup d'œil où votre argent travaille.",
  },
  {
    icon: Bell,
    text: "Retrouvez les actualités et documents officiels de VOS sociétés depuis leurs fiches, sans chercher.",
  },
  {
    icon: Sparkles,
    text: "À venir : analyses IA de votre portefeuille, alertes personnalisées et comparaison à l'indice BRVM Composite.",
  },
];

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "up" | "down";
}) {
  return (
    <div className="card-glass px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p
        className={cn(
          "num mt-1 text-lg font-bold sm:text-xl",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink-3">{sub}</p> : null}
    </div>
  );
}

export default function PortfolioPage() {
  const hydrated = usePortfolioHydrated();
  const transactions = usePortfolio((s) => s.transactions);
  const remove = usePortfolio((s) => s.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTx, setShowTx] = useState(false);

  const summary = useMemo(() => {
    const positions = computePositions(transactions);
    return valuePortfolio(positions, (t) => getSnapshot(t)?.lastPrice);
  }, [transactions]);

  const sectorAllocation = useMemo(() => {
    const bySector = new Map<string, number>();
    for (const p of summary.positions) {
      const sector = getSnapshot(p.ticker)?.sector ?? "Autre";
      bySector.set(sector, (bySector.get(sector) ?? 0) + p.marketValue);
    }
    return [...bySector.entries()]
      .map(([sector, value]) => ({
        sector,
        weightPct: summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.weightPct - a.weightPct);
  }, [summary]);

  const dividends = useMemo(
    () => dividendIncome(transactions, dividendHistoryFor),
    [transactions]
  );

  const projection = useMemo(() => {
    const positions = computePositions(transactions);
    return projectedIncome(
      positions,
      (t) => dividendHistoryFor(t).at(-1)?.net ?? null
    );
  }, [transactions]);
  const yieldOnCostOf = useMemo(
    () => new Map(projection.perPosition.map((x) => [x.ticker, x.yieldOnCost])),
    [projection]
  );

  const orderedTx = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const empty = hydrated && transactions.length === 0;

  return (
    <div className="stagger space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Portefeuille
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-3">
            Vos transactions, votre prix de revient, votre performance réelle —
            valorisés au dernier cours officiel BRVM. Tout reste dans ce
            navigateur : rien n&apos;est envoyé nulle part.
          </p>
        </div>
        {!empty ? (
          <Button variant="accent" size="sm" onClick={() => setDialogOpen(true)} disabled={!hydrated}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une transaction
          </Button>
        ) : null}
      </div>

      {empty ? (
        /* Premier contact : expliquer la valeur avant de demander une saisie */
        <Card className="relative overflow-hidden border-accent/25">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <CardBody className="space-y-5 p-6 sm:p-8">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                <Briefcase className="h-4 w-4" /> Créez votre premier portefeuille
              </p>
              <h2 className="mt-2 text-lg font-bold tracking-tight text-ink sm:text-xl">
                Prenez le contrôle de votre stratégie d&apos;investissement
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-3">
                Vous avez acheté des actions via votre SGI mais aucun moyen
                simple de savoir où vous en êtes ? Enregistrez vos opérations
                (quand, combien de titres, à quel prix) et AfriTerminal calcule
                le reste.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PITCH.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/50 p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-xs leading-relaxed text-ink-2">{text}</span>
                </li>
              ))}
            </ul>
            <Button variant="accent" onClick={() => setDialogOpen(true)} disabled={!hydrated}>
              <Plus className="h-4 w-4" /> Ajouter ma première transaction
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Chiffres clés */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Valeur actuelle" value={fcfa(summary.totalValue)} />
            <StatTile
              label="Montant investi"
              value={fcfa(summary.totalInvested)}
              sub={`${summary.positions.length} position${summary.positions.length > 1 ? "s" : ""}`}
            />
            <StatTile
              label="Plus/moins-value latente"
              value={`${summary.totalUnrealizedPnl >= 0 ? "+" : ""}${fcfa(summary.totalUnrealizedPnl)}`}
              sub={pct(summary.totalUnrealizedPnlPct, { digits: 2 })}
              tone={summary.totalUnrealizedPnl >= 0 ? "up" : "down"}
            />
            <StatTile
              label="Résultat réalisé (ventes)"
              value={`${summary.totalRealizedPnl >= 0 ? "+" : ""}${fcfa(summary.totalRealizedPnl)}`}
              tone={summary.totalRealizedPnl >= 0 ? "up" : "down"}
            />
            <StatTile
              label="Dividendes perçus (est.)"
              value={fcfa(dividends.total)}
              sub={`${dividends.events.length} versement${dividends.events.length > 1 ? "s" : ""}`}
              tone={dividends.total > 0 ? "up" : undefined}
            />
          </div>

          {/* Courbe du patrimoine */}
          <Card>
            <CardHeader
              title="Évolution de votre patrimoine"
              subtitle="Valeur du portefeuille séance par séance vs montant investi et BRVM Composite"
            />
            <CardBody>
              <PerformanceChart transactions={transactions} />
            </CardBody>
          </Card>

          {/* Positions */}
          <Card>
            <CardHeader
              title="Positions"
              subtitle="Valorisées au dernier cours officiel · PRU = prix de revient unitaire (coût moyen, frais inclus)"
            />
            <CardBody className="hidden overflow-x-auto p-0 md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/50 text-[11px] uppercase tracking-wide text-ink-3">
                    <th className="px-4 py-2.5 text-left font-medium">Valeur</th>
                    <th className="px-3 py-2.5 text-right font-medium">Qté</th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Prix de revient unitaire (coût moyen, frais inclus)">PRU</th>
                    <th className="px-3 py-2.5 text-right font-medium">Cours</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valeur</th>
                    <th className="px-3 py-2.5 text-right font-medium">+/- value</th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Rendement sur PRU : dernier dividende net / votre prix de revient — votre rendement personnel">Rdt/PRU</th>
                    <th className="px-3 py-2.5 text-right font-medium">Poids</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.positions.map((p) => {
                    const snap = getSnapshot(p.ticker);
                    return (
                      <tr key={p.ticker} className="border-b border-line/60 last:border-0 hover:bg-surface-2/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/stocks/${p.ticker}`} className="group inline-flex items-center gap-2">
                            <span className="flex h-7 w-9 items-center justify-center rounded-md bg-accent/10 text-[9px] font-bold text-accent">
                              {p.ticker}
                            </span>
                            <span className="max-w-44 truncate text-xs font-medium text-ink group-hover:text-accent">
                              {snap?.name ?? p.ticker}
                            </span>
                            {p.oversold ? (
                              <Badge tone="warning" title="Une vente dépasse la quantité détenue — vérifiez vos saisies">
                                à vérifier
                              </Badge>
                            ) : null}
                          </Link>
                        </td>
                        <td className="num px-3 py-2.5 text-right text-ink-2">{p.quantity}</td>
                        <td className="num px-3 py-2.5 text-right text-ink-2">{fcfa(p.averageCost)}</td>
                        <td className="num px-3 py-2.5 text-right font-medium text-ink">{fcfa(p.lastPrice)}</td>
                        <td className="num px-3 py-2.5 text-right font-medium text-ink">{fcfa(p.marketValue)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={cn("num font-medium", p.unrealizedPnl >= 0 ? "text-up" : "text-down")}>
                            {p.unrealizedPnl >= 0 ? "+" : ""}
                            {fcfa(p.unrealizedPnl)}
                          </span>{" "}
                          <PriceChange value={p.unrealizedPnlPct} className="text-[11px]" arrow={false} />
                        </td>
                        <td className="num px-3 py-2.5 text-right text-ink-2">
                          {yieldOnCostOf.has(p.ticker)
                            ? pct(yieldOnCostOf.get(p.ticker)!, { signed: false, digits: 1 })
                            : "—"}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-ink-2">
                          {pct(p.weightPct, { signed: false, digits: 1 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
            {/* Mobile : cartes compactes au lieu du tableau défilant */}
            <CardBody className="space-y-2 md:hidden">
              {summary.positions.map((p) => (
                <Link
                  key={p.ticker}
                  href={`/stocks/${p.ticker}`}
                  className="block min-w-0 rounded-xl border border-line bg-surface/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      <span className="text-[11px] font-bold text-accent">{p.ticker}</span>{" "}
                      · {p.quantity} titres
                    </span>
                    <span className="num text-sm font-semibold text-ink">
                      {fcfa(p.marketValue)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-ink-3">
                      PRU {fcfa(p.averageCost)} → {fcfa(p.lastPrice)}
                    </span>
                    <span className={cn("num font-medium", p.unrealizedPnl >= 0 ? "text-up" : "text-down")}>
                      {p.unrealizedPnl >= 0 ? "+" : ""}
                      {fcfa(p.unrealizedPnl)} ({pct(p.unrealizedPnlPct, { digits: 1 })})
                    </span>
                  </div>
                  {yieldOnCostOf.has(p.ticker) ? (
                    <p className="mt-1 text-[11px] text-ink-3">
                      Rendement sur votre PRU :{" "}
                      <span className="num font-medium text-ink-2">
                        {pct(yieldOnCostOf.get(p.ticker)!, { signed: false, digits: 1 })}
                      </span>
                    </p>
                  ) : null}
                </Link>
              ))}
            </CardBody>
          </Card>

          {/* Répartition */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader title="Répartition par valeur" subtitle="Part de la valeur actuelle du portefeuille" />
              <CardBody className="space-y-1.5">
                {summary.positions.map((p) => (
                  <div key={p.ticker} className="flex items-center gap-2" title={`${p.ticker} : ${pct(p.weightPct, { signed: false, digits: 1 })} · ${fcfa(p.marketValue)}`}>
                    <span className="w-14 shrink-0 text-[11px] font-bold text-accent">{p.ticker}</span>
                    <div className="h-3.5 min-w-0 flex-1 rounded bg-surface-2/60">
                      <div
                        className="h-full rounded-[3px] bg-accent/70"
                        style={{ width: `${Math.max(1, p.weightPct)}%` }}
                      />
                    </div>
                    <span className="num w-12 shrink-0 text-right text-[11px] text-ink-2">
                      {pct(p.weightPct, { signed: false, digits: 1 })}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Répartition par secteur" subtitle="Concentration sectorielle — la diversification se voit ici" />
              <CardBody className="space-y-1.5">
                {sectorAllocation.map((s) => (
                  <div key={s.sector} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-[11px] text-ink-2">{s.sector}</span>
                    <div className="h-3.5 min-w-0 flex-1 rounded bg-surface-2/60">
                      <div
                        className="h-full rounded-[3px] bg-gold/70"
                        style={{ width: `${Math.max(1, s.weightPct)}%` }}
                      />
                    </div>
                    <span className="num w-12 shrink-0 text-right text-[11px] text-ink-2">
                      {pct(s.weightPct, { signed: false, digits: 1 })}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          {/* Dividendes perçus + revenu projeté */}
          {dividends.events.length > 0 || projection.totalAnnual > 0 ? (
            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-accent" /> Dividendes perçus
                  </span>
                }
                subtitle="Estimation : titres détenus avant chaque date de paiement publiée au bulletin × dividende net (après IRVM 10 %)"
              />
              <CardBody className="space-y-1.5">
                {projection.totalAnnual > 0 ? (
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-ink">
                        Revenu annuel projeté :{" "}
                        <span className="num text-gold">{fcfa(projection.totalAnnual)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ink-3">
                        Si chaque société reconduit son dernier dividende —
                        projection à dividende constant, pas une prévision.
                      </p>
                    </div>
                    <p className="text-xs text-ink-2">
                      Rendement sur PRU du portefeuille :{" "}
                      <span className="num font-semibold text-ink">
                        {pct(projection.portfolioYieldOnCost, { signed: false, digits: 2 })}
                      </span>
                    </p>
                  </div>
                ) : null}
                {dividends.events.slice(0, 12).map((e) => (
                  <div
                    key={`${e.ticker}-${e.date}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/50 px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-accent">{e.ticker}</span>
                    <time className="text-ink-3">{dateFr(e.date)}</time>
                    <span className="num text-ink-2">
                      {e.quantityHeld} × {fcfa(e.netPerShare)}
                    </span>
                    <span className="num ml-auto font-semibold text-up">
                      +{fcfa(e.amount)}
                    </span>
                  </div>
                ))}
                {dividends.events.length > 12 ? (
                  <p className="text-[11px] text-ink-3">
                    + {dividends.events.length - 12} versement
                    {dividends.events.length - 12 > 1 ? "s" : ""} plus ancien
                    {dividends.events.length - 12 > 1 ? "s" : ""} inclus dans le
                    total.
                  </p>
                ) : null}
                <p className="pt-1 text-[10px] leading-relaxed text-ink-3">
                  L&apos;éligibilité réelle dépend de la date de détachement,
                  que le bulletin ne publie pas — un achat effectué entre le
                  détachement et le paiement peut être compté à tort.
                </p>
              </CardBody>
            </Card>
          ) : null}

          {/* Actus / docs / alertes des valeurs détenues */}
          <HoldingsFeed tickers={summary.positions.map((p) => p.ticker)} />

          {/* Transactions */}
          <Card>
            <CardHeader
              title={`Transactions (${transactions.length})`}
              action={
                <button
                  onClick={() => setShowTx((v) => !v)}
                  className="text-xs text-accent hover:underline cursor-pointer"
                >
                  {showTx ? "Masquer" : "Afficher"}
                </button>
              }
            />
            {showTx ? (
              <CardBody className="space-y-1.5">
                {orderedTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/50 px-3 py-2 text-xs"
                  >
                    <Badge tone={tx.side === "achat" ? "positive" : "warning"}>
                      {tx.side}
                    </Badge>
                    <span className="font-bold text-accent">{tx.ticker}</span>
                    <span className="num text-ink-2">
                      {tx.quantity} × {fcfa(tx.price)}
                      {tx.fees ? ` (+${fcfa(tx.fees)} frais)` : ""}
                    </span>
                    <time className="text-ink-3">{dateFr(tx.date)}</time>
                    <button
                      onClick={() => remove(tx.id)}
                      aria-label="Supprimer cette transaction"
                      className="ml-auto rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-down cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </CardBody>
            ) : null}
          </Card>
        </>
      )}

      <p className="text-[10px] text-ink-3">
        Le portefeuille est un outil de suivi personnel valorisé sur les cours
        officiels BRVM (différé : bulletin quotidien). Il ne constitue ni un
        compte-titres ni un conseil en investissement. Vos données vivent dans
        ce navigateur :{" "}
        <Link href="/settings" className="text-accent underline hover:no-underline">
          pensez à les sauvegarder
        </Link>
        .
      </p>

      <TransactionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
