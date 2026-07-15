import { describe, expect, it } from "vitest";
import type { LiveMarketPayload, RealQuote } from "./types";
import { mergeLiveQuote } from "./live-market";

const base: RealQuote = {
  ticker: "UNXC", name: "Uniwax CI", sectorCode: "CONSO", asOfDate: "2026-07-14",
  lastClose: 1200, prevClose: 1150, dayChangePct: 4.35, weekChangePct: 5,
  monthChangePct: 10, quarterChangePct: 15, halfYearChangePct: 20, ytdChangePct: 25,
  yearChangePct: 30, fiveYearChangePct: 40, dayVolume: 1000, avgVolume30d: 800,
  volumeRatio: 1.25, per: 10, netYieldPct: 2, lastDividendNet: 20,
  lastDividendDate: "2025-08-01", dayOpen: 1180, dayHigh: 1220, dayLow: 1170,
  dayValueFcfa: 1_200_000, week52High: 1300, week52Low: 500,
  allTimeHigh: 1500, allTimeHighDate: "2024-01-10", sparkline: [1100, 1200],
};

const live: LiveMarketPayload = {
  asOfDate: "2026-07-15", updatedAt: "2026-07-15T12:30:00+00:00",
  source: "BRVM — cours différés de 15 minutes", delayMinutes: 15,
  quotes: {
    UNXC: {
      open: 1210, high: 1520, low: 1190, close: 1250, samples: 2,
      firstSeen: "2026-07-15T10:00:00+00:00", lastSeen: "2026-07-15T12:30:00+00:00",
      points: [
        { time: "2026-07-15T10:00:00+00:00", price: 1210 },
        { time: "2026-07-15T12:30:00+00:00", price: 1250 },
      ],
    },
  },
};

describe("mergeLiveQuote", () => {
  it("publie le cours différé sans inventer le volume ni altérer les records de clôture", () => {
    const merged = mergeLiveQuote(base, live);
    expect(merged.quoteStatus).toBe("delayed-live");
    expect(merged.asOfDate).toBe("2026-07-15");
    expect(merged.lastClose).toBe(1250);
    expect(merged.prevClose).toBe(1200);
    expect(merged.dayVolume).toBe(0);
    expect(merged.week52High).toBe(1300);
    expect(merged.allTimeHigh).toBe(1500);
  });

  it("conserve la clôture si le flux différé n'est pas plus récent", () => {
    const merged = mergeLiveQuote(base, { ...live, asOfDate: base.asOfDate });
    expect(merged.quoteStatus).toBe("official-close");
    expect(merged.lastClose).toBe(base.lastClose);
  });
});
