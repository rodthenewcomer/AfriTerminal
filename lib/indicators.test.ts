import { describe, expect, it } from "vitest";
import type { OHLCV } from "./types";
import {
  calculateBollingerBands,
  calculateEMA,
  calculateHeikinAshi,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateVWAP,
} from "./indicators";

/** Bougie plate à partir d'une simple clôture (open=high=low=close). */
function candles(closes: number[], volume = 100): OHLCV[] {
  return closes.map((close, i) => ({
    time: `2026-01-${String(i + 1).padStart(2, "0")}`,
    open: close,
    high: close,
    low: close,
    close,
    volume,
  }));
}

const values = (out: { value: number }[]) => out.map((p) => p.value);

describe("calculateSMA", () => {
  it("moyenne glissante exacte sur une suite simple", () => {
    expect(values(calculateSMA(candles([1, 2, 3, 4, 5]), 3))).toEqual([2, 3, 4]);
  });

  it("démarre à l'index period-1 avec le bon horodatage", () => {
    const out = calculateSMA(candles([10, 20, 30]), 3);
    expect(out).toEqual([{ time: "2026-01-03", value: 20 }]);
  });

  it("série plus courte que la période -> vide", () => {
    expect(calculateSMA(candles([1, 2]), 3)).toEqual([]);
  });
});

describe("calculateEMA", () => {
  it("graine = SMA de la première fenêtre, puis lissage k=2/(n+1)", () => {
    // period 3 -> k = 0.5 ; graine mean(1,2,3)=2 ; puis 4*.5+2*.5=3 ; 5*.5+3*.5=4
    expect(values(calculateEMA(candles([1, 2, 3, 4, 5]), 3))).toEqual([2, 3, 4]);
  });

  it("série constante -> EMA constante", () => {
    const out = values(calculateEMA(candles(Array(10).fill(7)), 4));
    for (const v of out) expect(v).toBeCloseTo(7, 12);
  });

  it("série plus courte que la période -> vide", () => {
    expect(calculateEMA(candles([1, 2]), 3)).toEqual([]);
  });
});

describe("calculateRSI", () => {
  it("valeurs exactes (lissage de Wilder), period=2", () => {
    // closes [1,2,3,2,4] : gains initiaux (1,1) -> avgGain=1, avgLoss=0
    // i=3 (diff -1) : avgGain=0.5, avgLoss=0.5 -> RS=1 -> RSI=50
    // i=4 (diff +2) : avgGain=1.25, avgLoss=0.25 -> RS=5 -> RSI=83.333...
    const out = values(calculateRSI(candles([1, 2, 3, 2, 4]), 2));
    expect(out).toHaveLength(2);
    expect(out[0]).toBeCloseTo(50, 10);
    expect(out[1]).toBeCloseTo(100 - 100 / 6, 10);
  });

  it("reste borné [0, 100] et vaut 0 sur une baisse continue", () => {
    const falling = values(calculateRSI(candles([100, 90, 80, 70, 60, 50]), 3));
    for (const v of falling) expect(v).toBe(0);
    const mixed = values(
      calculateRSI(candles([5, 9, 2, 8, 3, 7, 4, 6, 5, 8]), 3)
    );
    for (const v of mixed) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("série de longueur <= period -> vide", () => {
    expect(calculateRSI(candles([1, 2, 3]), 3)).toEqual([]);
  });
});

describe("calculateMACD", () => {
  it("série constante -> macd, signal et histogramme nuls", () => {
    const { macd, signal, histogram } = calculateMACD(
      candles(Array(60).fill(500))
    );
    expect(macd.length).toBeGreaterThan(0);
    expect(signal.length).toBeGreaterThan(0);
    for (const v of [...macd, ...signal, ...histogram]) {
      expect(v.value).toBeCloseTo(0, 10);
    }
  });

  it("longueurs alignées : macd = N-slow+1, signal = macd-signalPeriod+1", () => {
    const n = 60;
    const closes = Array.from({ length: n }, (_, i) => 100 + Math.sin(i) * 10);
    const { macd, signal, histogram } = calculateMACD(candles(closes));
    expect(macd).toHaveLength(n - 26 + 1);
    expect(signal).toHaveLength(macd.length - 9 + 1);
    expect(histogram).toHaveLength(signal.length);
    // histogramme = macd - signal sur les dates communes
    const offset = macd.length - signal.length;
    histogram.forEach((h, i) => {
      expect(h.value).toBeCloseTo(macd[i + offset].value - signal[i].value, 10);
    });
  });

  it("pas assez de points pour la ligne de signal -> signal vide", () => {
    const { macd, signal, histogram } = calculateMACD(candles(Array(30).fill(1)));
    expect(macd.length).toBeLessThan(9);
    expect(signal).toEqual([]);
    expect(histogram).toEqual([]);
  });
});

describe("calculateBollingerBands", () => {
  it("bande médiane = SMA, écart = mult * écart-type (population)", () => {
    const { upper, middle, lower } = calculateBollingerBands(
      candles([1, 2, 3, 4, 5]),
      3,
      2
    );
    expect(values(middle)).toEqual([2, 3, 4]);
    const sd = Math.sqrt(2 / 3); // variance population de {1,2,3}
    expect(upper[0].value).toBeCloseTo(2 + 2 * sd, 10);
    expect(lower[0].value).toBeCloseTo(2 - 2 * sd, 10);
  });

  it("série constante -> les trois bandes confondues", () => {
    const { upper, middle, lower } = calculateBollingerBands(
      candles(Array(25).fill(10)),
      20,
      2
    );
    expect(values(upper)).toEqual(values(middle));
    expect(values(lower)).toEqual(values(middle));
  });
});

describe("calculateHeikinAshi", () => {
  it("première bougie : open=(o+c)/2, close=(o+h+l+c)/4", () => {
    const [ha] = calculateHeikinAshi([
      { time: "2026-01-01", open: 10, high: 14, low: 8, close: 12, volume: 5 },
    ]);
    expect(ha.open).toBe(11);
    expect(ha.close).toBe(11); // (10+14+8+12)/4
    expect(ha.high).toBe(14);
    expect(ha.low).toBe(8);
  });

  it("bougies suivantes : open = milieu du corps HA précédent", () => {
    const out = calculateHeikinAshi(candles([10, 20]));
    expect(out[1].open).toBe((out[0].open + out[0].close) / 2);
  });
});

describe("calculateVWAP", () => {
  it("pondère le prix typique par le volume cumulé", () => {
    const data: OHLCV[] = [
      { time: "2026-01-01", open: 10, high: 12, low: 8, close: 10, volume: 100 },
      { time: "2026-01-02", open: 10, high: 22, low: 18, close: 20, volume: 300 },
    ];
    // typiques : (12+8+10)/3 = 10 et (22+18+20)/3 = 20
    const out = values(calculateVWAP(data));
    expect(out[0]).toBeCloseTo(10, 10);
    expect(out[1]).toBeCloseTo((10 * 100 + 20 * 300) / 400, 10);
  });

  it("volume nul -> retombe sur le prix typique (pas de division par zéro)", () => {
    const out = values(calculateVWAP(candles([15], 0)));
    expect(out).toEqual([15]);
  });
});
