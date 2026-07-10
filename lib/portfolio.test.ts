import { describe, expect, it } from "vitest";
import {
  computePositions,
  dividendIncome,
  portfolioValueSeries,
  projectedIncome,
  valuePortfolio,
  type PortfolioTransaction,
} from "./portfolio";

function tx(over: Partial<PortfolioTransaction>): PortfolioTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    ticker: "SNTS",
    side: "achat",
    date: "2026-01-05",
    quantity: 10,
    price: 25_000,
    ...over,
  };
}

describe("computePositions — coût moyen (PRU)", () => {
  it("un achat simple : PRU = prix, investi = qté × prix", () => {
    const [p] = computePositions([tx({})]);
    expect(p.quantity).toBe(10);
    expect(p.averageCost).toBe(25_000);
    expect(p.invested).toBe(250_000);
    expect(p.realizedPnl).toBe(0);
  });

  it("deux achats à prix différents : PRU pondéré", () => {
    const [p] = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-02-01", quantity: 10, price: 30_000 }),
    ]);
    expect(p.quantity).toBe(20);
    expect(p.averageCost).toBe(25_000);
  });

  it("les frais d'achat entrent dans le PRU", () => {
    const [p] = computePositions([tx({ quantity: 10, price: 25_000, fees: 5_000 })]);
    expect(p.averageCost).toBe(25_500);
  });

  it("une vente réalise la plus-value contre le PRU sans le changer", () => {
    const [p] = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-03-01", side: "vente", quantity: 4, price: 26_000 }),
    ]);
    expect(p.quantity).toBe(6);
    expect(p.averageCost).toBe(20_000);
    expect(p.realizedPnl).toBe(4 * 6_000);
  });

  it("vente au-delà du détenu : plafonnée et signalée", () => {
    const [p] = computePositions([
      tx({ quantity: 5, price: 20_000 }),
      tx({ date: "2026-03-01", side: "vente", quantity: 8, price: 22_000 }),
    ]);
    expect(p.quantity).toBe(0);
    expect(p.oversold).toBe(true);
    expect(p.realizedPnl).toBe(5 * 2_000);
  });

  it("l'ordre chronologique prime sur l'ordre de saisie", () => {
    const [p] = computePositions([
      tx({ date: "2026-05-01", side: "vente", quantity: 5, price: 30_000 }),
      tx({ date: "2026-01-01", quantity: 10, price: 20_000 }),
    ]);
    expect(p.quantity).toBe(5);
    expect(p.realizedPnl).toBe(5 * 10_000);
  });
});

describe("valuePortfolio", () => {
  it("valorise au dernier cours et calcule les poids", () => {
    const positions = computePositions([
      tx({ ticker: "SNTS", quantity: 10, price: 25_000 }),
      tx({ ticker: "PALC", quantity: 100, price: 8_000 }),
    ]);
    const summary = valuePortfolio(positions, (t) =>
      t === "SNTS" ? 31_000 : 9_000
    );
    expect(summary.totalValue).toBe(10 * 31_000 + 100 * 9_000);
    expect(summary.totalInvested).toBe(250_000 + 800_000);
    expect(summary.totalUnrealizedPnl).toBe(60_000 + 100_000);
    const weights = summary.positions.map((p) => p.weightPct);
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });

  it("position soldée : hors valorisation, réalisé conservé", () => {
    const positions = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-04-01", side: "vente", quantity: 10, price: 25_000 }),
    ]);
    const summary = valuePortfolio(positions, () => 26_000);
    expect(summary.positions).toHaveLength(0);
    expect(summary.totalValue).toBe(0);
    expect(summary.totalRealizedPnl).toBe(10 * 5_000);
  });

  it("cours inconnu (valeur radiée) : repli sur le PRU, P&L latent nul", () => {
    const positions = computePositions([tx({ ticker: "XXXX" })]);
    const summary = valuePortfolio(positions, () => undefined);
    expect(summary.positions[0].unrealizedPnl).toBe(0);
  });
});

