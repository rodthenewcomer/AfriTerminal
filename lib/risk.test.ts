import { describe, expect, it } from "vitest";
import { annualizedVolatility, beta, maxDrawdown, type DailyClose } from "./risk";

function series(closes: number[], start = 0): DailyClose[] {
  return closes.map((close, i) => ({
    time: `2026-01-${String(start + i + 1).padStart(2, "0")}`,
    close,
  }));
}

describe("maxDrawdown", () => {
  it("trouve la pire baisse depuis un sommet", () => {
    // 100 -> 120 (sommet) -> 90 (creux, -25 %) -> 110
    const dd = maxDrawdown(series([100, 120, 90, 110]));
    expect(dd).not.toBeNull();
    expect(dd!.pct).toBeCloseTo(-25);
    expect(dd!.peakDate).toBe("2026-01-02");
    expect(dd!.troughDate).toBe("2026-01-03");
  });

  it("série monotone croissante : drawdown nul", () => {
    expect(maxDrawdown(series([100, 110, 120]))!.pct).toBe(0);
  });
});

describe("annualizedVolatility", () => {
  it("série constante : volatilité nulle", () => {
    const flat = series(Array.from({ length: 40 }, () => 1000));
    expect(annualizedVolatility(flat)).toBeCloseTo(0);
  });

  it("moins de 30 points : null (pas de fausse précision)", () => {
    expect(annualizedVolatility(series([100, 105, 98]))).toBeNull();
  });

  it("alternance ±1 % : σ quotidien ~1 % -> ~15,9 % annualisé", () => {
    const closes: number[] = [1000];
    for (let i = 0; i < 60; i++) closes.push(closes[closes.length - 1] * (i % 2 ? 1.01 : 0.99));
    const vol = annualizedVolatility(series(closes));
    expect(vol).toBeGreaterThan(14);
    expect(vol).toBeLessThan(18);
  });
});

describe("beta", () => {
  it("titre = indice ×2 en rendements : bêta ≈ 2", () => {
    const idx: number[] = [1000];
    const stk: number[] = [500];
    const moves = [0.01, -0.005, 0.008, -0.012, 0.004];
    for (let i = 0; i < 60; i++) {
      const m = moves[i % moves.length];
      idx.push(idx[idx.length - 1] * (1 + m));
      stk.push(stk[stk.length - 1] * (1 + 2 * m));
    }
    const b = beta(series(stk), series(idx));
    expect(b).toBeCloseTo(2, 1);
  });

  it("dates non appariées insuffisantes : null", () => {
    expect(beta(series([100, 101]), series([1000, 1001]))).toBeNull();
  });
});
