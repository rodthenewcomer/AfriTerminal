import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { fetchMarketPayload, fetchSeries } from "../data/api";
import type { MarketPayload, SeriesPayload } from "../data/types";
import { evaluatePriceAlerts } from "../services/alerts";
import { useSettingsStore } from "../stores";

const EMPTY: MarketPayload = {
  quotes: {}, fundamentals: {}, indices: [], alerts: [], dividends: {}, documents: [],
  operations: { avis: [], operations: [] }, news: [],
};

interface MarketContextValue extends MarketPayload {
  loading: boolean;
  refreshing: boolean;
  offline: boolean;
  error: string | null;
  updatedAt: string | null;
  refresh: () => Promise<void>;
  loadSeries: (ticker: string, options?: { force?: boolean }) => Promise<SeriesPayload>;
}

const MarketContext = createContext<MarketContextValue | null>(null);
const FOREGROUND_REFRESH_MS = 2 * 60 * 1000;

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const seriesCache = useRef(new Map<string, SeriesPayload>());
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const result = await fetchMarketPayload();
      setPayload(result.payload);
      setOffline(result.offline);
      setUpdatedAt(result.dataTimestamp);
      setError(result.missing.length ? `Sources momentanément indisponibles : ${result.missing.join(", ")}.` : null);
      void evaluatePriceAlerts(result.payload.quotes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || useSettingsStore.getState().dataSaver) return;
      const stale = !updatedAt || Date.now() - Date.parse(updatedAt) > FOREGROUND_REFRESH_MS;
      if (stale) void refresh();
    });
    return () => subscription.remove();
  }, [refresh, updatedAt]);
  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState !== "active" || useSettingsStore.getState().dataSaver) return;
      void refresh();
    }, FOREGROUND_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const loadSeries = useCallback(async (ticker: string, options?: { force?: boolean }) => {
    const key = ticker.toUpperCase();
    const cached = seriesCache.current.get(key);
    if (cached && !options?.force) return cached;
    const result = await fetchSeries(key);
    seriesCache.current.set(key, result.data);
    if (result.fromCache) setOffline(true);
    return result.data;
  }, []);

  const value = useMemo<MarketContextValue>(() => ({
    ...payload, loading, refreshing, offline, error, updatedAt, refresh, loadSeries,
  }), [payload, loading, refreshing, offline, error, updatedAt, refresh, loadSeries]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarketData(): MarketContextValue {
  const value = useContext(MarketContext);
  if (!value) throw new Error("useMarketData doit être utilisé dans MarketDataProvider");
  return value;
}
