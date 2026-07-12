import type { DividendMap } from "../data/types";

/**
 * Port mobile de lib/dividend-calendar.ts (web) : mêmes règles, mais
 * paramétré par la carte des dividendes chargée par le réseau au lieu
 * de l'import JSON au build. La BRVM ne publie pas de dates
 * d'ex-dividende à l'avance : la seule vue « à venir » honnête est la
 * saisonnalité des versements passés — récurrence ≠ garantie.
 */
export interface MonthlyDividendEntry {
  ticker: string;
  /** Dernier montant net par action versé ce mois-ci, FCFA */
  lastNet: number;
  /** Date du dernier versement dans ce mois, AAAA-MM-JJ */
  lastDate: string;
  /** Années où un versement a eu lieu ce mois-ci, triées croissant */
  years: number[];
}

export interface DividendEvent {
  ticker: string;
  date: string;
  net: number;
}

const MONTH_COUNT = 12;

export function dividendsByMonth(dividends: DividendMap): Record<number, MonthlyDividendEntry[]> {
  const byMonth: Record<number, Map<string, MonthlyDividendEntry>> = {};
  for (let month = 1; month <= MONTH_COUNT; month++) byMonth[month] = new Map();

  for (const [ticker, history] of Object.entries(dividends)) {
    for (const event of history) {
      const month = Number(event.date.slice(5, 7));
      const year = Number(event.date.slice(0, 4));
      if (!Number.isFinite(month) || month < 1 || month > MONTH_COUNT) continue;
      const map = byMonth[month];
      const existing = map.get(ticker);
      if (!existing) {
        map.set(ticker, { ticker, lastNet: event.net, lastDate: event.date, years: [year] });
      } else {
        const years = existing.years.includes(year) ? existing.years : [...existing.years, year].sort();
        const newer = event.date > existing.lastDate;
        map.set(ticker, {
          ...existing,
          years,
          lastNet: newer ? event.net : existing.lastNet,
          lastDate: newer ? event.date : existing.lastDate,
        });
      }
    }
  }

  const result: Record<number, MonthlyDividendEntry[]> = {};
  for (let month = 1; month <= MONTH_COUNT; month++) {
    result[month] = [...byMonth[month].values()].sort((a, b) => b.lastNet - a.lastNet);
  }
  return result;
}

export function allDividendEvents(dividends: DividendMap): DividendEvent[] {
  return Object.entries(dividends)
    .flatMap(([ticker, history]) => history.map((event) => ({ ticker, ...event })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Récurrent = versé au moins deux années distinctes sur ce mois calendaire. */
export function isRecurring(entry: MonthlyDividendEntry): boolean {
  return entry.years.length >= 2;
}
