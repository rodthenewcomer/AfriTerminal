import { describe, expect, it } from "vitest";
import type { Timeframe } from "@wariba/core/types";
import {
  summarizePeriod,
  timeframeStartDate,
  validateMarketSeries,
} from "@wariba/core/market-series";
import { getAllRealQuotes, realSeriesForTimeframe } from "./real-data";

describe("real data snapshot", () => {
  it("never exposes a dividend date after the quote date", () => {
    for (const quote of getAllRealQuotes()) {
      if (!quote.lastDividendDate) continue;
      expect(
        quote.lastDividendDate <= quote.asOfDate,
        `${quote.ticker}: dividend ${quote.lastDividendDate} > quote ${quote.asOfDate}`
      ).toBe(true);
    }
  });

  it("serves every daily timeframe for every BRVM ticker without leaking another ticker", async () => {
    const timeframes: Timeframe[] = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "MAX"];
    for (const quote of getAllRealQuotes()) {
      for (const timeframe of timeframes) {
        const { data } = await realSeriesForTimeframe(quote.ticker, timeframe);
        expect(data.length, `${quote.ticker} ${timeframe}`).toBeGreaterThan(0);
        expect(data.every((bar) =>
          Number.isFinite(bar.open) &&
          Number.isFinite(bar.high) &&
          Number.isFinite(bar.low) &&
          Number.isFinite(bar.close) &&
          bar.high >= bar.low
        ), `${quote.ticker} ${timeframe} OHLC`).toBe(true);
        expect(
          data.every((bar, index) => index === 0 || String(bar.time) > String(data[index - 1].time)),
          `${quote.ticker} ${timeframe} chronological`
        ).toBe(true);
        const cutoff = timeframeStartDate(quote.asOfDate, timeframe);
        if (cutoff) {
          expect(String(data[0].time) >= cutoff, `${quote.ticker} ${timeframe} exact cutoff`).toBe(true);
        }
        expect(data.at(-1)?.close, `${quote.ticker} ${timeframe} latest close`).toBe(quote.lastClose);
      }
      const week = await realSeriesForTimeframe(quote.ticker, "1W");
      expect(week.data.length, `${quote.ticker} 1W points`).toBeLessThanOrEqual(6);
      const full = await realSeriesForTimeframe(quote.ticker, "MAX");
      expect(
        validateMarketSeries(full.data, quote.lastClose).filter((issue) => issue.severity === "error"),
        `${quote.ticker} full-series integrity`
      ).toEqual([]);
    }
  }, 30_000);

  it("keeps STBC 5Y and MAX anchored to its own trusted history", async () => {
    const fiveYears = await realSeriesForTimeframe("STBC", "5Y");
    const full = await realSeriesForTimeframe("STBC", "MAX");
    const fiveYearSummary = summarizePeriod(fiveYears.data, "5Y");
    const fullSummary = summarizePeriod(full.data, "MAX");

    expect(fiveYearSummary).toMatchObject({
      startDate: "2021-07-19",
      endDate: "2026-07-17",
      initialClose: 3350,
      finalClose: 23900,
      high: 25000,
      low: 3350,
    });
    expect(fiveYearSummary?.priceReturnPct).toBeCloseTo(613.43, 2);
    expect(fullSummary).toMatchObject({
      startDate: "2019-01-02",
      endDate: "2026-07-17",
      initialClose: 1970,
      finalClose: 23900,
      high: 25000,
      low: 440,
    });
    expect(fullSummary?.priceReturnPct).toBeCloseTo(1113.2, 1);
  });
});
