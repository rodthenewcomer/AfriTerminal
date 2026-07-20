import type { IndexInfo, LiveMarketPayload, OHLCV, RealQuote, Timeframe } from "@wariba/core/types";
import { mergeLiveQuoteMap } from "@wariba/core/live-market";
import {
  sliceSeriesByTimeframe,
  validateMarketSeries,
} from "@wariba/core/market-series";
import snapshotJson from "@/data/real/snapshot.json";
import indicesJson from "@/data/real/indices.json";
import liveJson from "@/data/real/live.json";

const BASE_SNAPSHOTS = snapshotJson as Record<string, RealQuote>;
const LIVE_MARKET = liveJson as LiveMarketPayload;
const SNAPSHOTS = mergeLiveQuoteMap(BASE_SNAPSHOTS, LIVE_MARKET);

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

export const HAS_DELAYED_LIVE_QUOTES = Object.values(SNAPSHOTS).some(
  (quote) => quote.quoteStatus === "delayed-live"
);

export const LATEST_OFFICIAL_CLOSE_DATE: string = Object.values(BASE_SNAPSHOTS)
  .map((quote) => quote.asOfDate)
  .reduce((a, b) => (a > b ? a : b), "");

const LIVE_TIME = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Abidjan",
}).format(new Date(LIVE_MARKET.updatedAt));

const OFFICIAL_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${LATEST_OFFICIAL_CLOSE_DATE}T00:00:00Z`));

export const MARKET_DATA_LABEL = HAS_DELAYED_LIVE_QUOTES
  ? `Cours différés 15 min · ${LIVE_TIME}`
  : `Clôture officielle du ${OFFICIAL_DATE}`;

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
  const promise = import(`../data/real/series/${ticker}.json`).then((mod) => {
    const data = mod.default as OHLCV[];
    const errors = validateMarketSeries(data, BASE_SNAPSHOTS[ticker]?.lastClose).filter(
      (issue) => issue.severity === "error"
    );
    if (errors.length > 0) {
      throw new Error(
        `Série ${ticker} rejetée: ${errors.map((issue) => issue.code).join(", ")}`
      );
    }
    return data;
  });
  dailyCache.set(ticker, promise);
  return promise;
}

export interface RealTimeframeData {
  data: OHLCV[];
  intradayAvailable: boolean;
}

/** Équivalent réel de seriesForTimeframe (lib/mock/series.ts). */
/** Clôtures quotidiennes complètes d'un ticker depuis une date (incluse) —
 * pour la reconstruction de la valeur d'un portefeuille dans le temps. */
export async function realDailyClosesSince(
  ticker: string,
  fromDate: string
): Promise<{ time: string; close: number }[]> {
  const daily = await loadRealDaily(ticker);
  return daily
    .filter((d) => typeof d.time === "string" && d.time >= fromDate)
    .map((d) => ({ time: d.time as string, close: d.close }));
}

/** Clôtures quotidiennes d'un indice depuis une date (incluse). */
export async function realIndexDailyClosesSince(
  code: string,
  fromDate: string
): Promise<{ time: string; close: number }[]> {
  const all = await loadIndexDaily(code);
  return all
    .filter((d) => typeof d.time === "string" && d.time >= fromDate)
    .map((d) => ({ time: d.time as string, close: d.close }));
}

export async function realSeriesForTimeframe(
  ticker: string,
  tf: Timeframe
): Promise<RealTimeframeData> {
  const official = await loadRealDaily(ticker);
  const live = LIVE_MARKET.quotes[ticker];
  const hasLive = !!live && LIVE_MARKET.asOfDate > String(official.at(-1)?.time ?? "");

  if (tf === "1D") {
    const points = hasLive
      ? live.points.map((point) => ({
          time: Math.floor(Date.parse(point.time) / 1000),
          open: point.price,
          high: point.price,
          low: point.price,
          close: point.price,
          volume: 0,
        }))
      : [];
    return { data: points, intradayAvailable: points.length > 0 };
  }

  const daily = hasLive
    ? [
        ...official,
        {
          time: LIVE_MARKET.asOfDate,
          open: live.open,
          high: live.high,
          low: live.low,
          close: live.close,
          volume: 0,
        },
      ]
    : official;
  return { data: sliceSeriesByTimeframe(daily, tf), intradayAvailable: hasLive };
}

const indexSeriesCache = new Map<string, Promise<OHLCV[]>>();

function loadIndexDaily(code: string): Promise<OHLCV[]> {
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
  return cached;
}

/**
 * Historique réel d'un indice (BRVMC, BRVM30, BRVMPRES) découpé comme les
 * actions, pour la comparaison dans le chart. Le bulletin ne publie qu'un
 * niveau de clôture par jour : open/high/low sont ce même niveau.
 */
export async function realIndexSeriesForTimeframe(
  code: string,
  tf: Timeframe
): Promise<OHLCV[]> {
  return sliceSeriesByTimeframe(await loadIndexDaily(code), tf);
}
