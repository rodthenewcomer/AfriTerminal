/**
 * Statistiques de risque calculées sur les clôtures quotidiennes réelles
 * (séries BOC) — fonctions pures, testées. Conventions standard :
 * volatilité annualisée = σ(rendements quotidiens) × √252 ; bêta =
 * cov(titre, indice) / var(indice) sur rendements quotidiens appariés
 * par date ; drawdown max = pire baisse depuis un sommet de clôture.
 */

export interface DailyClose {
  time: string;
  close: number;
}

function dailyReturns(closes: DailyClose[]): { time: string; r: number }[] {
  const out: { time: string; r: number }[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1].close;
    if (prev > 0) out.push({ time: closes[i].time, r: closes[i].close / prev - 1 });
  }
  return out;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Volatilité annualisée en %, ou null si moins de 30 points. */
export function annualizedVolatility(closes: DailyClose[]): number | null {
  const rs = dailyReturns(closes).map((x) => x.r);
  if (rs.length < 30) return null;
  const m = mean(rs);
  const variance = mean(rs.map((r) => (r - m) ** 2));
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/** Pire baisse depuis un sommet, en % (négatif), avec dates du sommet
 * et du creux. null si moins de 2 points. */
export function maxDrawdown(
  closes: DailyClose[]
): { pct: number; peakDate: string; troughDate: string } | null {
  if (closes.length < 2) return null;
  let peak = closes[0];
  let best = { pct: 0, peakDate: peak.time, troughDate: peak.time };
  for (const c of closes) {
    if (c.close > peak.close) peak = c;
    const dd = peak.close > 0 ? (c.close / peak.close - 1) * 100 : 0;
    if (dd < best.pct) best = { pct: dd, peakDate: peak.time, troughDate: c.time };
  }
  return best;
}

/** Bêta vs indice sur rendements quotidiens appariés par date —
 * null si moins de 30 séances communes ou variance d'indice nulle. */
export function beta(
  stock: DailyClose[],
  index: DailyClose[]
): number | null {
  const stockR = new Map(dailyReturns(stock).map((x) => [x.time, x.r]));
  const pairs: [number, number][] = [];
  for (const { time, r } of dailyReturns(index)) {
    const sr = stockR.get(time);
    if (sr !== undefined) pairs.push([sr, r]);
  }
  if (pairs.length < 30) return null;
  const ms = mean(pairs.map((p) => p[0]));
  const mi = mean(pairs.map((p) => p[1]));
  const cov = mean(pairs.map(([s, i]) => (s - ms) * (i - mi)));
  const varI = mean(pairs.map(([, i]) => (i - mi) ** 2));
  if (varI === 0) return null;
  return cov / varI;
}
