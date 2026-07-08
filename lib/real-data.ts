import type { OHLCV, RealQuote, Timeframe } from "./types";
import snapshotJson from "@/data/real/snapshot.json";
import { aggregate } from "./mock/series";

const SNAPSHOTS = snapshotJson as Record<string, RealQuote>;

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
export async function realSeriesForTimeframe(
  ticker: string,
  tf: Timeframe
): Promise<RealTimeframeData> {
  const daily = await loadRealDaily(ticker);
  const weekly = aggregate(daily, 5);
  const monthly = aggregate(daily, 21);

  const pick = (): OHLCV[] => {
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
        return weekly.slice(-156);
      case "5Y":
        return monthly.slice(-60);
    }
  };

  return { data: pick(), intradayAvailable: false };
}
