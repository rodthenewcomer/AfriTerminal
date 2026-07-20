import { describe, expect, it } from "vitest";
import type { OHLCV } from "./types";
import {
  sliceSeriesByTimeframe,
  summarizePeriod,
  timeframeStartDate,
  validateMarketSeries,
} from "./market-series";

const bars: OHLCV[] = [
  { time: "2020-04-21", open: 550, high: 570, low: 540, close: 560, volume: 100 },
  { time: "2021-07-16", open: 3_000, high: 3_100, low: 2_900, close: 3_000, volume: 0 },
  { time: "2021-07-19", open: 3_300, high: 3_400, low: 3_200, close: 3_350, volume: 50 },
  { time: "2026-07-17", open: 22_235, high: 25_000, low: 22_235, close: 23_900, volume: 200 },
];

describe("market series", () => {
  it("uses calendar boundaries and keeps MAX distinct from 5Y", () => {
    expect(timeframeStartDate("2026-07-17", "5Y")).toBe("2021-07-17");
    expect(sliceSeriesByTimeframe(bars, "5Y").map((bar) => bar.time)).toEqual([
      "2021-07-19",
      "2026-07-17",
    ]);
    expect(sliceSeriesByTimeframe(bars, "MAX")[0].time).toBe("2020-04-21");
  });

  it("explains price return, annualized return, dividends and total return", () => {
    const summary = summarizePeriod(bars, "MAX", [{ date: "2025-07-15", net: 500 }]);
    expect(summary?.initialClose).toBe(560);
    expect(summary?.finalClose).toBe(23_900);
    expect(summary?.priceReturnPct).toBeCloseTo(4_167.8571, 3);
    expect(summary?.cumulativeDividends).toBe(500);
    expect(summary?.totalReturnPct).toBeCloseTo(4_257.1428, 3);
    expect(summary?.sessionsWithoutTrade).toBe(1);
    expect(summary?.bestSessionPct).not.toBeNull();
    expect(summary?.worstSessionPct).not.toBeNull();
    expect(summary?.annualizedReturnPct).not.toBeNull();
  });

  it("does not call a multi-week data gap a single trading session", () => {
    const sparse: OHLCV[] = [
      { time: "2026-01-02", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      { time: "2026-02-02", open: 500, high: 500, low: 500, close: 500, volume: 10 },
      { time: "2026-02-03", open: 450, high: 450, low: 450, close: 450, volume: 10 },
    ];
    const summary = summarizePeriod(sparse, "MAX");
    expect(summary?.bestSessionPct).toBeCloseTo(-10);
    expect(summary?.worstSessionPct).toBeCloseTo(-10);
  });

  it("uses the previous official close as the 1D performance basis", () => {
    const latest = bars.at(-1);
    expect(latest).toBeDefined();
    const summary = summarizePeriod(latest ? [latest] : [], "1D", [], {
      previousClose: 22_235,
    });
    expect(summary?.startDate).toBe("2026-07-17");
    expect(summary?.endDate).toBe("2026-07-17");
    expect(summary?.initialClose).toBe(22_235);
    expect(summary?.finalClose).toBe(23_900);
    expect(summary?.priceReturnPct).toBeCloseTo(7.4881, 3);
    expect(summary?.high).toBe(25_000);
    expect(summary?.low).toBe(22_235);
    expect(summary?.annualizedReturnPct).toBeNull();
  });

  it("rejects mixed or contradictory OHLC data", () => {
    const invalid: OHLCV[] = [
      { time: "2026-07-17", open: 100, high: 90, low: 0, close: 95, volume: -1 },
    ];
    const codes = validateMarketSeries(invalid, 100).map((issue) => issue.code);
    expect(codes).toContain("non-positive-price");
    expect(codes).toContain("invalid-high");
    expect(codes).toContain("invalid-volume");
    expect(codes).toContain("last-close-mismatch");
  });
});
