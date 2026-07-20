import { describe, expect, it } from "vitest";
import { buildFinancialHistory } from "./financial-history";
import type { RealFundamentalInput } from "./real-analysis";

const FUNDAMENTAL: RealFundamentalInput = {
  ticker: "TEST",
  fiscalYear: 2025,
  revenueLabel: "CA",
  revenueM: 100,
  revenuePrevM: 80,
  netIncomeM: 10,
  netIncomePrevM: 8,
  ordinaryIncomeM: 9,
  ordinaryIncomePrevM: 7,
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
  equityM: 50,
  equityPrevM: 45,
  source: "https://example.com/report.pdf",
  publishedOn: "2026-04-01",
};

describe("buildFinancialHistory", () => {
  it("keeps a five-year window and exposes missing years", () => {
    const history = buildFinancialHistory(FUNDAMENTAL);
    expect(history.years).toEqual([2021, 2022, 2023, 2024, 2025]);
    expect(history.coverageYears).toBe(2);
    expect(history.rows[0].cells[2023]).toEqual({
      value: null,
      status: "unavailable",
    });
  });

  it("marks ratios and per-share values as calculated", () => {
    const history = buildFinancialHistory(FUNDAMENTAL);
    expect(history.rows.find((row) => row.id === "net-margin")?.cells[2025]).toEqual({
      value: 10,
      status: "calculated",
    });
    expect(history.rows.find((row) => row.id === "eps")?.cells[2025]).toEqual({
      value: 10,
      status: "calculated",
    });
  });
});
