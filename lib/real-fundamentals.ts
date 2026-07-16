import fundamentalsJson from "@/data/real/fundamentals.json";

/**
 * Fondamentaux réels extraits des états financiers publiés sur la fiche
 * BRVM de chaque société. Le registre vérifié sert de base et
 * refresh_fundamentals.py intègre automatiquement un nouvel exercice quand
 * les colonnes N/N-1 et l'unité recoupent les chiffres déjà validés.
 *
 * Tous les montants sont en MILLIONS de FCFA. Les champs à null n'ont
 * pas pu être extraits de façon fiable pour cette société — l'UI doit
 * les omettre, jamais les remplacer par une estimation.
 */
export interface RealFundamentals {
  ticker: string;
  fiscalYear: number;
  revenueLabel: "CA" | "PNB";
  revenueM: number;
  revenuePrevM: number | null;
  netIncomeM: number;
  netIncomePrevM: number | null;
  ordinaryIncomeM: number | null;
  ordinaryIncomePrevM: number | null;
  /** Banques uniquement : coefficient d'exploitation, en % */
  cirPct: number | null;
  cirPrevPct: number | null;
  /** Banques uniquement : coût du risque (négatif = reprise nette) */
  costOfRiskM: number | null;
  costOfRiskPrevM: number | null;
  /** Banques uniquement : dépôts et crédits clientèle, millions FCFA */
  depositsM: number | null;
  depositsPrevM: number | null;
  loansM: number | null;
  loansPrevM: number | null;
  /** Dividende brut par action proposé à l'AG, en FCFA */
  proposedGrossDividend: number | null;
  /** Nombre d'actions — présent seulement si deux sources indépendantes
   * convergent (PER BOC × RN / cours vs capital ÷ nominal). */
  sharesOutstanding: number | null;
  /** Capitaux propres au bilan, millions de FCFA */
  equityM: number | null;
  equityPrevM: number | null;
  /** URL du PDF source sur brvm.org */
  source: string;
  publishedOn: string;
}

const FUNDAMENTALS = fundamentalsJson as Record<string, RealFundamentals>;

export function getRealFundamentals(
  ticker: string
): RealFundamentals | undefined {
  return FUNDAMENTALS[ticker];
}

export function getAllRealFundamentals(): RealFundamentals[] {
  return Object.values(FUNDAMENTALS);
}

/** Croissance en %, ou null si la base est absente ou nulle. */
export function growthPct(
  current: number,
  previous: number | null
): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
