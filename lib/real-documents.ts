import documentsJson from "@/data/real/documents.json";

/**
 * Publications officielles réelles, référencées depuis les fiches
 * sociétés de brvm.org (pipeline scripts/boc/fetch_documents.py,
 * contrôlé toutes les 5 minutes par CI sur les 48 fiches actions). Chaque entrée pointe vers le PDF
 * original — WARIBA référence, il ne republie pas.
 */
export interface RealDocument {
  ticker: string;
  title: string;
  type: "États financiers" | "Résultats" | "Dividende" | "AGO" | "Communiqué";
  date: string;
  url: string;
}

const ALL = documentsJson as RealDocument[];

export const REAL_DOCUMENTS = ALL;

export function realDocsForTicker(ticker: string, limit = 8): RealDocument[] {
  return ALL.filter((d) => d.ticker === ticker).slice(0, limit);
}
