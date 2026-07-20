import type { CloudSyncPayload } from "@wariba/core/sync";
import { EMPTY_CLOUD_SYNC, isTicker } from "@wariba/core/sync";
import { cloudSyncSchema } from "@wariba/core/sync-schema";
import { cloudSyncPayloadEqual, reconcileCloudSync } from "@wariba/core/sync-reconcile";
import type { ChartType, IndicatorId } from "@wariba/core/types";
import {
  useChartLevelStore,
  useChartStore,
  useAlertPreferencesStore,
  usePortfolioStore,
  usePriceAlertStore,
  useScreenerStore,
  useSettingsStore,
  useWatchlistStore,
} from "../stores";

let applyingCloudPayload = false;
let activeCloudUserId: string | null = null;
const cloudLedger = new Map<string, CloudSyncPayload>();
const CHART_TYPES = new Set<ChartType>(["candlestick", "line", "area", "baseline", "bars", "heikin-ashi"]);
const INDICATORS = new Set<IndicatorId>(["sma20", "sma50", "sma100", "sma200", "ema20", "vwap", "bollinger", "rsi", "macd", "atr", "stoch"]);
const MOBILE_SCOPE = {
  watchlistIds: ["default"],
  manageWatchlistActive: false,
  preferenceKeys: ["chart", "chart_levels", "settings"] as ("chart" | "chart_levels" | "settings")[],
  preferencePatchKeys: {
    chart: ["type", "indicators", "logarithmic", "percentMode"],
    settings: [
      "notifications",
      "dataSaver",
      "experienceLevel",
      "alertScope",
      "alertImportantOnly",
      "hiddenAlertTypes",
    ],
  },
};

function apiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("Serveur WARIBA non configuré");
  return value;
}

export function buildMobileCloudPayload(): CloudSyncPayload {
  const updatedAt = new Date().toISOString();
  const screener = useScreenerStore.getState();
  const settings = useSettingsStore.getState();
  const alertPreferences = useAlertPreferencesStore.getState();
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
          alertScope: alertPreferences.scope,
          alertImportantOnly: alertPreferences.importantOnly,
          hiddenAlertTypes: alertPreferences.hiddenTypes,
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
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? "Synchronisation impossible");
  const parsed = cloudSyncSchema.safeParse(body);
  if (!parsed.success) throw new Error("Réponse de synchronisation invalide");
  return parsed.data as CloudSyncPayload;
}

function validLevels(value: unknown): Record<string, number[]> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([ticker, levels]) => isTicker(ticker) && Array.isArray(levels))
    .map(([ticker, levels]) => [ticker, (levels as unknown[])
      .filter((level): level is number => typeof level === "number" && Number.isFinite(level) && level > 0)
      .slice(0, 100)]));
}

