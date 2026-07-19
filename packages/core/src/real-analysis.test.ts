import { describe, expect, it } from "vitest";
import type { RealQuote } from "./types";
import {
  analyzeRealEquity,
  describeNetIncomeTrend,
  percentileRank,
  signedGrowthPct,
  type RealFundamentalInput,
} from "./real-analysis";

function quote(
  ticker: string,
  sectorCode: string | null,
  overrides: Partial<RealQuote> = {}
): RealQuote {
  return {
    ticker,
    name: ticker,
    sectorCode,
    asOfDate: "2026-07-15",
    lastClose: 1_000,
    prevClose: 990,
    dayChangePct: 1,
    weekChangePct: 2,
    monthChangePct: 3,
    quarterChangePct: 4,
    halfYearChangePct: 5,
    ytdChangePct: 6,
    yearChangePct: 7,
    fiveYearChangePct: 8,
    dayVolume: 1_000,
    avgVolume30d: 1_000,
    volumeRatio: 1,
    per: 10,
    netYieldPct: 5,
    lastDividendNet: 50,
    lastDividendDate: "2025-07-01",
    dayOpen: 990,
    dayHigh: 1_010,
    dayLow: 980,
    dayValueFcfa: 1_000_000,
    week52High: 1_200,
    week52Low: 800,
    allTimeHigh: 1_200,
    allTimeHighDate: "2026-01-01",
    sparkline: [990, 1_000],
    ...overrides,
  };
}

function fundamental(
  ticker: string,
  overrides: Partial<RealFundamentalInput> = {}
): RealFundamentalInput {
  return {
    ticker,
    fiscalYear: 2025,
    revenueLabel: "CA",
    revenueM: 120,
    revenuePrevM: 100,
    netIncomeM: 12,
    netIncomePrevM: 10,
    ordinaryIncomeM: 14,
    ordinaryIncomePrevM: 11,
    cirPct: null,
    cirPrevPct: null,
    depositsM: null,
    depositsPrevM: null,
    loansM: null,
    loansPrevM: null,
    costOfRiskM: null,
    costOfRiskPrevM: null,
    proposedGrossDividend: 50,
    sharesOutstanding: 1_000_000,
    equityM: 60,
    equityPrevM: 50,
    source: "https://www.brvm.org/source.pdf",
    publishedOn: "2026-04-01",
    ...overrides,
  };
}

describe("real-analysis", () => {
  it("calcule un rang centile robuste et un rang moyen pour les ex-aequo", () => {
    expect(percentileRank(1, [1, 2, 3])).toBe(0);
    expect(percentileRank(2, [1, 2, 3])).toBe(50);
    expect(percentileRank(3, [1, 2, 3])).toBe(100);
    expect(percentileRank(2, [1, 2, 2, 3])).toBe(50);
  });

  it("mesure correctement une amélioration quand la base est négative", () => {
    expect(signedGrowthPct(-5, -10)).toBe(50);
    expect(signedGrowthPct(5, -10)).toBe(150);
    expect(signedGrowthPct(5, 0)).toBeNull();
  });

  it("ne transforme jamais une perte réduite en bénéfice en hausse", () => {
    const trend = describeNetIncomeTrend(-624, -2_189);
    expect(trend).toMatchObject({
      id: "loss-reduction",
      label: "Perte réduite",
      tone: "warning",
    });
    expect(trend?.detail).toContain("réduction de 71,5 %");

    const result = analyzeRealEquity({
      ticker: "LOSS",
      quotes: [
        quote("LOSS", "IND", { per: 12 }),
        quote("PEER", "IND", { per: 10 }),
      ],
      fundamentals: [
        fundamental("LOSS", {
          netIncomeM: -624,
          netIncomePrevM: -2_189,
          ordinaryIncomeM: -436,
        }),
        fundamental("PEER"),
      ],
    });

    expect(result?.signals.some((signal) => signal.id === "loss-reduction")).toBe(true);
    expect(result?.signals.some((signal) => signal.id === "profit-growth")).toBe(false);
    expect(result?.comparisons.some((item) => item.metric === "per")).toBe(false);
    expect(result?.comparisons.some((item) => item.metric === "netIncomeGrowth")).toBe(false);
  });

  it("compare uniquement au secteur et favorise un PER sectoriel plus bas", () => {
    const quotes = [
      quote("AAA", "FIN", { per: 5 }),
      quote("BBB", "FIN", { per: 20 }),
      quote("CCC", "TEL", { per: 2 }),
    ];
    const fundamentals = [fundamental("AAA"), fundamental("BBB"), fundamental("CCC")];
    const aaa = analyzeRealEquity({ ticker: "AAA", quotes, fundamentals });
    const bbb = analyzeRealEquity({ ticker: "BBB", quotes, fundamentals });

    expect(aaa?.benchmark).toMatchObject({ scope: "sector", companyCount: 2, peerCount: 1 });
    expect(aaa?.comparisons.find((item) => item.metric === "per")?.median).toBe(12.5);
    expect(aaa?.scores.valuation).toBeGreaterThan(bbb?.scores.valuation ?? 100);
  });

  it("renormalise les poids manquants sans inventer P/B ou ROE", () => {
    const quotes = [quote("AAA", "FIN"), quote("BBB", "FIN")];
    const fundamentals = [
      fundamental("AAA", { sharesOutstanding: null, equityM: null, equityPrevM: null }),
      fundamental("BBB", { sharesOutstanding: null, equityM: null, equityPrevM: null }),
    ];
    const result = analyzeRealEquity({ ticker: "AAA", quotes, fundamentals });

    expect(result).not.toBeNull();
    expect(result?.comparisons.some((item) => item.metric === "pb")).toBe(false);
    expect(result?.comparisons.some((item) => item.metric === "roe")).toBe(false);
    expect(result?.confidence.coveragePct).toBeLessThan(100);
  });

  it("baisse la confiance pour des comptes anciens et un secteur sans pair", () => {
    const result = analyzeRealEquity({
      ticker: "AAA",
      quotes: [quote("AAA", null), quote("BBB", "FIN")],
      fundamentals: [fundamental("AAA", { fiscalYear: 2023 }), fundamental("BBB")],
    });

    expect(result?.benchmark.scope).toBe("market");
    expect(result?.confidence.level).toBe("low");
    expect(result?.signals.some((signal) => signal.id === "stale-fundamentals")).toBe(true);
  });
});
