import type { LiveMarketPayload, RealQuote } from "./types";

function performanceAtPrice(
  priorPerformancePct: number,
  priorPrice: number,
  currentPrice: number
): number {
  const anchor = priorPrice / (1 + priorPerformancePct / 100);
  if (!Number.isFinite(anchor) || anchor <= 0) return priorPerformancePct;
  return Math.round((((currentPrice - anchor) / anchor) * 100) * 100) / 100;
}

/**
 * Superpose le dernier cours différé BRVM à la dernière clôture officielle.
 * Les volumes restent volontairement à zéro : la page publique utilisée par
 * le collecteur ne publie pas le volume intraday, et une absence vaut mieux
 * qu'un volume de la veille présenté comme actuel.
 */
export function mergeLiveQuote(base: RealQuote, live: LiveMarketPayload): RealQuote {
  const point = live.quotes[base.ticker];
  if (!point || live.asOfDate <= base.asOfDate) {
    return {
      ...base,
      quoteStatus: "official-close",
      officialCloseDate: base.asOfDate,
    };
  }

  const current = point.close;
  const change = base.lastClose > 0
    ? Math.round((((current - base.lastClose) / base.lastClose) * 100) * 100) / 100
    : 0;

  return {
    ...base,
    asOfDate: live.asOfDate,
    asOfTimestamp: point.lastSeen,
    officialCloseDate: base.asOfDate,
    quoteStatus: "delayed-live",
    lastClose: current,
    prevClose: base.lastClose,
    dayChangePct: change,
    weekChangePct: performanceAtPrice(base.weekChangePct, base.lastClose, current),
    monthChangePct: performanceAtPrice(base.monthChangePct, base.lastClose, current),
    quarterChangePct: performanceAtPrice(base.quarterChangePct, base.lastClose, current),
    halfYearChangePct: performanceAtPrice(base.halfYearChangePct, base.lastClose, current),
    ytdChangePct: performanceAtPrice(base.ytdChangePct, base.lastClose, current),
    yearChangePct: performanceAtPrice(base.yearChangePct, base.lastClose, current),
    fiveYearChangePct: performanceAtPrice(base.fiveYearChangePct, base.lastClose, current),
    dayOpen: point.open,
    dayHigh: point.high,
    dayLow: point.low,
    dayVolume: 0,
    dayValueFcfa: null,
    volumeRatio: 0,
    // Ces trois métriques sont explicitement des records de clôture. Un plus
    // haut intraday ne doit pas silencieusement en changer la définition.
    week52High: base.week52High,
    week52Low: base.week52Low,
    allTimeHigh: base.allTimeHigh,
    allTimeHighDate: base.allTimeHighDate,
    sparkline: [...base.sparkline.slice(-29), current],
  };
}

export function mergeLiveQuoteMap(
  base: Record<string, RealQuote>,
  live: LiveMarketPayload
): Record<string, RealQuote> {
  return Object.fromEntries(
    Object.entries(base).map(([ticker, quote]) => [ticker, mergeLiveQuote(quote, live)])
  );
}
