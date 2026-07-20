import AsyncStorage from "@react-native-async-storage/async-storage";
import type { z } from "zod";
import { mergeLiveQuoteMap } from "@wariba/core/live-market";
import type { LiveMarketPayload, RealQuote } from "@wariba/core/types";
import type { MarketPayload, SeriesPayload } from "./types";
import {
  alertsSchema, dividendsSchema, documentsSchema, fundamentalsSchema, indicesSchema, liveMarketSchema,
  newsSchema, operationsSchema, quoteMapSchema, seriesSchema,
} from "./validation";

// L'apex wariba.app redirige vers www. Utiliser directement l'origine finale
// évite une redirection par fichier lors des rafraîchissements parallèles.
const PAGE_ROOT = "https://www.wariba.app/data";
const RAW_ROOT = "https://raw.githubusercontent.com/rodthenewcomer/WARIBA/main/data";
const CACHE_PREFIX = "@wariba:data:v3:";
const CACHE_VERSION = 4 as const;
const TIMEOUT_MS = 12_000;

type CachedValue<T> = { version: typeof CACHE_VERSION; savedAt: string; data: T };
export type FetchResult<T> = { data: T; fromCache: boolean; source: string; savedAt?: string };

async function requestJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const separator = url.includes("?") ? "&" : "?";
    const cacheBusted = `${url}${separator}v=${Math.floor(Date.now() / 60_000)}`;
    const response = await fetch(cacheBusted, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDataFile<T>(path: string, schema: z.ZodType<T>): Promise<FetchResult<T>> {
  const cleanPath = path.replace(/^\/+/, "");
  const cacheKey = `${CACHE_PREFIX}${cleanPath}`;
  const sources = [`${PAGE_ROOT}/${cleanPath}`, `${RAW_ROOT}/${cleanPath}`];

  for (const source of sources) {
    try {
      const data = schema.parse(await requestJson(source));
      const cached: CachedValue<T> = { version: CACHE_VERSION, savedAt: new Date().toISOString(), data };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
      return { data, fromCache: false, source };
    } catch {
      // Try the next official mirror before falling back to device cache.
    }
  }

  const cachedRaw = await AsyncStorage.getItem(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as Partial<CachedValue<unknown>>;
      if (cached.version !== CACHE_VERSION || typeof cached.savedAt !== "string") throw new Error("cache-version");
      const data = schema.parse(cached.data);
      return { data, fromCache: true, source: "cache-appareil", savedAt: cached.savedAt };
    } catch {
      await AsyncStorage.removeItem(cacheKey);
    }
  }
  throw new Error(`Donnée indisponible: ${cleanPath}`);
}

/**
 * Une source secondaire indisponible (actualités, opérations…) ne doit
 * jamais vider tout l'écran : chaque fichier est chargé indépendamment,
 * avec un repli vide et la liste des sources manquantes remontée à l'UI.
 * Seules les cotations sont indispensables — leur échec est propagé.
 */
export async function fetchMarketPayload(): Promise<{ payload: MarketPayload; offline: boolean; missing: string[]; dataTimestamp: string }> {
  const quotes = await fetchDataFile("real/snapshot.json", quoteMapSchema);

  const optional = async <T>(label: string, path: string, schema: z.ZodType<T>, fallback: T) => {
    try {
      const result = await fetchDataFile(path, schema);
      return { label, data: result.data, fromCache: result.fromCache, failed: false };
    } catch {
      return { label, data: fallback, fromCache: false, failed: true };
    }
  };

  const [fundamentals, indices, alerts, dividends, documents, operations, news, live] = await Promise.all([
    optional("fondamentaux", "real/fundamentals.json", fundamentalsSchema, {}),
    optional("indices", "real/indices.json", indicesSchema, []),
    optional("alertes", "real/alerts.json", alertsSchema, []),
    optional("dividendes", "real/dividends.json", dividendsSchema, {}),
    optional("documents", "real/documents.json", documentsSchema, []),
    optional("opérations", "real/operations.json", operationsSchema, { avis: [], operations: [] }),
    optional("actualités", "news/news.json", newsSchema, []),
    optional<LiveMarketPayload>("cours différés", "real/live.json", liveMarketSchema, {
      asOfDate: "1970-01-01",
      updatedAt: "1970-01-01T00:00:00+00:00",
      source: "indisponible",
      delayMinutes: 15,
      quotes: {},
    }),
  ]);
  const secondary = [fundamentals, indices, alerts, dividends, documents, operations, news, live];
  const mergedQuotes = mergeLiveQuoteMap(
    quotes.data as Record<string, RealQuote>,
    live.data
  );
  const officialDate = Object.values(quotes.data).reduce(
    (latest, quote) => quote.asOfDate > latest ? quote.asOfDate : latest,
    ""
  );
  const liveApplied = live.data.asOfDate > officialDate;
  return {
    payload: {
      quotes: mergedQuotes,
      fundamentals: fundamentals.data,
      indices: indices.data,
      alerts: alerts.data,
      dividends: dividends.data,
      documents: documents.data,
      operations: operations.data,
      news: news.data.filter((item) =>
        item.tickers.some((ticker) => Object.prototype.hasOwnProperty.call(mergedQuotes, ticker))
      ),
    },
    offline: quotes.fromCache || secondary.some((result) => result.fromCache),
    missing: secondary.filter((result) => result.failed).map((result) => result.label),
    // Si les cotations viennent du cache appareil, l'horodatage honnête est
    // celui de leur sauvegarde, pas celui de la tentative de rafraîchissement.
    dataTimestamp: liveApplied
      ? live.data.updatedAt
      : officialDate || quotes.savedAt || new Date().toISOString(),
  };
}

export async function fetchSeries(ticker: string): Promise<FetchResult<SeriesPayload>> {
  const symbol = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) throw new Error("Ticker invalide");
  return fetchDataFile(`real/series/${symbol}.json`, seriesSchema);
}
