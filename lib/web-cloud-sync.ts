"use client";

import type { CloudSyncPayload } from "@wariba/core/sync";
import { EMPTY_CLOUD_SYNC, isTicker } from "@wariba/core/sync";
import { cloudSyncSchema } from "@wariba/core/sync-schema";
import { cloudSyncPayloadEqual, reconcileCloudSync } from "@wariba/core/sync-reconcile";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePriceAlerts } from "@/hooks/use-price-alerts";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { DEFAULT_MA_COLORS, useChartPrefs, type MaId } from "@/hooks/use-chart-prefs";
import { useChartLevels } from "@/hooks/use-chart-levels";
import { useChartLayouts, type ChartLayout } from "@/hooks/use-chart-layouts";
import { useAlertPreferences, type AlertScope } from "@/hooks/use-alert-preferences";

let applyingCloudPayload = false;
let activeCloudUserId: string | null = null;
const ledgers = new Map<string, CloudSyncPayload>();
const WEB_SCOPE = {
  preferenceKeys: ["chart", "chart_levels", "chart_layouts", "settings"] as ("chart" | "chart_levels" | "chart_layouts" | "settings")[],
  preferencePatchKeys: {
    chart: ["maColors"],
    settings: ["alertScope", "alertImportantOnly", "hiddenAlertTypes"],
  },
};

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
      enabled: item.enabled,
      ...(item.triggeredAt ? { triggeredAt: item.triggeredAt } : {}),
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
      {
        key: "settings",
        value: {
          alertScope: useAlertPreferences.getState().scope,
          alertImportantOnly: useAlertPreferences.getState().importantOnly,
          hiddenAlertTypes: useAlertPreferences.getState().hiddenTypes,
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
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? "Synchronisation impossible");
  const parsed = cloudSyncSchema.safeParse(body);
  if (!parsed.success) throw new Error("Réponse de synchronisation invalide");
  return parsed.data as CloudSyncPayload;
}

function readLedger(userId: string): CloudSyncPayload | null {
  return ledgers.get(userId) ?? null;
}

function writeLedger(userId: string, payload: CloudSyncPayload): void {
  ledgers.set(userId, payload);
}

function validLevels(value: unknown): Record<string, number[]> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([ticker, levels]) => isTicker(ticker) && Array.isArray(levels))
    .map(([ticker, levels]) => [ticker, (levels as unknown[])
      .filter((level): level is number => typeof level === "number" && Number.isFinite(level) && level > 0)
      .slice(0, 100)]));
}

function validLayouts(value: unknown): { layouts: ChartLayout[]; activeId?: string } | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const candidate = value as { layouts?: unknown; activeId?: unknown };
  if (!Array.isArray(candidate.layouts)) return null;
  const layouts = candidate.layouts.filter((layout): layout is ChartLayout => {
    if (!layout || typeof layout !== "object") return false;
    const item = layout as Partial<ChartLayout>;
    return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 100
      && typeof item.name === "string" && item.name.length > 0 && item.name.length <= 80
      && (item.kind === 1 || item.kind === 2 || item.kind === 4)
      && Array.isArray(item.tickers) && item.tickers.length === 4 && item.tickers.every(isTicker);
  }).slice(0, 50);
  if (!layouts.length) return null;
  return {
    layouts,
    ...(typeof candidate.activeId === "string" && layouts.some((item) => item.id === candidate.activeId)
      ? { activeId: candidate.activeId }
      : {}),
  };
}

