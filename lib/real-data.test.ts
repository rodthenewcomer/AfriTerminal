import { describe, expect, it } from "vitest";
import { getAllRealQuotes } from "./real-data";

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
});
