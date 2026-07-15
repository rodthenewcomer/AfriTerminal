import { describe, expect, it } from "vitest";
import type { StockSnapshot } from "@wariba/core/types";
import { getSnapshots } from "./data";
import {
  currentSessionSnapshots,
  marketBreadth,
  rankGainers,
  rankLosers,
  rankUnusualVolumes,
  rankWeeklyMovers,
} from "./dashboard-metrics";

function snapshot(
  ticker: string,
  dayChange: number,
  asOfDate: string,
  weekChange = 0,
  volumeRatio = 1
): StockSnapshot {
  return {
    ticker,
    name: ticker,
    market: "BRVM",
    sector: "Autre",
    country: "Côte d'Ivoire",
    currency: "FCFA",
    lastPrice: 1_000,
    sharesM: 0,
    avgVolume30d: 100,
    profile: { drift: 0, vol: 0 },
    fundamentals: {
      revenue: 0,
      revenuePrev: 0,
      netIncome: 0,
      netIncomePrev: 0,
      ordinaryIncome: 0,
      grossDividend: 0,
      roe: 0,
      roa: 0,
      pb: 0,
      payout: 0,
      revenueLabel: "CA",
    },
    description: "",
    marketCap: 0,
    per: -1,
    dayChange,
    weekChange,
    monthChange: 0,
    ytdChange: 0,
    yearChange: 0,
    dayVolume: 100,
    volumeRatio,
    yieldGross: 0,
    yieldNet: 0,
    netDividend: 0,
    netIncomeGrowth: 0,
    revenueGrowth: 0,
    scores: { quality: 0, valuation: 0, momentum: 0, risk: 0 },
    signals: [],
    insight: { headline: "", summary: "", positives: [], risks: [], watchNext: [] },
    real: {
      ticker,
      name: ticker,
      sectorCode: null,
      asOfDate,
      lastClose: 1_000,
      prevClose: 1_000,
      dayChangePct: dayChange,
      weekChangePct: weekChange,
      monthChangePct: 0,
      quarterChangePct: 0,
      halfYearChangePct: 0,
      ytdChangePct: 0,
      yearChangePct: 0,
      fiveYearChangePct: 0,
      dayVolume: 100,
      avgVolume30d: 100,
      volumeRatio,
      per: null,
      netYieldPct: null,
      lastDividendNet: null,
      lastDividendDate: null,
      dayOpen: 1_000,
      dayHigh: 1_000,
      dayLow: 1_000,
      dayValueFcfa: 100_000,
      week52High: 1_000,
      week52Low: 1_000,
      allTimeHigh: 1_000,
      allTimeHighDate: asOfDate,
      sparkline: [1_000],
      quoteStatus: "official-close",
    },
  };
}

describe("dashboard factual rankings", () => {
  it("exclut les valeurs suspendues de la séance courante", () => {
    const rows = [
      snapshot("UP", 2, "2026-07-15"),
      snapshot("DOWN", -1, "2026-07-15"),
      snapshot("STALE", 7, "2019-05-10"),
    ];
    expect(currentSessionSnapshots(rows).map((row) => row.ticker)).toEqual([
      "UP",
      "DOWN",
    ]);
    expect(marketBreadth(rows)).toEqual({
      advancing: 1,
      declining: 1,
      unchanged: 0,
      total: 2,
    });
  });

  it("ne place jamais une baisse dans les hausses, ni l'inverse", () => {
    const rows = [
      snapshot("UP", 2, "2026-07-15"),
      snapshot("FLAT", 0, "2026-07-15"),
      snapshot("DOWN", -1, "2026-07-15"),
    ];
    expect(rankGainers(rows).map((row) => row.ticker)).toEqual(["UP"]);
    expect(rankLosers(rows).map((row) => row.ticker)).toEqual(["DOWN"]);
  });

  it("classe volumes et amplitudes sur les champs factuels", () => {
    const rows = [
      snapshot("A", 0, "2026-07-15", -8, 1.4),
      snapshot("B", 0, "2026-07-15", 3, 4),
    ];
    expect(rankUnusualVolumes(rows).map((row) => row.ticker)).toEqual(["B"]);
    expect(rankWeeklyMovers(rows).map((row) => row.ticker)).toEqual(["A", "B"]);
  });

  it("la cote committée couvre 48 fiches et 47 valeurs à la séance active", () => {
    const snapshots = getSnapshots();
    expect(snapshots).toHaveLength(48);
    expect(currentSessionSnapshots(snapshots)).toHaveLength(47);
    expect(rankGainers(snapshots).every((row) => row.dayChange > 0)).toBe(true);
    expect(rankLosers(snapshots).every((row) => row.dayChange < 0)).toBe(true);
  });
});
