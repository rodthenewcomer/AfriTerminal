import type {
  Derived,
  IndexInfo,
  SectorStats,
  Stock,
  StockSnapshot,
} from "@wariba/core/types";
import { STOCKS, STOCK_MAP } from "./mock/stocks";
import { getSeries } from "./mock/series";
import { IRVM_RATE } from "./mock/dividends";
import { computeScores, detectSignals } from "./signals";
import { generateInsight } from "./insights";
import { getAllRealQuotes, getRealQuote, REAL_INDICES } from "./real-data";
import { realOnlySnapshot } from "./real-universe";
import { companyProfile } from "@wariba/core/company-profiles";

function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

function computeDerived(stock: Stock): Derived {
  const { daily } = getSeries(stock.ticker);
  const n = daily.length;
  const last = daily[n - 1];
  const closeAt = (back: number): number => daily[Math.max(0, n - 1 - back)].close;

  const year = String(new Date(`${last.time}T00:00:00Z`).getUTCFullYear());
  const firstOfYear =
    daily.find((d) => typeof d.time === "string" && d.time >= `${year}-01-01`) ??
    daily[0];

  const avg30 =
    daily.slice(-31, -1).reduce((acc, d) => acc + d.volume, 0) / 30;

  const f = stock.fundamentals;
  const marketCap = stock.lastPrice * stock.sharesM * 1e6;
  const per = f.netIncome > 0 ? marketCap / (f.netIncome * 1e6) : -1;
  const netDividend = f.grossDividend * (1 - IRVM_RATE);

  return {
    marketCap,
    per,
    dayChange: pctChange(closeAt(1), last.close),
    weekChange: pctChange(closeAt(5), last.close),
    monthChange: pctChange(closeAt(21), last.close),
    ytdChange: pctChange(firstOfYear.close, last.close),
    yearChange: pctChange(closeAt(252), last.close),
    dayVolume: last.volume,
    volumeRatio: avg30 > 0 ? last.volume / avg30 : 1,
    yieldGross: (f.grossDividend / stock.lastPrice) * 100,
    yieldNet: (netDividend / stock.lastPrice) * 100,
    netDividend,
    netIncomeGrowth: pctChange(Math.abs(f.netIncomePrev), f.netIncome),
    revenueGrowth: pctChange(f.revenuePrev, f.revenue),
  };
}

let snapshots: StockSnapshot[] | null = null;

export function getSnapshots(): StockSnapshot[] {
  if (snapshots) return snapshots;
  // Tout l'univers coté au-delà des 15 fiches curées : snapshot construit
  // uniquement depuis la cotation réelle (fondamentaux masqués).
  const realOnly = getAllRealQuotes()
    .filter((q) => !STOCK_MAP.has(q.ticker))
    .map(realOnlySnapshot);
  const curated = STOCKS.map((stock) => {
    const derived = computeDerived(stock);
    const signals = detectSignals(stock, derived);
    const scores = computeScores(stock, derived);
    const insight = generateInsight(stock, derived, signals);
    const real = getRealQuote(stock.ticker);
    const base: StockSnapshot = {
      ...stock,
      ...derived,
      scores,
      signals,
      insight,
      real,
      // Fiche société curée (lib/company-profiles.ts) prioritaire sur la
      // description héritée de l'ère mock.
      description: companyProfile(stock.ticker) ?? stock.description,
    };

    if (!real) return base;

    // Prix/volume/PER/dividende réels remplacent les valeurs mockées partout
    // où ce snapshot est consommé (dashboard, marchés, screener, watchlist,
    // recherche). scores/signals/insight restent calculés sur les
    // fondamentaux fictifs — les composants doivent vérifier `real` avant
    // de les afficher (voir stock-view.tsx pour le pattern).
    return {
      ...base,
      lastPrice: real.lastClose,
      avgVolume30d: real.avgVolume30d,
      dayChange: real.dayChangePct,
      weekChange: real.weekChangePct,
      monthChange: real.monthChangePct,
      ytdChange: real.ytdChangePct,
      yearChange: real.yearChangePct,
      dayVolume: real.dayVolume,
      volumeRatio: real.volumeRatio,
      per: real.per ?? base.per,
      yieldNet: real.netYieldPct ?? base.yieldNet,
      netDividend: real.lastDividendNet ?? base.netDividend,
    };
  });
  snapshots = [...curated, ...realOnly].sort((a, b) =>
    a.ticker.localeCompare(b.ticker)
  );
  return snapshots;
}

export function getSnapshot(ticker: string): StockSnapshot | undefined {
  return getSnapshots().find((s) => s.ticker === ticker);
}

export function getSectorStats(): SectorStats[] {
  const groups = new Map<string, StockSnapshot[]>();
  for (const s of getSnapshots()) {
    const arr = groups.get(s.sector) ?? [];
    arr.push(s);
    groups.set(s.sector, arr);
  }
  return [...groups.entries()].map(([sector, arr]) => ({
    sector: sector as SectorStats["sector"],
    avgPer:
      arr.filter((s) => s.per > 0).reduce((acc, s) => acc + s.per, 0) /
      Math.max(1, arr.filter((s) => s.per > 0).length),
    avgRoe: arr.reduce((acc, s) => acc + s.fundamentals.roe, 0) / arr.length,
    avgYieldNet: arr.reduce((acc, s) => acc + s.yieldNet, 0) / arr.length,
    avgNetIncomeGrowth:
      arr.reduce((acc, s) => acc + s.netIncomeGrowth, 0) / arr.length,
    count: arr.length,
  }));
}

/** Moyenne des variations du jour par secteur — pour les barres
 * divergentes de l'accueil. Trié de la meilleure à la pire. */
export function getSectorPerformance(): {
  sector: string;
  avgDayChange: number;
  count: number;
}[] {
  const groups = new Map<string, number[]>();
  for (const s of getSnapshots()) {
    const arr = groups.get(s.sector) ?? [];
    arr.push(s.dayChange);
    groups.set(s.sector, arr);
  }
  return [...groups.entries()]
    .map(([sector, changes]) => ({
      sector,
      avgDayChange: changes.reduce((a, b) => a + b, 0) / changes.length,
      count: changes.length,
    }))
    .sort((a, b) => b.avgDayChange - a.avgDayChange);
}

/** Indices réels BRVM (bulletins officiels) — plus aucune valeur synthétique. */
export function getIndices(): IndexInfo[] {
  return REAL_INDICES;
}

export { STOCKS, STOCK_MAP };
