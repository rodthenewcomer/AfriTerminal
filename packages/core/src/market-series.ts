import type { OHLCV, Timeframe } from "./types";

export const TIMEFRAME_OPTIONS: ReadonlyArray<{ value: Timeframe; label: string }> = [
  { value: "1D", label: "1J" },
  { value: "1W", label: "1S" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "YTD", label: "YTD" },
  { value: "1Y", label: "1A" },
  { value: "3Y", label: "3A" },
  { value: "5Y", label: "5A" },
  { value: "MAX", label: "MAX" },
];

export interface PeriodDividend {
  date: string;
  net: number;
}

export interface PeriodSummary {
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  initialClose: number;
  finalClose: number;
  priceReturnPct: number;
  annualizedReturnPct: number | null;
  high: number;
  low: number;
  totalVolume: number;
  averageVolume: number;
  sessions: number;
  sessionsWithoutTrade: number;
  bestSessionPct: number | null;
  worstSessionPct: number | null;
  cumulativeDividends: number;
  totalReturnPct: number;
}

export interface PeriodSummaryOptions {
  /**
   * Clôture précédente utilisée comme base de la dernière séance lorsque
   * la période 1J ne contient qu'une bougie quotidienne officielle.
   */
  previousClose?: number;
}

export type SeriesIssueCode =
  | "duplicate-time"
  | "non-chronological"
  | "non-positive-price"
  | "invalid-high"
  | "invalid-low"
  | "invalid-volume"
  | "last-close-mismatch"
  | "abnormal-change";

export interface SeriesIssue {
  code: SeriesIssueCode;
  severity: "error" | "warning";
  index: number;
  detail: string;
}

function isoDate(value: string | number): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function subtractCalendarMonths(value: string, months: number): string {
  const date = parseIsoDate(value);
  const targetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();
  targetMonth.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return formatIsoDate(targetMonth);
}

function subtractCalendarYears(value: string, years: number): string {
  return subtractCalendarMonths(value, years * 12);
}

export function timeframeStartDate(endDate: string, timeframe: Timeframe): string | null {
  switch (timeframe) {
    case "1D":
      return endDate;
    case "1W": {
      const start = parseIsoDate(endDate);
      start.setUTCDate(start.getUTCDate() - 7);
      return formatIsoDate(start);
    }
    case "1M":
      return subtractCalendarMonths(endDate, 1);
    case "3M":
      return subtractCalendarMonths(endDate, 3);
    case "6M":
      return subtractCalendarMonths(endDate, 6);
    case "YTD":
      return `${endDate.slice(0, 4)}-01-01`;
    case "1Y":
      return subtractCalendarYears(endDate, 1);
    case "3Y":
      return subtractCalendarYears(endDate, 3);
    case "5Y":
      return subtractCalendarYears(endDate, 5);
    case "MAX":
      return null;
  }
}

export function sliceSeriesByTimeframe(data: OHLCV[], timeframe: Timeframe): OHLCV[] {
  if (data.length === 0 || timeframe === "MAX") return data;
  const endDate = isoDate(data[data.length - 1].time);
  if (!endDate) return timeframe === "1D" ? data : data;
  const startDate = timeframeStartDate(endDate, timeframe);
  if (!startDate) return data;
  return data.filter((bar) => {
    const date = isoDate(bar.time);
    return date !== null && date >= startDate && date <= endDate;
  });
}

