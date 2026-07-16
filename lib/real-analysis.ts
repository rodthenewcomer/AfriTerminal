import { analyzeRealEquity, type RealEquityAnalysis } from "@wariba/core/real-analysis";
import { getAllRealQuotes } from "./real-data";
import { getAllRealFundamentals } from "./real-fundamentals";

let cache = new Map<string, RealEquityAnalysis | null>();

/** Analyse synchrone : elle se recalcule automatiquement au prochain build
 * ou rafraîchissement dès que snapshot.json/fundamentals.json changent. */
export function getRealAnalysis(ticker: string): RealEquityAnalysis | null {
  const key = ticker.toUpperCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  const analysis = analyzeRealEquity({
    ticker: key,
    quotes: getAllRealQuotes(),
    fundamentals: getAllRealFundamentals(),
  });
  cache.set(key, analysis);
  return analysis;
}

export function clearRealAnalysisCache(): void {
  cache = new Map();
}
