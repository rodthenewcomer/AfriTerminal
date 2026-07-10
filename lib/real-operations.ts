import operationsJson from "@/data/real/operations.json";

/**
 * Opérations sur titres réelles (pipeline scripts/boc/fetch_operations.py) :
 * avis officiels du marché + événements sur valeurs (augmentations de
 * capital, fractionnements...) référencés depuis brvm.org — liens vers
 * les PDF sources, aucune copie.
 */
export interface MarketNotice {
  title: string;
  date: string;
  pdf: string;
}

export interface CapitalOperation {
  kind: string;
  issuer: string;
  date: string | null;
  parity: string | null;
  avisPdf: string | null;
  communiquePdf: string | null;
}

const DATA = operationsJson as {
  avis: MarketNotice[];
  operations: CapitalOperation[];
};

export const MARKET_NOTICES: MarketNotice[] = DATA.avis;
export const CAPITAL_OPERATIONS: CapitalOperation[] = DATA.operations;

export function latestNotices(n: number): MarketNotice[] {
  return MARKET_NOTICES.slice(0, n);
}
