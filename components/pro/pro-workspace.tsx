"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  GitCompareArrows,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@wariba/core/utils";
import { fcfa, pct, ratio } from "@wariba/core/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export interface ProResearchRow {
  ticker: string;
  name: string;
  sector: string;
  country: string;
  price: number;
  dayChange: number;
  ytdChange: number;
  per: number | null;
  yieldNet: number | null;
  volumeRatio: number;
  overallScore: number;
  quality: number;
  valuation: number;
  momentum: number;
  risk: number;
  dividend: number;
  liquidity: number;
  confidence: "high" | "medium" | "low";
  confidenceLabel: string;
  coveragePct: number;
  confidenceReasons: string[];
  fiscalYear: number;
  publishedOn: string;
  signals: { id: string; label: string; tone: "positive" | "negative" | "warning" | "neutral" }[];
}

type SortKey = "overall" | "quality" | "valuation" | "momentum" | "dividend" | "liquidity" | "protection" | "ytd";
type ConfidenceFilter = "all" | ProResearchRow["confidence"];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "overall", label: "Score factuel" },
  { value: "quality", label: "Qualité" },
  { value: "valuation", label: "Valorisation" },
  { value: "momentum", label: "Momentum" },
  { value: "dividend", label: "Dividende" },
  { value: "liquidity", label: "Liquidité" },
  { value: "protection", label: "Protection au risque" },
  { value: "ytd", label: "Performance YTD" },
];

const FACTORS = [
  { key: "quality", label: "Qualité", inverse: false },
  { key: "valuation", label: "Valorisation", inverse: false },
  { key: "momentum", label: "Momentum", inverse: false },
  { key: "risk", label: "Risque", inverse: true },
  { key: "dividend", label: "Dividende", inverse: false },
  { key: "liquidity", label: "Liquidité", inverse: false },
] as const;

function scoreTone(value: number): string {
  if (value >= 65) return "bg-up";
  if (value >= 40) return "bg-warn";
  return "bg-down";
}

function researchBand(score: number): string {
  if (score >= 70) return "Position relative élevée";
  if (score >= 55) return "Au-dessus de l’échantillon";
  if (score >= 45) return "Zone intermédiaire";
  return "Sous l’échantillon";
}

function safeRatio(value: number | null): string {
  return value !== null && value > 0 ? ratio(value) : "—";
}

function safePct(value: number | null): string {
  return value !== null ? pct(value, { digits: 2 }) : "—";
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function FactorBar({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const favorable = inverse ? 100 - value : value;
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate text-ink-3">{label}</span>
        <span className="num font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
        <span
          className={cn("block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", scoreTone(favorable))}
          style={{ width: `${Math.max(3, value)}%` }}
        />
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-3 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <p className="num mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-ink-3">{detail}</p>
    </div>
  );
}

function toCsv(rows: ProResearchRow[]): string {
  const columns = [
    "Ticker", "Société", "Secteur", "Pays", "Cours FCFA", "Variation YTD %", "PER", "Rendement net %",
    "Score factuel", "Qualité", "Valorisation", "Momentum", "Risque", "Dividende", "Liquidité", "Confiance", "Couverture %", "Exercice",
  ];
  const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns, ...rows.map((row) => [
    row.ticker, row.name, row.sector, row.country, row.price, row.ytdChange, row.per, row.yieldNet,
    row.overallScore, row.quality, row.valuation, row.momentum, row.risk, row.dividend, row.liquidity, row.confidenceLabel, row.coveragePct, row.fiscalYear,
  ])].map((line) => line.map(escape).join(";")).join("\n");
}

