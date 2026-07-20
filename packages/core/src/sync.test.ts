import { describe, expect, it } from "vitest";
import { EMPTY_CLOUD_SYNC, mergeLatest, type CloudSyncPayload } from "./sync";
import { cloudSyncPayloadEqual, reconcileCloudSync } from "./sync-reconcile";

describe("mergeLatest", () => {
  it("keeps the newest record regardless of source", () => {
    const local = [{ id: "SNTS", value: 1, updatedAt: "2026-07-14T10:00:00.000Z" }];
    const remote = [{ id: "SNTS", value: 2, updatedAt: "2026-07-14T11:00:00.000Z" }];
    expect(mergeLatest(local, remote)).toEqual(remote);
  });

  it("honors a newer deletion tombstone", () => {
    const local = [{ id: "SNTS", updatedAt: "2026-07-14T10:00:00.000Z" }];
    const remote = [{
      id: "SNTS",
      updatedAt: "2026-07-14T11:00:00.000Z",
      deletedAt: "2026-07-14T11:00:00.000Z",
    }];
    expect(mergeLatest(local, remote)).toEqual([]);
  });
});

const NOW = "2026-07-15T12:00:00.000Z";
const BEFORE = "2026-07-15T10:00:00.000Z";
const WEB_SCOPE = {
  preferenceKeys: ["chart", "chart_levels", "chart_layouts", "settings"] as const,
  preferencePatchKeys: {
    chart: ["maColors"],
    settings: ["alertScope", "alertImportantOnly", "hiddenAlertTypes"],
  },
};

function payload(patch: Partial<CloudSyncPayload>): CloudSyncPayload {
  return { ...EMPTY_CLOUD_SYNC, ...patch };
}

