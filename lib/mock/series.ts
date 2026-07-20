import type { OHLCV, SeriesProfile, Timeframe } from "@wariba/core/types";
import { sliceSeriesByTimeframe } from "@wariba/core/market-series";
import { STOCK_MAP, TODAY } from "./stocks";

/** PRNG déterministe (mulberry32) pour que SSR et client génèrent les mêmes séries. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gaussienne approx. via Box-Muller. */
function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Jours de bourse (lun–ven) se terminant à TODAY inclus. */
function tradingDays(count: number): string[] {
  const days: string[] = [];
  const d = new Date(`${TODAY}T12:00:00Z`);
  while (days.length < count) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(toISO(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return days.reverse();
}

const DAILY_COUNT = 5 * 252;

function buildDaily(
  seedKey: string,
  lastPrice: number,
  avgVolume: number,
  profile: SeriesProfile
): OHLCV[] {
  const rnd = mulberry32(hashSeed(seedKey));
  const days = tradingDays(DAILY_COUNT);
  const n = days.length;
  const dailyDrift = profile.drift / 252;

  // Marche log forward, puis normalisation pour que le dernier close = lastPrice.
  const logReturns: number[] = [];
  for (let i = 0; i < n; i++) {
    // légères phases de tendance pour un rendu réaliste
    const regime = Math.sin(i / 90) * profile.vol * 0.35;
    logReturns.push(dailyDrift + regime + gauss(rnd) * profile.vol);
  }
  const cum: number[] = [];
  let acc = 0;
  for (const r of logReturns) {
    acc += r;
    cum.push(acc);
  }
  const last = cum[n - 1];
  const closes = cum.map((c) => lastPrice * Math.exp(c - last));

  const out: OHLCV[] = [];
  for (let i = 0; i < n; i++) {
    const close = closes[i];
    const prevClose = i === 0 ? close : closes[i - 1];
    const open = prevClose * (1 + gauss(rnd) * profile.vol * 0.25);
    const hi = Math.max(open, close) * (1 + Math.abs(gauss(rnd)) * profile.vol * 0.4);
    const lo = Math.min(open, close) * (1 - Math.abs(gauss(rnd)) * profile.vol * 0.4);
    const spike = rnd() > 0.97 ? 2 + rnd() * 2 : 1;
    let volume = Math.max(
      50,
      Math.round(avgVolume * spike * Math.exp(gauss(rnd) * 0.5))
    );
    if (i === n - 1 && profile.todayVolumeX) {
      volume = Math.round(avgVolume * profile.todayVolumeX);
    }
    out.push({
      time: days[i],
      open: round2(open),
      high: round2(hi),
      low: round2(lo),
      close: round2(close),
      volume,
    });
  }
  return out;
}

function round2(n: number): number {
  return n >= 1000 ? Math.round(n) : Math.round(n * 100) / 100;
}

export function aggregate(data: OHLCV[], size: number): OHLCV[] {
  const out: OHLCV[] = [];
  for (let i = 0; i < data.length; i += size) {
    const chunk = data.slice(i, i + size);
    if (chunk.length === 0) continue;
    out.push({
      time: chunk[chunk.length - 1].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((acc, c) => acc + c.volume, 0),
    });
  }
  return out;
}

/** Barres intraday mockées (unix seconds) sur `sessions` séances, pas de `stepMin` minutes. */
function buildIntraday(
  seedKey: string,
  daily: OHLCV[],
  sessions: number,
  stepMin: number
): OHLCV[] {
  const rnd = mulberry32(hashSeed(`${seedKey}-intra`));
  const out: OHLCV[] = [];
  const lastSessions = daily.slice(-sessions);
  for (const day of lastSessions) {
    const dayStart = new Date(`${day.time}T09:45:00Z`).getTime() / 1000;
    const steps = Math.floor((14 * 60 - 9 * 60 - 45) / stepMin);
    const from = day.open;
    const to = day.close;
    let prev = from;
    for (let i = 0; i < steps; i++) {
      const target = from + ((to - from) * (i + 1)) / steps;
      const wobble = 1 + gauss(rnd) * 0.0035;
      const close = round2(target * wobble);
      const open = prev;
      out.push({
        time: dayStart + i * stepMin * 60,
        open,
        high: round2(Math.max(open, close) * (1 + Math.abs(gauss(rnd)) * 0.002)),
        low: round2(Math.min(open, close) * (1 - Math.abs(gauss(rnd)) * 0.002)),
        close,
        volume: Math.max(10, Math.round((day.volume / steps) * Math.exp(gauss(rnd) * 0.6))),
      });
      prev = close;
    }
  }
  return out;
}

export interface StockSeries {
  daily: OHLCV[];
  weekly: OHLCV[];
  monthly: OHLCV[];
  intraday1d: OHLCV[];
  intraday1w: OHLCV[];
}

const cache = new Map<string, StockSeries>();

export function getSeries(ticker: string): StockSeries {
  const cached = cache.get(ticker);
  if (cached) return cached;
  const stock = STOCK_MAP.get(ticker);
  if (!stock) throw new Error(`Série inconnue: ${ticker}`);
  const daily = buildDaily(
    ticker,
    stock.lastPrice,
    stock.avgVolume30d,
    stock.profile
  );
  const series: StockSeries = {
    daily,
    weekly: aggregate(daily, 5),
    monthly: aggregate(daily, 21),
    intraday1d: buildIntraday(ticker, daily, 1, 5),
    intraday1w: buildIntraday(ticker, daily, 5, 30),
  };
  cache.set(ticker, series);
  return series;
}

/** Série synthétique d'indice (niveau ~level), pour BRVM Composite / BRVM 30. */
export function getIndexSeries(code: string, level: number, drift: number): OHLCV[] {
  const key = `index-${code}`;
  const cached = cache.get(key);
  if (cached) return cached.daily;
  const daily = buildDaily(key, level, 0, { drift, vol: 0.006 });
  cache.set(key, {
    daily,
    weekly: [],
    monthly: [],
    intraday1d: [],
    intraday1w: [],
  });
  return daily;
}

export interface TimeframeData {
  data: OHLCV[];
  intraday: boolean;
}

export function seriesForTimeframe(ticker: string, tf: Timeframe): TimeframeData {
  const s = getSeries(ticker);
  switch (tf) {
    case "1D":
      return { data: s.intraday1d, intraday: true };
    case "1W":
      return { data: s.intraday1w, intraday: true };
    case "1M":
    case "3M":
    case "6M":
    case "YTD":
    case "1Y":
    case "3Y":
    case "5Y":
    case "MAX":
      return { data: sliceSeriesByTimeframe(s.daily, tf), intraday: false };
  }
}
