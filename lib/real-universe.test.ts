import { describe, expect, it } from "vitest";
import type { RealQuote } from "@wariba/core/types";
import {
  countryFromTicker,
  realOnlySnapshot,
  sectorFromCode,
} from "./real-universe";

describe("sectorFromCode", () => {
  it("mappe la nomenclature BOC vers les libellés de l'app", () => {
    expect(sectorFromCode("FIN")).toBe("Banque");
    expect(sectorFromCode("TEL")).toBe("Télécom");
    expect(sectorFromCode("CB")).toBe("Agro-industrie");
    expect(sectorFromCode("CD")).toBe("Distribution");
    expect(sectorFromCode("ENE")).toBe("Distribution");
    expect(sectorFromCode("IND")).toBe("Industrie");
    expect(sectorFromCode("SPU")).toBe("Services publics");
  });

  it("code absent ou inconnu -> Autre, jamais un secteur inventé", () => {
    expect(sectorFromCode(null)).toBe("Autre");
    expect(sectorFromCode("XYZ")).toBe("Autre");
  });
});

describe("countryFromTicker", () => {
  it("suffixe BF avant le suffixe simple (BOABF ≠ BOAB)", () => {
    expect(countryFromTicker("BOABF")).toBe("Burkina Faso");
    expect(countryFromTicker("ONTBF")).toBe("Burkina Faso");
    expect(countryFromTicker("CBIBF")).toBe("Burkina Faso");
    expect(countryFromTicker("BOAB")).toBe("Bénin");
  });

  it("reproduit le pays des fiches curées (validation de l'heuristique)", () => {
    // Échantillon des 15 fiches de lib/mock/stocks.ts, tous pays couverts.
    expect(countryFromTicker("SNTS")).toBe("Sénégal");
    expect(countryFromTicker("ORAC")).toBe("Côte d'Ivoire");
    expect(countryFromTicker("ETIT")).toBe("Togo");
    expect(countryFromTicker("BOAM")).toBe("Mali");
    expect(countryFromTicker("BOAN")).toBe("Niger");
    expect(countryFromTicker("LNBB")).toBe("Bénin");
  });
});

function quote(overrides: Partial<RealQuote> = {}): RealQuote {
  return {
    ticker: "ABJC",
    name: "SERVAIR ABIDJAN CI",
    sectorCode: "CD",
    asOfDate: "2026-07-06",
    lastClose: 3150,
    prevClose: 3100,
    dayChangePct: 1.61,
    weekChangePct: 2.4,
    monthChangePct: -1.2,
    quarterChangePct: 4.1,
    halfYearChangePct: 8.9,
    fiveYearChangePct: 62.0,
    ytdChangePct: 12.3,
    yearChangePct: 20.1,
    dayVolume: 500,
    avgVolume30d: 420.5,
    volumeRatio: 1.19,
    per: 11.2,
    netYieldPct: 5.6,
    lastDividendNet: 176,
    lastDividendDate: "2026-05-20",
    dayOpen: 3120,
    dayHigh: 3160,
    dayLow: 3100,
    dayValueFcfa: 1_500_000,
    week52High: 3570,
    week52Low: 1600,
    allTimeHigh: 3570,
    allTimeHighDate: "2026-06-25",
    sparkline: [3100, 3150],
    ...overrides,
  };
}

describe("realOnlySnapshot", () => {
  it("reprend les valeurs réelles et attache la cotation", () => {
    const s = realOnlySnapshot(quote());
    expect(s.ticker).toBe("ABJC");
    expect(s.lastPrice).toBe(3150);
    expect(s.dayChange).toBe(1.61);
    expect(s.per).toBe(11.2);
    expect(s.sector).toBe("Distribution");
    expect(s.country).toBe("Côte d'Ivoire");
    expect(s.real).toBeDefined();
  });

  it("PER absent -> -1 (affiché « — »), jamais une valeur inventée", () => {
    const s = realOnlySnapshot(quote({ per: null, netYieldPct: null, lastDividendNet: null }));
    expect(s.per).toBe(-1);
    expect(s.yieldNet).toBe(0);
    expect(s.netDividend).toBe(0);
  });

  it("fondamentaux, scores et signaux restent des coquilles neutres", () => {
    const s = realOnlySnapshot(quote());
    expect(s.marketCap).toBe(0);
    expect(s.fundamentals.netIncome).toBe(0);
    expect(s.scores).toEqual({ quality: 0, valuation: 0, momentum: 0, risk: 0 });
    expect(s.signals).toEqual([]);
  });
});
