import { describe, expect, it } from "vitest";
import {
  parseAmount,
  parseBackupPayload,
  parseDateInput,
  parseFees,
  parseQuantity,
  priceAlertMatches,
  todayIso,
} from "./forms";

describe("parseAmount", () => {
  it("accepte les formats français avec espaces et virgule", () => {
    expect(parseAmount("25 000")).toBe(25000);
    expect(parseAmount("1 234,5")).toBe(1234.5);
    expect(parseAmount("9000")).toBe(9000);
  });
  it("rejette NaN, zéro, négatif et vide", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("1e999")).toBeNull();
  });
});

describe("parseQuantity", () => {
  it("accepte les entiers positifs", () => {
    expect(parseQuantity("10")).toBe(10);
    expect(parseQuantity(" 1 000 ")).toBe(1000);
  });
  it("rejette fractions, NaN, zéro et négatif", () => {
    expect(parseQuantity("1,5")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("-3")).toBeNull();
  });
});

describe("parseFees", () => {
  it("vide vaut 0 (frais optionnels)", () => {
    expect(parseFees("")).toBe(0);
    expect(parseFees("  ")).toBe(0);
  });
  it("accepte 0 et les montants positifs, rejette le reste", () => {
    expect(parseFees("0")).toBe(0);
    expect(parseFees("2 500")).toBe(2500);
    expect(parseFees("abc")).toBeNull();
    expect(parseFees("-1")).toBeNull();
  });
});

describe("parseDateInput", () => {
  it("accepte JJ/MM/AAAA et AAAA-MM-JJ", () => {
    expect(parseDateInput("05/03/2024")).toBe("2024-03-05");
    expect(parseDateInput("2024-03-05")).toBe("2024-03-05");
  });
  it("rejette les dates futures, impossibles ou pré-BRVM", () => {
    expect(parseDateInput("31/02/2024")).toBeNull();
    expect(parseDateInput("2999-01-01")).toBeNull();
    expect(parseDateInput("01/01/1990")).toBeNull();
    expect(parseDateInput("n'importe quoi")).toBeNull();
  });
  it("accepte aujourd'hui", () => {
    expect(parseDateInput(todayIso())).toBe(todayIso());
  });
});

describe("priceAlertMatches", () => {
  it("above se déclenche au seuil et au-dessus", () => {
    expect(priceAlertMatches({ direction: "above", target: 5000 }, 5000)).toBe(true);
    expect(priceAlertMatches({ direction: "above", target: 5000 }, 5100)).toBe(true);
    expect(priceAlertMatches({ direction: "above", target: 5000 }, 4999)).toBe(false);
  });
  it("below se déclenche au seuil et en dessous", () => {
    expect(priceAlertMatches({ direction: "below", target: 5000 }, 4999)).toBe(true);
    expect(priceAlertMatches({ direction: "below", target: 5000 }, 5001)).toBe(false);
  });
  it("ne se déclenche jamais sur des valeurs non finies", () => {
    expect(priceAlertMatches({ direction: "above", target: NaN }, 5000)).toBe(false);
    expect(priceAlertMatches({ direction: "below", target: 5000 }, NaN)).toBe(false);
  });
});

describe("parseBackupPayload", () => {
  const valid = JSON.stringify({
    version: 1,
    watchlist: ["SNTS", "ORAC", "snts-invalide", 42],
    transactions: [
      { id: "1", ticker: "SNTS", side: "achat", date: "2024-03-05", quantity: 10, price: 20000, fees: 500 },
      { id: "2", ticker: "SNTS", side: "achat", date: "2024-03-05", quantity: NaN, price: 20000 },
    ],
    alerts: [
      { id: "a", ticker: "ORAC", direction: "above", target: 15000, enabled: true },
      { id: "b", ticker: "ORAC", direction: "sideways", target: 15000, enabled: true },
    ],
  });

  it("garde les entrées valides et compte les écartées", () => {
    const result = parseBackupPayload(valid);
    if ("error" in result) throw new Error(result.error);
    expect(result.payload.watchlist).toEqual(["SNTS", "ORAC"]);
    expect(result.payload.transactions).toHaveLength(1);
    expect(result.payload.alerts).toHaveLength(1);
    expect(result.skipped).toBe(4);
  });

  it("NaN sérialisé en null est écarté", () => {
    const result = parseBackupPayload(valid);
    if ("error" in result) throw new Error(result.error);
    expect(result.payload.transactions.every((t) => Number.isFinite(t.quantity))).toBe(true);
  });

  it("rejette le JSON invalide et les fichiers vides", () => {
    expect(parseBackupPayload("pas du json")).toEqual({ error: "Fichier illisible : ce n'est pas du JSON valide." });
    expect("error" in parseBackupPayload("[]")).toBe(true);
    expect("error" in parseBackupPayload('{"watchlist":[],"transactions":[],"alerts":[]}')).toBe(true);
  });

  it("accepte une sauvegarde du site web (portfolio + watchlists.lists)", () => {
    const web = JSON.stringify({
      app: "WARIBA",
      version: 1,
      portfolio: [{ id: "t1", ticker: "SNTS", side: "achat", date: "2026-01-05", quantity: 10, price: 25000 }],
      watchlists: { lists: [{ id: "default", name: "Ma watchlist", tickers: ["SNTS", "PALC"] }], activeId: "default" },
      savedFilters: [],
    });
    const result = parseBackupPayload(web);
    if ("error" in result) throw new Error(result.error);
    expect(result.payload.transactions).toHaveLength(1);
    expect(result.payload.watchlist).toEqual(["SNTS", "PALC"]);
    expect(result.payload.alerts).toEqual([]);
  });

  it("tolère les sections manquantes (sauvegarde partielle)", () => {
    const result = parseBackupPayload('{"watchlist":["BICC"]}');
    if ("error" in result) throw new Error(result.error);
    expect(result.payload.watchlist).toEqual(["BICC"]);
    expect(result.payload.transactions).toEqual([]);
  });
});