describe("reconcileCloudSync", () => {
  it("keeps the cloud version on a device's first sync", () => {
    const local = payload({ watchlists: [{ id: "default", name: "Seed", isActive: true, tickers: ["SNTS"], updatedAt: NOW }] });
    const remote = payload({ watchlists: [{ id: "default", name: "Personnelle", isActive: true, tickers: ["ORAC"], updatedAt: BEFORE }] });
    expect(reconcileCloudSync(local, remote, { now: NOW, scope: WEB_SCOPE }).watchlists).toEqual(remote.watchlists);
  });

  it("adds unique local and remote records without deleting either side", () => {
    const local = payload({ transactions: [{ id: "local", ticker: "SNTS", side: "achat", date: "2026-07-14", quantity: 1, price: 20_000, updatedAt: NOW }] });
    const remote = payload({ transactions: [{ id: "remote", ticker: "ORAC", side: "achat", date: "2026-07-14", quantity: 1, price: 2_000, updatedAt: BEFORE }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, scope: WEB_SCOPE });
    expect(merged.transactions.map((item) => item.id).sort()).toEqual(["local", "remote"]);
  });

  it("creates a tombstone only after a previously synced local record is removed", () => {
    const previous = payload({ transactions: [{ id: "tx", ticker: "SNTS", side: "achat", date: "2026-07-14", quantity: 1, price: 20_000, updatedAt: BEFORE }] });
    const merged = reconcileCloudSync(EMPTY_CLOUD_SYNC, previous, { now: NOW, previous, scope: WEB_SCOPE });
    expect(merged.transactions[0]).toMatchObject({ id: "tx", updatedAt: NOW, deletedAt: NOW });
  });

  it("accepts a remote tombstone when the local record has not changed", () => {
    const previous = payload({ alerts: [{ id: "alert", ticker: "SNTS", direction: "above", target: 25_000, enabled: true, channels: ["in_app"], updatedAt: BEFORE }] });
    const local = payload({ alerts: [{ ...previous.alerts[0], updatedAt: NOW }] });
    const remote = payload({ alerts: [{ ...previous.alerts[0], updatedAt: "2026-07-15T11:00:00.000Z", deletedAt: "2026-07-15T11:00:00.000Z" }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, previous, scope: WEB_SCOPE });
    expect(merged.alerts[0].deletedAt).toBe("2026-07-15T11:00:00.000Z");
  });

  it("merges concurrent watchlist ticker edits instead of replacing the list", () => {
    const previous = payload({ watchlists: [{ id: "default", name: "Liste", isActive: true, tickers: ["SNTS"], updatedAt: BEFORE }] });
    const local = payload({ watchlists: [{ id: "default", name: "Liste", isActive: true, tickers: ["SNTS", "ORAC"], updatedAt: NOW }] });
    const remote = payload({ watchlists: [{ id: "default", name: "Liste", isActive: true, tickers: ["SNTS", "SGBC"], updatedAt: "2026-07-15T11:00:00.000Z" }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, previous, scope: WEB_SCOPE });
    expect(merged.watchlists[0].tickers).toEqual(["SNTS", "ORAC", "SGBC"]);
  });

  it("preserves mobile chart fields when web changes only its chart colors", () => {
    const previous = payload({ preferences: [{ key: "chart", value: { maColors: { sma20: "#111" }, type: "line" }, updatedAt: BEFORE }] });
    const remote = payload({ preferences: [{ key: "chart", value: { maColors: { sma20: "#111" }, type: "area" }, updatedAt: "2026-07-15T11:00:00.000Z" }] });
    const local = payload({ preferences: [{ key: "chart", value: { maColors: { sma20: "#222" } }, updatedAt: NOW }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, previous, scope: WEB_SCOPE });
    expect(merged.preferences[0].value).toEqual({ maColors: { sma20: "#222" }, type: "area" });
  });

  it("adds non-overlapping preference fields on first sync without replacing cloud fields", () => {
    const local = payload({ preferences: [{ key: "chart", value: { maColors: { sma20: "#111" } }, updatedAt: NOW }] });
    const remote = payload({ preferences: [{ key: "chart", value: { type: "line" }, updatedAt: BEFORE }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, scope: WEB_SCOPE });
    expect(merged.preferences[0].value).toEqual({ type: "line", maColors: { sma20: "#111" } });
  });

  it("keeps SGI request tracking when alert display preferences change", () => {
    const sgiRequests = [{ id: "request-1", sgi_id: "boa-capital-securities", status: "pending" }];
    const previous = payload({ preferences: [{ key: "settings", value: { alertScope: "personal", sgiRequests }, updatedAt: BEFORE }] });
    const local = payload({ preferences: [{ key: "settings", value: { alertScope: "portfolio" }, updatedAt: NOW }] });
    const remote = payload({ preferences: [{ key: "settings", value: { alertScope: "personal", sgiRequests }, updatedAt: "2026-07-15T11:00:00.000Z" }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, previous, scope: WEB_SCOPE });
    expect(merged.preferences[0].value).toEqual({ alertScope: "portfolio", sgiRequests });
  });

  it("does not delete watchlists outside a mobile client's managed scope", () => {
    const previous = payload({ watchlists: [
      { id: "default", name: "Mobile", isActive: false, tickers: ["SNTS"], updatedAt: BEFORE },
      { id: "long-term", name: "Long terme", isActive: true, tickers: ["ORAC"], updatedAt: BEFORE },
    ] });
    const local = payload({ watchlists: [{ id: "default", name: "Mobile", isActive: true, tickers: ["SNTS"], updatedAt: NOW }] });
    const merged = reconcileCloudSync(local, previous, {
      now: NOW,
      previous,
      scope: { watchlistIds: ["default"], manageWatchlistActive: false, preferenceKeys: [] },
    });
    expect(merged.watchlists.find((item) => item.id === "long-term")).toEqual(previous.watchlists[1]);
  });

  it("merges concurrent chart-level changes ticker by ticker", () => {
    const previous = payload({ preferences: [{ key: "chart_levels", value: { SNTS: [20_000], ORAC: [2_000] }, updatedAt: BEFORE }] });
    const local = payload({ preferences: [{ key: "chart_levels", value: { SNTS: [21_000], ORAC: [2_000] }, updatedAt: NOW }] });
    const remote = payload({ preferences: [{ key: "chart_levels", value: { SNTS: [20_000], ORAC: [2_100] }, updatedAt: "2026-07-15T11:00:00.000Z" }] });
    const merged = reconcileCloudSync(local, remote, { now: NOW, previous, scope: WEB_SCOPE });
    expect(merged.preferences[0].value).toEqual({ SNTS: [21_000], ORAC: [2_100] });
  });

  it("compares payloads independently of database row order", () => {
    const left = payload({ savedFilters: [
      { id: "b", name: "B", filters: {}, updatedAt: BEFORE },
      { id: "a", name: "A", filters: {}, updatedAt: BEFORE },
    ] });
    const right = payload({ savedFilters: [...left.savedFilters].reverse() });
    expect(cloudSyncPayloadEqual(left, right)).toBe(true);
  });
});
