import type { CloudSyncPayload } from "@wariba/core/sync";
import { cloudSyncSchema } from "@wariba/core/sync-schema";
import {
  useChartLevelStore,
  useChartStore,
  usePortfolioStore,
  usePriceAlertStore,
  useScreenerStore,
  useSettingsStore,
  useWatchlistStore,
} from "../stores";

function apiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("Serveur WARIBA non configuré");
  return value;
}

export function buildMobileCloudPayload(): CloudSyncPayload {
  const updatedAt = new Date().toISOString();
  const screener = useScreenerStore.getState();
  const settings = useSettingsStore.getState();
  return {
    watchlists: [{ id: "default", name: "Ma watchlist", isActive: true, tickers: useWatchlistStore.getState().tickers, updatedAt }],
    transactions: usePortfolioStore.getState().transactions.map((item) => ({ ...item, updatedAt })),
    alerts: usePriceAlertStore.getState().rules.map((item) => ({
      ...item,
      channels: item.channels?.length ? item.channels : ["in_app"],
      updatedAt,
    })),
    savedFilters: screener.saved.map((item) => ({
      id: item.id,
      name: item.label,
      filters: { query: item.query, sector: item.sector, sort: item.sort },
      updatedAt,
    })),
    preferences: [
      {
        key: "chart",
        value: {
          type: useChartStore.getState().type,
          indicators: useChartStore.getState().indicators,
          logarithmic: useChartStore.getState().logarithmic,
          percentMode: useChartStore.getState().percentMode,
        },
        updatedAt,
      },
      { key: "chart_levels", value: useChartLevelStore.getState().byTicker, updatedAt },
      {
        key: "settings",
        value: {
          notifications: settings.notifications,
          dataSaver: settings.dataSaver,
          experienceLevel: settings.experienceLevel,
        },
        updatedAt,
      },
    ],
  };
}

async function requestCloud(token: string, init?: RequestInit): Promise<CloudSyncPayload> {
  const response = await fetch(`${apiUrl()}/api/v1/sync`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Synchronisation impossible");
  const parsed = cloudSyncSchema.safeParse(body);
  if (!parsed.success) throw new Error("Réponse de synchronisation invalide");
  return parsed.data as CloudSyncPayload;
}

export async function uploadMobileData(token: string): Promise<void> {
  await requestCloud(token, { method: "PUT", headers: { "X-Sync-Mode": "replace" }, body: JSON.stringify(buildMobileCloudPayload()) });
}

export async function downloadMobileData(token: string): Promise<void> {
  const payload = await requestCloud(token);
  const active = payload.watchlists.find((item) => item.isActive && !item.deletedAt)
    ?? payload.watchlists.find((item) => !item.deletedAt);
  useWatchlistStore.getState().replaceAll(active?.tickers ?? []);
  usePortfolioStore.getState().replaceAll(payload.transactions.filter((item) => !item.deletedAt));
  usePriceAlertStore.getState().replaceAll(payload.alerts.filter((item) => !item.deletedAt).map((item) => ({
    id: item.id,
    ticker: item.ticker,
    direction: item.direction,
    target: item.target,
    enabled: item.enabled,
    ...(item.triggeredAt ? { triggeredAt: item.triggeredAt } : {}),
    channels: item.channels,
  })));
  useScreenerStore.setState({ saved: payload.savedFilters.filter((item) => !item.deletedAt).map((item) => ({
    id: item.id,
    label: item.name,
    query: item.filters.query ?? "",
    sector: item.filters.sector ?? "Tous",
    sort: item.filters.sort === "rendement" || item.filters.sort === "per" || item.filters.sort === "liquidite" ? item.filters.sort : "variation",
  })) });
  for (const preference of payload.preferences) {
    if (!preference.value || typeof preference.value !== "object" || Array.isArray(preference.value)) continue;
    if (preference.key === "chart") useChartStore.setState(preference.value);
    if (preference.key === "chart_levels") useChartLevelStore.setState({ byTicker: preference.value as Record<string, number[]> });
    if (preference.key === "settings") useSettingsStore.setState(preference.value);
  }
}
