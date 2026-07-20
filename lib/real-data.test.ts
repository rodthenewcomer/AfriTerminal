import { describe, expect, it } from "vitest";
import type { Timeframe } from "@wariba/core/types";
import {
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
    const timeframes: Timeframe[] = ["1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "MAX"];
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
});
