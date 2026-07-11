import { describe, expect, it } from "vitest";
import { getRealFundamentals, growthPct } from "./real-fundamentals";

describe("growthPct", () => {
  it("croissance simple", () => {
    expect(growthPct(110, 100)).toBeCloseTo(10, 10);
    expect(growthPct(80, 100)).toBeCloseTo(-20, 10);
  });

  it("base absente ou nulle -> null (jamais un pourcentage inventé)", () => {
    expect(growthPct(110, null)).toBeNull();
    expect(growthPct(110, 0)).toBeNull();
  });
});

describe("getRealFundamentals (données committées)", () => {
  it("retourne PALC avec unités normalisées en millions", () => {
    const f = getRealFundamentals("PALC");
    expect(f).toBeDefined();
    // CA 2025 de Palm CI ~197,6 Md : si une régression d'unité divise ou
    // multiplie par 1000, ces bornes cassent.
    expect(f!.revenueM).toBeGreaterThan(100_000);
    expect(f!.revenueM).toBeLessThan(1_000_000);
    expect(f!.revenueLabel).toBe("CA");
    expect(f!.fiscalYear).toBe(2025);
    expect(f!.source).toContain("brvm.org");
  });

  it("NSBC est étiquetée PNB avec ses ratios bancaires", () => {
    const f = getRealFundamentals("NSBC");
    expect(f).toBeDefined();
    expect(f!.revenueLabel).toBe("PNB");
    expect(f!.cirPct).not.toBeNull();
  });

  it("SNTS expose les données approuvées et le nombre d'actions recoupé", () => {
    const f = getRealFundamentals("SNTS");
    expect(f).toBeDefined();
    expect(f!.fiscalYear).toBe(2025);
    expect(f!.sharesOutstanding).toBe(100_000_000);
    expect(f!.equityM).toBe(1_399_263);
    expect(f!.source).toContain("brvm.org");
  });

  it("ticker inconnu -> undefined", () => {
    expect(getRealFundamentals("INCONNU")).toBeUndefined();
  });
});