export function ProWorkspace({ rows, marketLabel, methodologyVersion }: {
  rows: ProResearchRow[];
  marketLabel: string;
  methodologyVersion: string;
}) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("all");
  const [sort, setSort] = useState<SortKey>("overall");
  const [selected, setSelected] = useState<string[]>([]);

  const sectors = useMemo(() => [...new Set(rows.map((row) => row.sector))].sort(), [rows]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return rows
      .filter((row) => sector === "all" || row.sector === sector)
      .filter((row) => confidence === "all" || row.confidence === confidence)
      .filter((row) => !normalizedQuery || `${row.ticker} ${row.name}`.toLocaleLowerCase("fr").includes(normalizedQuery))
      .sort((a, b) => {
        if (sort === "quality") return b.quality - a.quality;
        if (sort === "valuation") return b.valuation - a.valuation;
        if (sort === "momentum") return b.momentum - a.momentum;
        if (sort === "dividend") return b.dividend - a.dividend;
        if (sort === "liquidity") return b.liquidity - a.liquidity;
        if (sort === "protection") return a.risk - b.risk;
        if (sort === "ytd") return b.ytdChange - a.ytdChange;
        return b.overallScore - a.overallScore || a.ticker.localeCompare(b.ticker);
      });
  }, [confidence, query, rows, sector, sort]);
  const compared = useMemo(() => selected.flatMap((ticker) => rows.find((row) => row.ticker === ticker) ?? []), [rows, selected]);

  const accounts2025 = rows.filter((row) => row.fiscalYear === 2025).length;
  const limitedConfidence = rows.filter((row) => row.confidence === "low").length;
  const averageCoverage = Math.round(rows.reduce((sum, row) => sum + row.coveragePct, 0) / Math.max(1, rows.length));

  const toggleCompare = (ticker: string) => {
    setSelected((current) => {
      if (current.includes(ticker)) return current.filter((item) => item !== ticker);
      if (current.length >= 3) return [...current.slice(1), ticker];
      return [...current, ticker];
    });
  };

  const exportVisibleRows = () => {
    const blob = new Blob([`\uFEFF${toCsv(filtered)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wariba-laboratoire-48-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 stagger">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent" className="font-semibold">WARIBA Pro</Badge>
              <span className="text-[11px] text-ink-3">{methodologyVersion}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">Laboratoire 48</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
              Comparez toute la cote avec le même moteur factuel : qualité, valorisation, momentum, risque, dividende, liquidité, fraîcheur des comptes et niveau de confiance. Le rang est relatif à l’échantillon ; ce n’est pas un signal d’achat ou de vente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={exportVisibleRows}>
              <Download className="h-4 w-4" /> Exporter {filtered.length} ligne{filtered.length > 1 ? "s" : ""}
            </Button>
            <Link href="/methodologie#score-factuel" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-background hover:brightness-110">
              Lire la méthode <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="grid divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <SummaryMetric label="Univers analysé" value={`${rows.length}/48`} detail={marketLabel} />
          <SummaryMetric label="Comptes 2025" value={`${accounts2025}`} detail={`${rows.length - accounts2025} dossier${rows.length - accounts2025 > 1 ? "s" : ""} antérieur${rows.length - accounts2025 > 1 ? "s" : ""}`} />
          <SummaryMetric label="Couverture moyenne" value={`${averageCoverage} %`} detail="Pondérations alimentées par les données disponibles" />
          <SummaryMetric label="Confiance limitée" value={`${limitedConfidence}`} detail="Signal à lire avant toute comparaison" />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label="Filtres du laboratoire">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-accent" /> Explorer l’univers
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_200px_180px_210px]">
          <label className="relative">
            <span className="sr-only">Rechercher une action</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker ou société" className="pl-9" />
          </label>
          <label>
            <span className="sr-only">Secteur</span>
            <Select value={sector} onChange={(event) => setSector(event.target.value)}>
              <option value="all">Tous les secteurs</option>
              {sectors.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </label>
          <label>
            <span className="sr-only">Niveau de confiance</span>
            <Select value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceFilter)}>
              <option value="all">Toute confiance</option>
              <option value="medium">Confiance moyenne</option>
              <option value="low">Confiance limitée</option>
              <option value="high">Confiance élevée</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Trier les résultats</span>
            <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              {SORTS.map((item) => <option key={item.value} value={item.value}>Trier : {item.label}</option>)}
            </Select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
          <span>{filtered.length} valeur{filtered.length > 1 ? "s" : ""} · tri descriptif</span>
          <span>Sélectionnez jusqu’à 3 titres pour les mettre côte à côte.</span>
        </div>
      </section>

      {compared.length ? (
        <section className="fade-in rounded-2xl border border-accent/30 bg-surface" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div>
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><GitCompareArrows className="h-4 w-4 text-accent" /> Comparaison active</h2>
              <p className="mt-0.5 text-[11px] text-ink-3">{compared.length === 1 ? "Ajoutez un deuxième titre pour comparer." : `${compared.length} titres, mêmes facteurs et même date de marché.`}</p>
            </div>
            <button onClick={() => setSelected([])} className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"><X className="h-3.5 w-3.5" /> Effacer</button>
          </div>
          <div className={cn("grid divide-y divide-line", compared.length >= 2 && "md:grid-cols-2 md:divide-x md:divide-y-0", compared.length === 3 && "xl:grid-cols-3")}>
            {compared.map((row) => (
              <div key={row.ticker} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/stocks/${row.ticker}`} className="text-base font-bold text-ink hover:text-accent">{row.ticker}</Link>
                    <p className="truncate text-xs text-ink-3">{row.name}</p>
                  </div>
                  <div className="text-right"><p className="num text-2xl font-bold text-ink">{row.overallScore}</p><p className="text-[10px] text-ink-3">sur 100</p></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  {FACTORS.map((factor) => <FactorBar key={factor.key} label={factor.label} value={row[factor.key]} inverse={factor.inverse} />)}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                  <div><dt className="text-[10px] text-ink-3">PER</dt><dd className="num mt-0.5 text-xs font-semibold text-ink">{safeRatio(row.per)}</dd></div>
                  <div><dt className="text-[10px] text-ink-3">Rdt net</dt><dd className="num mt-0.5 text-xs font-semibold text-ink">{safePct(row.yieldNet)}</dd></div>
                  <div><dt className="text-[10px] text-ink-3">YTD</dt><dd className={cn("num mt-0.5 text-xs font-semibold", row.ytdChange >= 0 ? "text-up" : "text-down")}>{pct(row.ytdChange, { signed: true })}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1">
                  {row.signals.slice(0, 3).map((signal) => <Badge key={signal.id} tone={signal.tone}>{signal.label}</Badge>)}
                </div>
                <p className="mt-3 text-[10px] leading-4 text-ink-3">
                  Publié le {shortDate(row.publishedOn)} · {row.coveragePct} % de couverture. {row.confidenceReasons[0]}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1240px] border-collapse text-left">
            <thead className="border-b border-line bg-surface-2/60 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              <tr>
                <th className="w-12 px-4 py-3 text-center">Rang</th>
                <th className="px-3 py-3">Action</th>
                <th className="w-32 px-3 py-3">Score</th>
                <th className="w-[330px] px-3 py-3">Facteurs</th>
                <th className="px-3 py-3 text-right">PER</th>
                <th className="px-3 py-3 text-right">Rdt net</th>
                <th className="px-3 py-3 text-right">YTD</th>
                <th className="px-3 py-3">Comptes</th>
                <th className="w-14 px-3 py-3 text-center">Comparer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filtered.map((row, index) => {
                const active = selected.includes(row.ticker);
                return (
                  <tr key={row.ticker} className={cn("transition-colors hover:bg-surface-2/45", active && "bg-accent/5")}>
                    <td className="num px-4 py-3 text-center text-xs text-ink-3">{index + 1}</td>
                    <td className="px-3 py-3">
                      <Link href={`/stocks/${row.ticker}`} className="group block max-w-[230px]">
                        <span className="font-semibold text-ink group-hover:text-accent">{row.ticker}</span>
                        <span className="ml-2 text-xs text-ink-3">{row.name}</span>
                        <span className="mt-0.5 block text-[10px] text-ink-3">{row.sector} · {row.country}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {row.signals.slice(0, 2).map((signal) => <Badge key={signal.id} tone={signal.tone} className="max-w-[180px] truncate">{signal.label}</Badge>)}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2"><span className="num text-lg font-bold text-ink">{row.overallScore}</span><span className="text-[10px] leading-3 text-ink-3">{researchBand(row.overallScore)}</span></div>
                    </td>
                    <td className="px-3 py-3"><div className="grid grid-cols-3 gap-2">{FACTORS.map((factor) => <FactorBar key={factor.key} label={factor.label} value={row[factor.key]} inverse={factor.inverse} />)}</div></td>
                    <td className="num px-3 py-3 text-right text-xs font-medium text-ink">{safeRatio(row.per)}</td>
                    <td className="num px-3 py-3 text-right text-xs font-medium text-ink">{safePct(row.yieldNet)}</td>
                    <td className={cn("num px-3 py-3 text-right text-xs font-semibold", row.ytdChange >= 0 ? "text-up" : "text-down")}>{pct(row.ytdChange, { signed: true })}</td>
                    <td className="px-3 py-3" title={row.confidenceReasons.join(" ")}><p className="text-xs font-medium text-ink">{row.fiscalYear}</p><p className="text-[10px] text-ink-3">Publié {shortDate(row.publishedOn)}</p><p className="text-[10px] text-ink-3">{row.confidenceLabel} · {row.coveragePct} %</p></td>
                    <td className="px-3 py-3 text-center">
                      <button aria-label={`${active ? "Retirer" : "Ajouter"} ${row.ticker} ${active ? "de" : "à"} la comparaison`} aria-pressed={active} onClick={() => toggleCompare(row.ticker)} className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors", active ? "border-accent bg-accent text-background" : "border-line text-ink-3 hover:border-accent/50 hover:text-accent")}>
                        {active ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line md:hidden">
          {filtered.map((row, index) => {
            const active = selected.includes(row.ticker);
            return (
              <article key={row.ticker} className={cn("p-4", active && "bg-accent/5")}>
                <div className="flex items-start gap-3">
                  <span className="num mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[10px] font-semibold text-ink-3">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/stocks/${row.ticker}`} className="font-bold text-ink">{row.ticker} <span className="font-normal text-ink-3">· {row.name}</span></Link>
                    <p className="mt-0.5 text-[10px] text-ink-3">{row.sector} · comptes {row.fiscalYear} · confiance {row.confidenceLabel.toLowerCase()}</p>
                  </div>
                  <div className="text-right"><p className="num text-xl font-bold text-ink">{row.overallScore}</p><p className="text-[9px] text-ink-3">score / 100</p></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">{FACTORS.map((factor) => <FactorBar key={factor.key} label={factor.label} value={row[factor.key]} inverse={factor.inverse} />)}</div>
                <div className="mt-3 flex flex-wrap gap-1">{row.signals.slice(0, 3).map((signal) => <Badge key={signal.id} tone={signal.tone}>{signal.label}</Badge>)}</div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
                    <span>Cours <strong className="font-semibold text-ink">{fcfa(row.price)}</strong></span>
                    <span>PER <strong className="font-semibold text-ink">{safeRatio(row.per)}</strong></span>
                    <span>YTD <strong className={row.ytdChange >= 0 ? "text-up" : "text-down"}>{pct(row.ytdChange, { signed: true })}</strong></span>
                  </div>
                  <button aria-label={`${active ? "Retirer" : "Ajouter"} ${row.ticker} ${active ? "de" : "à"} la comparaison`} aria-pressed={active} onClick={() => toggleCompare(row.ticker)} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold", active ? "border-accent bg-accent text-background" : "border-line text-ink-2")}>
                    {active ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5" />}{active ? "Ajouté" : "Comparer"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-ink-3">Publié le {shortDate(row.publishedOn)} · {row.coveragePct} % de couverture.</p>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 ? <div className="px-5 py-14 text-center"><Search className="mx-auto h-5 w-5 text-ink-3" /><p className="mt-2 text-sm font-semibold text-ink">Aucun titre ne correspond</p><p className="mt-1 text-xs text-ink-3">Réinitialisez un filtre ou changez la recherche.</p></div> : null}
      </section>

      <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4 text-xs leading-5 text-ink-2 sm:p-5 lg:grid-cols-3">
        <div><ShieldCheck className="h-4 w-4 text-accent" /><p className="mt-2 font-semibold text-ink">Même méthode pour 48 titres</p><p className="mt-1 text-ink-3">Aucune donnée absente n’est inventée. La couverture et la confiance restent visibles.</p></div>
        <div><GitCompareArrows className="h-4 w-4 text-accent" /><p className="mt-2 font-semibold text-ink">Comparer, pas recommander</p><p className="mt-1 text-ink-3">Les rangs décrivent la position relative du jour. Ils ne prédisent ni prix ni rendement futur.</p></div>
        <div><Download className="h-4 w-4 text-accent" /><p className="mt-2 font-semibold text-ink">Export traçable</p><p className="mt-1 text-ink-3">L’export reprend les lignes filtrées, les quatre piliers du score et les deux scores complémentaires.</p></div>
      </section>
    </div>
  );
}