describe("portfolioValueSeries", () => {
  const closes = {
    SNTS: [
      { time: "2026-01-05", close: 25_000 },
      { time: "2026-01-06", close: 26_000 },
      { time: "2026-01-08", close: 27_000 },
    ],
    PALC: [
      { time: "2026-01-06", close: 8_000 },
      { time: "2026-01-07", close: 8_500 },
      { time: "2026-01-08", close: 8_200 },
    ],
  };

  it("reconstruit la valeur jour par jour avec forward-fill", () => {
    const series = portfolioValueSeries(
      [
        tx({ ticker: "SNTS", date: "2026-01-05", quantity: 10, price: 25_000 }),
        tx({ ticker: "PALC", date: "2026-01-06", quantity: 100, price: 8_000 }),
      ],
      closes
    );
    expect(series.map((p) => p.time)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
    ]);
    expect(series[0].value).toBe(10 * 25_000);
    expect(series[1].value).toBe(10 * 26_000 + 100 * 8_000);
    // 01-07 : SNTS sans cotation -> report du 26 000
    expect(series[2].value).toBe(10 * 26_000 + 100 * 8_500);
    expect(series[3].value).toBe(10 * 27_000 + 100 * 8_200);
  });

  it("l'investi cumule les apports et décroît à la vente", () => {
    const series = portfolioValueSeries(
      [
        tx({ ticker: "SNTS", date: "2026-01-05", quantity: 10, price: 25_000 }),
        tx({ ticker: "SNTS", date: "2026-01-08", side: "vente", quantity: 5, price: 27_000 }),
      ],
      { SNTS: closes.SNTS }
    );
    expect(series[0].invested).toBe(250_000);
    expect(series[2].invested).toBe(250_000 - 5 * 27_000);
    expect(series[2].value).toBe(5 * 27_000);
  });

  it("aucune transaction -> série vide", () => {
    expect(portfolioValueSeries([], closes)).toEqual([]);
  });
});

describe("dividendIncome", () => {
  const history = (t: string) =>
    t === "SNTS"
      ? [
          { date: "2025-05-22", net: 1_655 },
          { date: "2026-05-26", net: 1_740 },
        ]
      : [];

  it("compte les titres détenus avant la date de paiement", () => {
    const { events, total } = dividendIncome(
      [tx({ ticker: "SNTS", date: "2026-01-05", quantity: 10, price: 25_000 })],
      history
    );
    // acheté en 2026 : seul le dividende de mai 2026 est perçu
    expect(events).toHaveLength(1);
    expect(events[0].amount).toBe(10 * 1_740);
    expect(total).toBe(17_400);
  });

  it("un achat le jour même du paiement ne compte pas", () => {
    const { events } = dividendIncome(
      [tx({ ticker: "SNTS", date: "2026-05-26", quantity: 10, price: 30_000 })],
      history
    );
    expect(events).toHaveLength(0);
  });

  it("une vente avant paiement réduit la quantité éligible", () => {
    const { events } = dividendIncome(
      [
        tx({ ticker: "SNTS", date: "2025-01-05", quantity: 10, price: 25_000 }),
        tx({ ticker: "SNTS", date: "2026-05-20", side: "vente", quantity: 6, price: 30_000 }),
      ],
      history
    );
    // 2025 : 10 titres × 1655 ; 2026 : 4 titres × 1740
    expect(events.map((e) => e.amount).sort((a, b) => a - b)).toEqual([
      4 * 1_740,
      10 * 1_655,
    ]);
  });
});

describe("projectedIncome", () => {
  it("projette le dernier dividende et le rendement sur PRU", () => {
    const positions = computePositions([
      tx({ ticker: "SNTS", quantity: 10, price: 20_000 }),
      tx({ ticker: "XXXX", quantity: 5, price: 1_000 }),
    ]);
    const { perPosition, totalAnnual, portfolioYieldOnCost } = projectedIncome(
      positions,
      (t) => (t === "SNTS" ? 1_740 : null)
    );
    // XXXX sans dividende : exclu de la projection
    expect(perPosition).toHaveLength(1);
    expect(perPosition[0].annual).toBe(17_400);
    expect(perPosition[0].yieldOnCost).toBeCloseTo(8.7);
    expect(totalAnnual).toBe(17_400);
    // investi total = 200 000 + 5 000 ; rendement portefeuille dilué par XXXX
    expect(portfolioYieldOnCost).toBeCloseTo((17_400 / 205_000) * 100);
  });

  it("position soldée : aucun revenu projeté", () => {
    const positions = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-02-01", side: "vente", quantity: 10, price: 22_000 }),
    ]);
    const { totalAnnual } = projectedIncome(positions, () => 1_740);
    expect(totalAnnual).toBe(0);
  });
});
