import type { PortfolioTransaction } from "./portfolio";
import type { WatchlistDef } from "./types";
import type { SavedFilter } from "@/hooks/use-saved-filters";

/**
 * Sauvegarde/restauration des données locales — le portefeuille, les
 * watchlists et les filtres vivent en localStorage : un vidage de cache
 * ou un changement d'appareil efface tout. Ce module produit un fichier
 * JSON autoporteur et valide strictement ce qu'on lui redonne (un
 * fichier trafiqué ou d'une autre app ne doit jamais corrompre l'état).
 */

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "AfriTerminal";
  version: number;
  exportedAt: string;
  portfolio: PortfolioTransaction[];
  watchlists: { lists: WatchlistDef[]; activeId: string };
  savedFilters: SavedFilter[];
}

export function buildBackup(data: {
  portfolio: PortfolioTransaction[];
  watchlists: { lists: WatchlistDef[]; activeId: string };
  savedFilters: SavedFilter[];
}): BackupFile {
  return {
    app: "AfriTerminal",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isTransaction(x: unknown): x is PortfolioTransaction {
  if (typeof x !== "object" || x === null) return false;
  const t = x as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.ticker === "string" &&
    t.ticker.length > 0 &&
    (t.side === "achat" || t.side === "vente") &&
    typeof t.date === "string" &&
    DATE_RE.test(t.date) &&
    typeof t.quantity === "number" &&
    Number.isFinite(t.quantity) &&
    t.quantity > 0 &&
    typeof t.price === "number" &&
    Number.isFinite(t.price) &&
    t.price > 0 &&
    (t.fees === undefined ||
      (typeof t.fees === "number" && Number.isFinite(t.fees) && t.fees >= 0))
  );
}

function isWatchlist(x: unknown): x is WatchlistDef {
  if (typeof x !== "object" || x === null) return false;
  const w = x as Record<string, unknown>;
  return (
    typeof w.id === "string" &&
    typeof w.name === "string" &&
    Array.isArray(w.tickers) &&
    w.tickers.every((t) => typeof t === "string")
  );
}

function isSavedFilter(x: unknown): x is SavedFilter {
  if (typeof x !== "object" || x === null) return false;
  const f = x as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.name === "string" &&
    typeof f.filters === "object" &&
    f.filters !== null &&
    Object.values(f.filters as object).every((v) => typeof v === "string")
  );
}

export type BackupParseResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string };

/** Valide un contenu de fichier de sauvegarde. Tout ou rien : un seul
 * enregistrement invalide rejette le fichier (pas de restauration
 * partielle silencieuse). */
export function parseBackup(raw: string): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un JSON valide." };
  }
  if (typeof json !== "object" || json === null) {
    return { ok: false, error: "Structure de fichier inattendue." };
  }
  const b = json as Record<string, unknown>;
  if (b.app !== "AfriTerminal") {
    return {
      ok: false,
      error: "Ce fichier ne provient pas d'AfriTerminal (champ « app » absent).",
    };
  }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    return {
      ok: false,
      error:
        "Version de sauvegarde plus récente que cette application — mettez la page à jour.",
    };
  }
  if (!Array.isArray(b.portfolio) || !b.portfolio.every(isTransaction)) {
    return { ok: false, error: "Transactions du portefeuille invalides." };
  }
  const w = b.watchlists as Record<string, unknown> | undefined;
  if (
    typeof w !== "object" ||
    w === null ||
    !Array.isArray(w.lists) ||
    !w.lists.every(isWatchlist) ||
    typeof w.activeId !== "string"
  ) {
    return { ok: false, error: "Watchlists invalides." };
  }
  if (!Array.isArray(b.savedFilters) || !b.savedFilters.every(isSavedFilter)) {
    return { ok: false, error: "Filtres enregistrés invalides." };
  }
  return { ok: true, backup: b as unknown as BackupFile };
}