export function applyMobileCloudPayload(payload: CloudSyncPayload): void {
  applyingCloudPayload = true;
  try {
    const defaultList = payload.watchlists.find((item) => item.id === "default" && !item.deletedAt)
      ?? payload.watchlists.find((item) => item.isActive && !item.deletedAt)
      ?? payload.watchlists.find((item) => !item.deletedAt);
    useWatchlistStore.getState().replaceAll(defaultList?.tickers ?? []);
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
      const value = preference.value as Record<string, unknown>;
      if (preference.key === "chart") {
        const patch: Partial<ReturnType<typeof useChartStore.getState>> = {};
        if (typeof value.type === "string" && CHART_TYPES.has(value.type as ChartType)) patch.type = value.type as ChartType;
        if (Array.isArray(value.indicators)) patch.indicators = value.indicators.filter((item): item is IndicatorId => typeof item === "string" && INDICATORS.has(item as IndicatorId));
        if (typeof value.logarithmic === "boolean") patch.logarithmic = value.logarithmic;
        if (typeof value.percentMode === "boolean") patch.percentMode = value.percentMode;
        useChartStore.setState(patch);
      } else if (preference.key === "chart_levels") {
        useChartLevelStore.setState({ byTicker: validLevels(value) });
      } else if (preference.key === "settings") {
        const patch: Partial<ReturnType<typeof useSettingsStore.getState>> = {};
        if (typeof value.notifications === "boolean") patch.notifications = value.notifications;
        if (typeof value.dataSaver === "boolean") patch.dataSaver = value.dataSaver;
        if (value.experienceLevel === null || value.experienceLevel === "debutant" || value.experienceLevel === "intermediaire" || value.experienceLevel === "avance") {
          patch.experienceLevel = value.experienceLevel;
        }
        useSettingsStore.setState(patch);
        const validScopes = new Set(["personal", "watchlist", "portfolio", "market"]);
        const validTypes = new Set(["prix", "volume", "dividende", "document", "fondamental", "ia"]);
        useAlertPreferencesStore.getState().replaceAll({
          ...(typeof value.alertScope === "string" && validScopes.has(value.alertScope)
            ? { scope: value.alertScope as "personal" | "watchlist" | "portfolio" | "market" }
            : {}),
          ...(typeof value.alertImportantOnly === "boolean" ? { importantOnly: value.alertImportantOnly } : {}),
          ...(Array.isArray(value.hiddenAlertTypes)
            ? { hiddenTypes: value.hiddenAlertTypes.filter((item): item is "prix" | "volume" | "dividende" | "document" | "fondamental" | "ia" => typeof item === "string" && validTypes.has(item)) }
            : {}),
        });
      }
    }
  } finally {
    applyingCloudPayload = false;
  }
}

export function subscribeMobileCloudChanges(onChange: () => void): () => void {
  const stores = [
    useWatchlistStore,
    usePortfolioStore,
    usePriceAlertStore,
    useAlertPreferencesStore,
    useChartStore,
    useChartLevelStore,
    useScreenerStore,
    useSettingsStore,
  ];
  const unsubscribers = stores.map((store) => store.subscribe(() => {
    if (!applyingCloudPayload) onChange();
  }));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function clearMobileCloudPersonalState(): void {
  applyingCloudPayload = true;
  try {
    useWatchlistStore.getState().replaceAll([]);
    usePortfolioStore.getState().replaceAll([]);
    usePriceAlertStore.getState().replaceAll([]);
    useAlertPreferencesStore.getState().replaceAll({});
    useScreenerStore.setState({ saved: [] });
    activeCloudUserId = null;
    cloudLedger.clear();
  } finally {
    applyingCloudPayload = false;
  }
}

export async function syncMobileData(token: string, userId: string): Promise<CloudSyncPayload> {
  const remote = await requestCloud(token);
  const previous = cloudLedger.get(userId) ?? null;
  if (activeCloudUserId !== userId) {
    applyMobileCloudPayload(remote);
    activeCloudUserId = userId;
    cloudLedger.set(userId, remote);
    return remote;
  }
  const baseline = previous ?? EMPTY_CLOUD_SYNC;
  const reconciled = reconcileCloudSync(buildMobileCloudPayload(), remote, {
    now: new Date().toISOString(),
    previous: baseline,
    scope: MOBILE_SCOPE,
  });
  const canonical = cloudSyncPayloadEqual(reconciled, remote)
    ? remote
    : await requestCloud(token, { method: "PUT", body: JSON.stringify(reconciled) });
  // Preserve an edit made while the network request was in flight. It remains
  // pending locally and the provider's queued pass sends it immediately after.
  const localProjection = reconcileCloudSync(buildMobileCloudPayload(), canonical, {
    now: new Date().toISOString(),
    previous: baseline,
    scope: MOBILE_SCOPE,
  });
  applyMobileCloudPayload(localProjection);
  cloudLedger.set(userId, canonical);
  return canonical;
}

/** Compatibility wrapper: uploads now reconcile both sides without replacement. */
export async function uploadMobileData(token: string, userId: string): Promise<void> {
  await syncMobileData(token, userId);
}

/** Compatibility wrapper: downloads now retain unsynced local changes. */
export async function downloadMobileData(token: string, userId: string): Promise<void> {
  await syncMobileData(token, userId);
}
