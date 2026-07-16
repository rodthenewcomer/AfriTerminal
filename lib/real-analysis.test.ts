import { describe, expect, it } from "vitest";
import { getAllRealQuotes } from "./real-data";
import { getAllRealFundamentals } from "./real-fundamentals";
import { clearRealAnalysisCache, getRealAnalysis } from "./real-analysis";

describe("getRealAnalysis (univers réel committé)", () => {
  it("produit une analyse réelle pour chaque ticker couvert", () => {
    clearRealAnalysisCache();
    const quotes = getAllRealQuotes();
    const fundamentals = getAllRealFundamentals();

    expect(quotes).toHaveLength(48);
    expect(fundamentals).toHaveLength(48);
    for (const quote of quotes) {
      const analysis = getRealAnalysis(quote.ticker);
      expect(analysis, quote.ticker).not.toBeNull();
      expect(analysis?.overallScore, quote.ticker).toBeGreaterThanOrEqual(0);
      expect(analysis?.overallScore, quote.ticker).toBeLessThanOrEqual(100);
      expect(analysis?.confidence.coveragePct, quote.ticker).toBeGreaterThan(0);
    }
  });

  it("n'invente rien pour un ticker inconnu", () => {
    expect(getRealAnalysis("INCONNU")).toBeNull();
  });
});
