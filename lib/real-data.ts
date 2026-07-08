import type { IndexInfo, OHLCV, RealQuote, Timeframe } from "./types";
import snapshotJson from "@/data/real/snapshot.json";
import indicesJson from "@/data/real/indices.json";
import { aggregate } from "./mock/series";

const SNAPSHOTS = snapshotJson as Record<string, RealQuote>;

interface RealIndexJson {
  code: string;
  name: string;
  asOfDate: string;
  level: number;
  dayChangePct: number;
  ytdChangePct: number;
  spark: number[];
}

/** Indices réels BRVM (Composite, 30, Prestige) issus des bulletins officiels. */
export const REAL_INDICES: IndexInfo[] = (indicesJson as RealIndexJson[]).map(
  (i) => ({
    code: i.code,
    name: i.name,
    level: i.level,
    dayChange: i.dayChangePct,
    ytdChange: i.ytdChangePct,
    spark: i.spark,
  })
);

/** Dernière séance couverte par le pipeline (max des dates de cotation). */
export const LATEST_TRADING_DATE: string = Object.values(SNAPSHOTS)
  .map((q) => q.asOfDate)
  .reduce((a, b) => (a > b ? a : b), "");

/** Tickers pour lesquels on a un vrai historique (pipeline scripts/boc/). */
export const REAL_TICKERS: ReadonlySet<string> = new Set(Object.keys(SNAPSHOTS));

export function isRealTicker(ticker: string): boolean {
  return REAL_TICKERS.has(ticker);
}

export function getRealQuote(ticker: string): RealQuote | undefined {
  return SNAPSHOTS[ticker];
}

export function getAllRealQuotes(): RealQuote[] {
  return Object.values(SNAPSHOTS);
}

const dailyCache = new Map<string, Promise<OHLCV[]>>();

/**
 * Charge l'historique quotidien réel d'un ticker via import dynamique —
 * un fichier par ticker (~150-190 Ko), jamais tous chargés en même temps.
 * Le fichier est trouvé au build par le contexte webpack (répertoire fixe,
 * nom de fichier variable), donc le code-splitting reste correct.
 */
async function loadRealDaily(ticker: string): Promise<OHLCV[]> {
  const cached = dailyCache.get(ticker);
  if (cached) return cached;
  const promise = import(`../data/real/series/${ticker}.json`).then(
    (mod) => mod.default as OHLCV[]
  );
  dailyCache.set(ticker, promise);
  return promise;
}

export interface RealTimeframeData {
  data: OHLCV[];
  /** Aucun historique intraday réel n'est publié par la BRVM. */
  intradayAvailable: false;
}

/** Équivalent réel de seriesForTimeframe (lib/mock/series.ts), sans 1D/1W. */
function sliceByTimeframe(daily: OHLCV[], tf: Timeframe): OHLCV[] {
  switch (tf) {
    case "1D":
    case "1W":
      return []; // pas de données intraday réelles
    case "1M":
      return daily.slice(-22);
    case "3M":
      return daily.slice(-66);
    case "6M":
      return daily.slice(-130);
    case "YTD": {
      const year = (daily[daily.length - 1]?.time as string)?.slice(0, 4);
      return daily.filter(
        (d) => typeof d.time === "string" && d.time >= `${year}-01-01`
      );
    }
    case "1Y":
      return daily.slice(-252);
    case "3Y":
      return aggregate(daily, 5).slice(-156);
    case "5Y":
      return aggregate(daily, 21).slice(-60);
  }
}

export async function realSeriesForTimeframe(
  ticker: string,
  tf: Timeframe
): Promise<RealTimeframeData> {
  const daily = await loadRealDaily(ticker);
  return { data: sliceByTimeframe(daily, tf), intradayAvailable: false };
}

const indexSeriesCache = new Map<string, Promise<OHLCV[]>>();

/**
 * Historique réel d'un indice (BRVMC, BRVM30, BRVMPRES) découpé comme les
 * actions, pour la comparaison dans le chart. Le bulletin ne publie qu'un
 * niveau de clôture par jour : open/high/low sont ce même niveau.
 */
export async function realIndexSeriesForTimeframe(
  code: string,
  tf: Timeframe
): Promise<OHLCV[]> {
  let cached = indexSeriesCache.get(code);
  if (!cached) {
    cached = import(`../data/real/index-series/${code}.json`).then((mod) =>
      (mod.default as { time: string; value: number }[]).map((r) => ({
        time: r.time,
        open: r.value,
        high: r.value,
        low: r.value,
        close: r.value,
        volume: 0,
      }))
    );
    indexSeriesCache.set(code, cached);
  }
  return sliceByTimeframe(await cached, tf);
}
