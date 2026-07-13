import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MarketPayload, SeriesPayload } from "./types";

const PAGE_ROOT = "https://rodthenewcomer.github.io/AfriTerminal/data";
const RAW_ROOT = "https://raw.githubusercontent.com/rodthenewcomer/AfriTerminal/main/data";
const CACHE_PREFIX = "@afriterminal:data:";
const TIMEOUT_MS = 12_000;

type CachedValue<T> = { savedAt: string; data: T };
export type FetchResult<T> = { data: T; fromCache: boolean; source: string };

async function requestJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDataFile<T>(path: string): Promise<FetchResult<T>> {
  const cleanPath = path.replace(/^\/+/, "");
  const cacheKey = `${CACHE_PREFIX}${cleanPath}`;
  const sources = [`${PAGE_ROOT}/${cleanPath}`, `${RAW_ROOT}/${cleanPath}`];

  for (const source of sources) {
    try {
      const data = await requestJson<T>(source);
      const cached: CachedValue<T> = { savedAt: new Date().toISOString(), data };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
      return { data, fromCache: false, source };
    } catch {
      // Try the next official mirror before falling back to device cache.
    }
  }

  const cachedRaw = await AsyncStorage.getItem(cacheKey);
  if (cachedRaw) {
    const cached = JSON.parse(cachedRaw) as CachedValue<T>;
    return { data: cached.data, fromCache: true, source: "cache-appareil" };
  }
  throw new Error(`Donnée indisponible: ${cleanPath}`);
}

/**
 * Une source secondaire indisponible (actualités, opérations…) ne doit
 * jamais vider tout l'écran : chaque fichier est chargé indépendamment,
 * avec un repli vide et la liste des sources manquantes remontée à l'UI.
 * Seules les cotations sont indispensables — leur échec est propagé.
 */
export async function fetchMarketPayload(): Promise<{ payload: MarketPayload; offline: boolean; missing: string[] }> {
  const quotes = await fetchDataFile<MarketPayload["quotes"]>("real/snapshot.json");

  const optional = async <T>(label: string, path: string, fallback: T) => {
    try {
      const result = await fetchDataFile<T>(path);
      return { label, data: result.data, fromCache: result.fromCache, failed: false };
    } catch {
      return { label, data: fallback, fromCache: false, failed: true };
    }
  };

  const [fundamentals, indices, alerts, dividends, documents, operations, news] = await Promise.all([
    optional<MarketPayload["fundamentals"]>("fondamentaux", "real/fundamentals.json", {}),
    optional<MarketPayload["indices"]>("indices", "real/indices.json", []),
    optional<MarketPayload["alerts"]>("alertes", "real/alerts.json", []),
    optional<MarketPayload["dividends"]>("dividendes", "real/dividends.json", {}),
    optional<MarketPayload["documents"]>("documents", "real/documents.json", []),
    optional<MarketPayload["operations"]>("opérations", "real/operations.json", { avis: [], operations: [] }),
    optional<MarketPayload["news"]>("actualités", "news/news.json", []),
  ]);
  const secondary = [fundamentals, indices, alerts, dividends, documents, operations, news];
  return {
    payload: {
      quotes: quotes.data,
      fundamentals: fundamentals.data,
      indices: indices.data,
      alerts: alerts.data,
      dividends: dividends.data,
      documents: documents.data,
      operations: operations.data,
      news: news.data,
    },
    offline: quotes.fromCache || secondary.some((result) => result.fromCache),
    missing: secondary.filter((result) => result.failed).map((result) => result.label),
  };
}

export async function fetchSeries(ticker: string): Promise<FetchResult<SeriesPayload>> {
  return fetchDataFile<SeriesPayload>(`real/series/${ticker.toUpperCase()}.json`);
}

