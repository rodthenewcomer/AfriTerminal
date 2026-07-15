"use client";

import type { CloudSyncPayload } from "@wariba/core/sync";
import { cloudSyncSchema } from "@wariba/core/sync-schema";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePriceAlerts } from "@/hooks/use-price-alerts";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { useChartPrefs } from "@/hooks/use-chart-prefs";
import { useChartLevels } from "@/hooks/use-chart-levels";
import { useChartLayouts } from "@/hooks/use-chart-layouts";

function now(): string {
  return new Date().toISOString();
}

export function buildWebCloudPayload(): CloudSyncPayload {
  const updatedAt = now();
  const watchlist = useWatchlist.getState();
  return {
    watchlists: watchlist.lists.map((list) => ({
      id: list.id,
      name: list.name,
      isActive: list.id === watchlist.activeId,
      tickers: [...new Set(list.tickers)],
      updatedAt,
    })),
    transactions: usePortfolio.getState().transactions.map((item) => ({ ...item, updatedAt })),
    alerts: usePriceAlerts.getState().alerts.map((item) => ({
      id: item.id,
      ticker: item.ticker,
      direction: item.direction,
      target: item.threshold,
      enabled: true,
      channels: item.channels?.length ? item.channels : ["in_app"],
      updatedAt,
    })),
    savedFilters: useSavedFilters.getState().saved.map((item) => ({
      id: item.id,
      name: item.name,
      filters: item.filters,
      updatedAt,
    })),
    preferences: [
      { key: "chart", value: { maColors: useChartPrefs.getState().maColors }, updatedAt },
      { key: "chart_levels", value: useChartLevels.getState().levels, updatedAt },
      {
        key: "chart_layouts",
        value: {
          layouts: useChartLayouts.getState().layouts,
          activeId: useChartLayouts.getState().activeId,
        },
        updatedAt,
      },
    ],
  };
}

async function cloudRequest(token: string, init?: RequestInit): Promise<CloudSyncPayload> {
  const response = await fetch("/api/v1/sync", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Synchronisation impossible");
  const parsed = cloudSyncSchema.safeParse(body);
  if (!parsed.success) throw new Error("Réponse de synchronisation invalide");
  return parsed.data as CloudSyncPayload;
}

export async function uploadWebData(token: string): Promise<CloudSyncPayload> {
  return cloudRequest(token, { method: "PUT", headers: { "X-Sync-Mode": "replace" }, body: JSON.stringify(buildWebCloudPayload()) });
}

export async function downloadWebData(token: string): Promise<CloudSyncPayload> {
  const payload = await cloudRequest(token);
  const watchlists = payload.watchlists.filter((item) => !item.deletedAt);
  useWatchlist.getState().replaceAll(
    watchlists.map((item) => ({ id: item.id, name: item.name, tickers: item.tickers })),
    watchlists.find((item) => item.isActive)?.id ?? watchlists[0]?.id ?? "default"
  );
  usePortfolio.getState().replaceAll(payload.transactions.filter((item) => !item.deletedAt));
  usePriceAlerts.setState({
    alerts: payload.alerts.filter((item) => !item.deletedAt).map((item) => ({
      id: item.id,
      ticker: item.ticker,
      direction: item.direction,
      threshold: item.target,
      createdAt: item.updatedAt.slice(0, 10),
      channels: item.channels,
    })),
  });
  useSavedFilters.getState().replaceAll(payload.savedFilters.filter((item) => !item.deletedAt).map((item) => ({
    id: item.id,
    name: item.name,
    filters: item.filters,
  })));

  for (const preference of payload.preferences) {
    if (preference.key === "chart" && !Array.isArray(preference.value) && typeof preference.value === "object" && preference.value) {
      const colors = (preference.value as { maColors?: unknown }).maColors;
      if (colors && typeof colors === "object") useChartPrefs.setState({ maColors: colors as ReturnType<typeof useChartPrefs.getState>["maColors"] });
    } else if (preference.key === "chart_levels" && !Array.isArray(preference.value) && typeof preference.value === "object" && preference.value) {
      useChartLevels.setState({ levels: preference.value as Record<string, number[]> });
    } else if (preference.key === "chart_layouts" && !Array.isArray(preference.value) && typeof preference.value === "object" && preference.value) {
      const value = preference.value as { layouts?: ReturnType<typeof useChartLayouts.getState>["layouts"]; activeId?: string };
      if (Array.isArray(value.layouts) && value.layouts.length) {
        useChartLayouts.setState({ layouts: value.layouts, activeId: value.activeId ?? value.layouts[0].id });
      }
    }
  }
  return payload;
}
