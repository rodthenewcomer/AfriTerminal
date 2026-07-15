import type { PortfolioTransaction } from "./portfolio";

export type IsoTimestamp = string;

export interface SyncWatchlist {
  id: string;
  name: string;
  isActive: boolean;
  tickers: string[];
  updatedAt: IsoTimestamp;
  deletedAt?: IsoTimestamp;
}

export interface SyncPortfolioTransaction extends PortfolioTransaction {
  updatedAt: IsoTimestamp;
  deletedAt?: IsoTimestamp;
}

export interface SyncPriceAlert {
  id: string;
  ticker: string;
  direction: "above" | "below";
  target: number;
  enabled: boolean;
  triggeredAt?: IsoTimestamp;
  channels: ("in_app" | "push" | "email")[];
  updatedAt: IsoTimestamp;
  deletedAt?: IsoTimestamp;
}

export interface SyncSavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
  updatedAt: IsoTimestamp;
  deletedAt?: IsoTimestamp;
}

export interface SyncPreference {
  key: "chart" | "chart_levels" | "chart_layouts" | "settings";
  value: Record<string, unknown> | unknown[];
  updatedAt: IsoTimestamp;
}

export interface CloudSyncPayload {
  watchlists: SyncWatchlist[];
  transactions: SyncPortfolioTransaction[];
  alerts: SyncPriceAlert[];
  savedFilters: SyncSavedFilter[];
  preferences: SyncPreference[];
}

export const EMPTY_CLOUD_SYNC: CloudSyncPayload = {
  watchlists: [],
  transactions: [],
  alerts: [],
  savedFilters: [],
  preferences: [],
};

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function mergeLatest<T extends { id: string; updatedAt: string; deletedAt?: string }>(
  local: T[],
  remote: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const item of [...local, ...remote]) {
    if (!item.id || !validTimestamp(item.updatedAt)) continue;
    const previous = byId.get(item.id);
    if (!previous || Date.parse(item.updatedAt) >= Date.parse(previous.updatedAt)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].filter((item) => !item.deletedAt);
}

export function isTicker(value: string): boolean {
  return /^[A-Z0-9]{2,8}$/.test(value);
}
