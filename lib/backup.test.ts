import { describe, expect, it } from "vitest";
import { buildBackup, parseBackup } from "./backup";
import { legacyProductLabel } from "@wariba/core/legacy";

const VALID = buildBackup({
  portfolio: [
    { id: "t1", ticker: "SNTS", side: "achat", date: "2026-01-05", quantity: 10, price: 25_000 },
    { id: "t2", ticker: "PALC", side: "vente", date: "2026-03-02", quantity: 5, price: 9_000, fees: 500 },
  ],
  watchlists: {
    lists: [{ id: "default", name: "Ma watchlist", tickers: ["SNTS"] }],
    activeId: "default",
  },
  savedFilters: [{ id: "f1", name: "Dividendes", filters: { yieldMin: "6" } }],
});

describe("parseBackup", () => {
  it("aller-retour : un export se réimporte tel quel", () => {
    const res = parseBackup(JSON.stringify(VALID));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.portfolio).toHaveLength(2);
      expect(res.backup.watchlists.lists[0].tickers).toEqual(["SNTS"]);
      expect(res.backup.savedFilters[0].name).toBe("Dividendes");
    }
  });

  it("rejette un JSON invalide", () => {
    expect(parseBackup("{pas du json").ok).toBe(false);
  });

  it("rejette un fichier d'une autre application", () => {
    const res = parseBackup(JSON.stringify({ ...VALID, app: "AutreApp" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("WARIBA");
  });

  it("rejette une version future", () => {
    expect(parseBackup(JSON.stringify({ ...VALID, version: 999 })).ok).toBe(false);
  });

  it("importe une sauvegarde historique sans perdre les données", () => {
    const res = parseBackup(JSON.stringify({ ...VALID, app: legacyProductLabel() }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.backup.app).toBe("WARIBA");
  });

  it("tout ou rien : une transaction corrompue rejette le fichier", () => {
    const bad = {
      ...VALID,
      portfolio: [...VALID.portfolio, { id: "t3", ticker: "SNTS", side: "achat", date: "hier", quantity: 1, price: 100 }],
    };
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
  });

  it("rejette une quantité négative", () => {
    const bad = {
      ...VALID,
      portfolio: [{ id: "t1", ticker: "SNTS", side: "achat", date: "2026-01-05", quantity: -3, price: 25_000 }],
    };
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
  });
});

describe("parseBackup — sauvegarde de l'app mobile", () => {
  const MOBILE = {
    app: "WARIBA",
    version: 1,
    exportedAt: "2026-07-13T08:00:00.000Z",
    watchlist: ["SNTS", "ORAC"],
    transactions: [{ id: "m1", ticker: "SNTS", side: "achat", date: "2026-05-02", quantity: 4, price: 21_000 }],
    alerts: [{ id: "a1", ticker: "SNTS", direction: "above", target: 30_000, enabled: true }],
  };

  it("normalise une sauvegarde mobile vers le format web", () => {
    const res = parseBackup(JSON.stringify(MOBILE));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.portfolio).toHaveLength(1);
      expect(res.backup.watchlists.lists[0].tickers).toEqual(["SNTS", "ORAC"]);
      expect(res.backup.watchlists.activeId).toBe("mobile");
      expect(res.backup.savedFilters).toEqual([]);
    }
  });

  it("tout ou rien : une transaction mobile corrompue rejette le fichier", () => {
    const bad = { ...MOBILE, transactions: [{ ...MOBILE.transactions[0], quantity: NaN }] };
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
  });

  it("rejette une sauvegarde mobile sans donnée exploitable", () => {
    expect(parseBackup(JSON.stringify({ ...MOBILE, watchlist: [], transactions: [] })).ok).toBe(false);
  });
});
