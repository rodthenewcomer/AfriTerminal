import type { StockSnapshot } from "@wariba/core/types";

function stableTickerOrder(a: StockSnapshot, b: StockSnapshot): number {
  return a.ticker.localeCompare(b.ticker);
}

/** Valeurs effectivement cotées sur la séance la plus récente.
 * Une valeur suspendue reste disponible dans sa fiche, mais ne doit pas
 * fausser la breadth, les tops ou les moyennes de la séance courante. */
export function currentSessionSnapshots(
  snapshots: readonly StockSnapshot[]
): StockSnapshot[] {
  const latest = snapshots.reduce(
    (date, snapshot) =>
      snapshot.real && snapshot.real.asOfDate > date
        ? snapshot.real.asOfDate
        : date,
    ""
  );
  return snapshots.filter(
    (snapshot) => !snapshot.real || snapshot.real.asOfDate === latest
  );
}

export function rankGainers(
  snapshots: readonly StockSnapshot[],
  limit = 5
): StockSnapshot[] {
  return currentSessionSnapshots(snapshots)
    .filter((snapshot) => snapshot.dayChange > 0)
    .sort((a, b) => b.dayChange - a.dayChange || stableTickerOrder(a, b))
    .slice(0, limit);
}

export function rankLosers(
  snapshots: readonly StockSnapshot[],
  limit = 5
): StockSnapshot[] {
  return currentSessionSnapshots(snapshots)
    .filter((snapshot) => snapshot.dayChange < 0)
    .sort((a, b) => a.dayChange - b.dayChange || stableTickerOrder(a, b))
    .slice(0, limit);
}

export function rankUnusualVolumes(
  snapshots: readonly StockSnapshot[],
  limit = 5,
  minimumRatio = 1.5
): StockSnapshot[] {
  return currentSessionSnapshots(snapshots)
    .filter(
      (snapshot) =>
        snapshot.real?.quoteStatus !== "delayed-live" &&
        snapshot.volumeRatio >= minimumRatio
    )
    .sort(
      (a, b) => b.volumeRatio - a.volumeRatio || stableTickerOrder(a, b)
    )
    .slice(0, limit);
}

/** Classement purement factuel : amplitude absolue sur une semaine.
 * Il ne constitue ni un score de qualité ni une recommandation d'achat. */
export function rankWeeklyMovers(
  snapshots: readonly StockSnapshot[],
  limit = 4
): StockSnapshot[] {
  return currentSessionSnapshots(snapshots)
    .sort(
      (a, b) =>
        Math.abs(b.weekChange) - Math.abs(a.weekChange) ||
        stableTickerOrder(a, b)
    )
    .slice(0, limit);
}

export function marketBreadth(snapshots: readonly StockSnapshot[]): {
  advancing: number;
  declining: number;
  unchanged: number;
  total: number;
} {
  const current = currentSessionSnapshots(snapshots);
  const advancing = current.filter((snapshot) => snapshot.dayChange > 0).length;
  const declining = current.filter((snapshot) => snapshot.dayChange < 0).length;
  return {
    advancing,
    declining,
    unchanged: current.length - advancing - declining,
    total: current.length,
  };
}