export function summarizePeriod(
  data: OHLCV[],
  timeframe: Timeframe,
  dividends: PeriodDividend[] = [],
  options: PeriodSummaryOptions = {}
): PeriodSummary | null {
  if (data.length === 0) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const startDate = String(first.time);
  const endDate = String(last.time);
  if (!(first.close > 0) || !(last.close > 0)) return null;

  let high = first.high;
  let low = first.low;
  let totalVolume = 0;
  let sessionsWithoutTrade = 0;
  let bestSessionPct: number | null = null;
  let worstSessionPct: number | null = null;
  for (let index = 0; index < data.length; index += 1) {
    const bar = data[index];
    high = Math.max(high, bar.high);
    low = Math.min(low, bar.low);
    totalVolume += bar.volume;
    if (bar.volume === 0) sessionsWithoutTrade += 1;
    const previousBar = data[index - 1];
    const previous = previousBar?.close;
    const currentTime = isoDate(bar.time);
    const previousTime = previousBar ? isoDate(previousBar.time) : null;
    const gapDays = currentTime && previousTime
      ? (parseIsoDate(currentTime).getTime() - parseIsoDate(previousTime).getTime()) / 86_400_000
      : Number.POSITIVE_INFINITY;
    if (previous && previous > 0 && gapDays <= 7) {
      const change = ((bar.close - previous) / previous) * 100;
      bestSessionPct = bestSessionPct === null ? change : Math.max(bestSessionPct, change);
      worstSessionPct = worstSessionPct === null ? change : Math.min(worstSessionPct, change);
    }
  }

  const oneDayReference =
    timeframe === "1D" &&
    data.length === 1 &&
    typeof options.previousClose === "number" &&
    Number.isFinite(options.previousClose) &&
    options.previousClose > 0
      ? options.previousClose
      : null;
  const initialClose = oneDayReference ?? first.close;
  const cumulativeDividends = dividends
    .filter((item) => item.date > startDate && item.date <= endDate && item.net >= 0)
    .reduce((sum, item) => sum + item.net, 0);
  const priceReturnPct = ((last.close - initialClose) / initialClose) * 100;
  const totalReturnPct = ((last.close + cumulativeDividends - initialClose) / initialClose) * 100;
  if (oneDayReference !== null) {
    bestSessionPct = priceReturnPct;
    worstSessionPct = priceReturnPct;
  }
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  const elapsedDays = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? Math.max(0, (endMs - startMs) / 86_400_000)
    : 0;
  const years = elapsedDays / 365.2425;
  const annualizedReturnPct = elapsedDays >= 30 && years > 0
    ? (Math.pow(last.close / first.close, 1 / years) - 1) * 100
    : null;

  return {
    timeframe,
    startDate,
    endDate,
    initialClose,
    finalClose: last.close,
    priceReturnPct,
    annualizedReturnPct,
    high,
    low,
    totalVolume,
    averageVolume: totalVolume / data.length,
    sessions: data.length,
    sessionsWithoutTrade,
    bestSessionPct,
    worstSessionPct,
    cumulativeDividends,
    totalReturnPct,
  };
}

export function validateMarketSeries(
  data: OHLCV[],
  expectedLastClose?: number
): SeriesIssue[] {
  const issues: SeriesIssue[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < data.length; index += 1) {
    const bar = data[index];
    const time = String(bar.time);
    if (seen.has(time)) {
      issues.push({ code: "duplicate-time", severity: "error", index, detail: `${time} apparaît plusieurs fois.` });
    }
    seen.add(time);
    if (index > 0 && time <= String(data[index - 1].time)) {
      issues.push({ code: "non-chronological", severity: "error", index, detail: `${time} n'est pas strictement postérieur au point précédent.` });
    }
    if (![bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0)) {
      issues.push({ code: "non-positive-price", severity: "error", index, detail: `${time} contient un prix nul, négatif ou non fini.` });
    }
    if (bar.high < Math.max(bar.open, bar.close, bar.low)) {
      issues.push({ code: "invalid-high", severity: "error", index, detail: `${time} : le plus haut est inférieur à une valeur OHLC.` });
    }
    if (bar.low > Math.min(bar.open, bar.close, bar.high)) {
      issues.push({ code: "invalid-low", severity: "error", index, detail: `${time} : le plus bas est supérieur à une valeur OHLC.` });
    }
    if (!Number.isFinite(bar.volume) || bar.volume < 0) {
      issues.push({ code: "invalid-volume", severity: "error", index, detail: `${time} contient un volume invalide.` });
    }
    if (index > 0 && data[index - 1].close > 0) {
      const change = Math.abs((bar.close - data[index - 1].close) / data[index - 1].close);
      if (change > 0.5) {
        issues.push({
          code: "abnormal-change",
          severity: "warning",
          index,
          detail: `${time} varie de ${(change * 100).toFixed(1)} % : vérifier dividende, split, attribution, capital ou décimales.`,
        });
      }
    }
  }
  const lastClose = data.at(-1)?.close;
  if (
    expectedLastClose !== undefined &&
    lastClose !== undefined &&
    Math.abs(lastClose - expectedLastClose) > Math.max(0.01, expectedLastClose * 0.000001)
  ) {
    issues.push({
      code: "last-close-mismatch",
      severity: "error",
      index: data.length - 1,
      detail: `Dernière clôture ${lastClose} différente du cours de référence ${expectedLastClose}.`,
    });
  }
  return issues;
}
