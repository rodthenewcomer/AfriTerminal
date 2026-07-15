/**
 * Analyse et validation des saisies utilisateur — fonctions pures, testées.
 *
 * Number("abc") vaut NaN et `NaN <= 0` vaut false : une validation naïve
 * laissait passer des quantités/prix invalides jusque dans le stockage
 * persistant. Tout passe désormais par ces fonctions.
 */
import type { PortfolioTransaction } from "@wariba/core/portfolio";
import type { PriceAlertRule } from "../stores";

/** Ouverture de la BRVM : aucune transaction ne peut être antérieure. */
const MIN_DATE = "1998-09-16";

/** Montant FCFA saisi en format français ("25 000", "1 234,5") → nombre fini > 0, sinon null. */
export function parseAmount(input: string): number | null {
  const value = Number(input.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Comme parseAmount mais accepte 0 (frais optionnels). */
export function parseFees(input: string): number | null {
  if (!input.trim()) return 0;
  const value = Number(input.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Quantité de titres : entier strictement positif (pas de fraction à la BRVM). */
export function parseQuantity(input: string): number | null {
  const value = Number(input.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Date saisie en JJ/MM/AAAA ou AAAA-MM-JJ → ISO AAAA-MM-JJ.
 * Refuse les dates invalides, futures ou antérieures à l'ouverture de la BRVM.
 */
export function parseDateInput(input: string): string | null {
  const trimmed = input.trim();
  let iso: string | null = null;
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (fr) iso = `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) iso = trimmed;
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!roundTrips || iso < MIN_DATE || iso > todayIso()) return null;
  return iso;
}

/** Une règle d'alerte se déclenche-t-elle pour ce cours ? */
export function priceAlertMatches(rule: Pick<PriceAlertRule, "direction" | "target">, price: number): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(rule.target)) return false;
  return rule.direction === "above" ? price >= rule.target : price <= rule.target;
}

export interface BackupPayload {
  watchlist: string[];
  transactions: PortfolioTransaction[];
  alerts: PriceAlertRule[];
}

function isTransaction(value: unknown): value is PortfolioTransaction {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && typeof item.ticker === "string" && item.ticker.length > 0
    && (item.side === "achat" || item.side === "vente")
    && typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    && typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
    && typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0
    && (item.fees === undefined || (typeof item.fees === "number" && Number.isFinite(item.fees) && item.fees >= 0));
}

function isAlertRule(value: unknown): value is PriceAlertRule {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && typeof item.ticker === "string" && item.ticker.length > 0
    && (item.direction === "above" || item.direction === "below")
    && typeof item.target === "number" && Number.isFinite(item.target) && item.target > 0
    && typeof item.enabled === "boolean"
    && (item.triggeredAt === undefined || typeof item.triggeredAt === "string");
}

/** Sauvegarde du site web : les tickers vivent dans watchlists.lists[].tickers. */
function webWatchlistTickers(value: unknown): unknown[] {
  if (typeof value !== "object" || value === null) return [];
  const lists = (value as { lists?: unknown }).lists;
  if (!Array.isArray(lists)) return [];
  return lists.flatMap((list) => {
    if (typeof list !== "object" || list === null) return [];
    const tickers = (list as { tickers?: unknown }).tickers;
    return Array.isArray(tickers) ? tickers : [];
  });
}

/**
 * Valide une sauvegarde JSON exportée par l'app ou par le site web
 * (clés `portfolio`/`watchlists` côté web). Ne jamais faire confiance à
 * un fichier externe : chaque entrée invalide est écartée et comptée.
 */
export function parseBackupPayload(raw: string): { payload: BackupPayload; skipped: number } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Fichier illisible : ce n'est pas du JSON valide." };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { error: "Format inattendu : la sauvegarde doit être un objet JSON." };
  }
  const source = parsed as Record<string, unknown>;
  const rawWatchlist = Array.isArray(source.watchlist) ? source.watchlist : webWatchlistTickers(source.watchlists);
  const rawTransactions = Array.isArray(source.transactions)
    ? source.transactions
    : Array.isArray(source.portfolio) ? source.portfolio : [];
  const rawAlerts = Array.isArray(source.alerts) ? source.alerts : [];
  const watchlist = [...new Set(rawWatchlist.filter((item): item is string => typeof item === "string" && /^[A-Z0-9]{2,8}$/.test(item)))];
  const transactions = rawTransactions.filter(isTransaction);
  const alerts = rawAlerts.filter(isAlertRule);
  if (!watchlist.length && !transactions.length && !alerts.length) {
    return { error: "Aucune donnée exploitable trouvée dans ce fichier." };
  }
  const skipped = (rawWatchlist.length - watchlist.length)
    + (rawTransactions.length - transactions.length)
    + (rawAlerts.length - alerts.length);
  return { payload: { watchlist, transactions, alerts }, skipped: Math.max(0, skipped) };
}
