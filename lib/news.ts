import newsJson from "@/data/news/news.json";
export {
  classifyNewsRegion,
  type NewsRegion,
} from "@wariba/core/news-region";

/**
 * Actualités réelles agrégées depuis Sika Finance et Financial Afrik
 * (pipeline scripts/news/fetch_news.py, rafraîchi par GitHub Actions).
 * Chaque item pointe vers l'article original — WARIBA agrège et
 * rattache aux tickers, il ne republie pas le contenu.
 */
export interface NewsItem {
  title: string;
  link: string;
  source: string;
  /** ISO 8601 UTC */
  publishedAt: string;
  summary: string;
  tickers: string[];
}

const ALL = (newsJson as NewsItem[]).filter((item) => item.tickers.length > 0);

export function latestNews(limit = 8): NewsItem[] {
  return ALL.slice(0, limit);
}

export function newsForTicker(ticker: string, limit = 6): NewsItem[] {
  return ALL.filter((n) => n.tickers.includes(ticker)).slice(0, limit);
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Abidjan",
});

/** « 8 juil., 07:35 » en heure d'Abidjan (= heure BRVM). */
export function newsDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}