export function applyWebCloudPayload(payload: CloudSyncPayload): void {
  applyingCloudPayload = true;
  try {
    const watchlists = payload.watchlists.filter((item) => !item.deletedAt);
    useWatchlist.getState().replaceAll(
      watchlists.map((item) => ({ id: item.id, name: item.name, tickers: item.tickers })),
      watchlists.find((item) => item.isActive)?.id ?? watchlists[0]?.id ?? "default",
    );
    usePortfolio.getState().replaceAll(payload.transactions.filter((item) => !item.deletedAt));
    usePriceAlerts.setState({
      alerts: payload.alerts.filter((item) => !item.deletedAt).map((item) => ({
        id: item.id,
        ticker: item.ticker,
        direction: item.direction,
        threshold: item.target,
        createdAt: item.updatedAt.slice(0, 10),
        enabled: item.enabled,
        ...(item.triggeredAt ? { triggeredAt: item.triggeredAt } : {}),
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
        const raw = (preference.value as { maColors?: unknown }).maColors;
        if (raw && !Array.isArray(raw) && typeof raw === "object") {
          const maColors = { ...DEFAULT_MA_COLORS };
          for (const key of Object.keys(DEFAULT_MA_COLORS) as MaId[]) {
            const color = (raw as Record<string, unknown>)[key];
            if (typeof color === "string" && color.length <= 40) maColors[key] = color;
          }
          useChartPrefs.setState({ maColors });
        }
      } else if (preference.key === "chart_levels") {
        useChartLevels.setState({ levels: validLevels(preference.value) });
      } else if (preference.key === "chart_layouts") {
        const value = validLayouts(preference.value);
        if (value) useChartLayouts.setState({ layouts: value.layouts, activeId: value.activeId ?? value.layouts[0].id });
      } else if (preference.key === "settings" && !Array.isArray(preference.value) && preference.value) {
        const value = preference.value as {
          alertScope?: unknown;
          alertImportantOnly?: unknown;
          hiddenAlertTypes?: unknown;
        };
        const scopes: AlertScope[] = ["personal", "watchlist", "portfolio", "market"];
        const alertTypes = ["prix", "volume", "dividende", "document", "fondamental", "ia"] as const;
        useAlertPreferences.getState().replaceAll({
          scope: scopes.includes(value.alertScope as AlertScope) ? value.alertScope as AlertScope : "personal",
          importantOnly: value.alertImportantOnly === true,
          hiddenTypes: Array.isArray(value.hiddenAlertTypes)
            ? value.hiddenAlertTypes.filter((item): item is typeof alertTypes[number] => alertTypes.includes(item as typeof alertTypes[number]))
            : [],
        });
      }
    }
  } finally {
    applyingCloudPayload = false;
  }
}

export async function rehydrateWebCloudStores(): Promise<void> {
  await Promise.all([
    useChartPrefs.persist.rehydrate(),
    useChartLevels.persist.rehydrate(),
    useChartLayouts.persist.rehydrate(),
  ]);
}

export function clearWebCloudPersonalState(): void {
  applyingCloudPayload = true;
  try {
    useWatchlist.getState().replaceAll([], "default");
    usePortfolio.getState().clear();
    usePriceAlerts.getState().clear();
    useSavedFilters.getState().replaceAll([]);
    useAlertPreferences.getState().replaceAll({});
    activeCloudUserId = null;
  } finally {
    applyingCloudPayload = false;
  }
}

export function subscribeWebCloudChanges(onChange: () => void): () => void {
  const stores = [
    useWatchlist,
    usePortfolio,
    usePriceAlerts,
    useSavedFilters,
    useChartPrefs,
    useChartLevels,
    useChartLayouts,
    useAlertPreferences,
  ];
  const unsubscribers = stores.map((store) => store.subscribe(() => {
    if (!applyingCloudPayload) onChange();
  }));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function syncWebData(token: string, userId: string): Promise<CloudSyncPayload> {
  await rehydrateWebCloudStores();
  const remote = await cloudRequest(token);
  if (activeCloudUserId !== userId) {
    clearWebCloudPersonalState();
    activeCloudUserId = userId;
    applyWebCloudPayload(remote);
    writeLedger(userId, remote);
    return remote;
  }
  const previous = readLedger(userId) ?? EMPTY_CLOUD_SYNC;
  const reconciled = reconcileCloudSync(buildWebCloudPayload(), remote, {
    now: now(),
    previous,
    scope: WEB_SCOPE,
  });
  const canonical = cloudSyncPayloadEqual(reconciled, remote)
    ? remote
    : await cloudRequest(token, { method: "PUT", body: JSON.stringify(reconciled) });
  // Re-project once after the network round trip so an edit made while the
  // request was in flight cannot be overwritten by the server response.
  const localProjection = reconcileCloudSync(buildWebCloudPayload(), canonical, {
    now: now(),
    previous,
    scope: WEB_SCOPE,
  });
  applyWebCloudPayload(localProjection);
  writeLedger(userId, canonical);
  return canonical;
}

/** Compatibility wrapper: uploads now use non-destructive two-way reconciliation. */
export async function uploadWebData(token: string, userId: string): Promise<CloudSyncPayload> {
  return syncWebData(token, userId);
}

/** Compatibility wrapper: downloads now preserve unsynced local changes. */
export async function downloadWebData(token: string, userId: string): Promise<CloudSyncPayload> {
  return syncWebData(token, userId);
}
