import dividendsJson from "@/data/real/dividends.json";

/**
 * Historique réel des dividendes nets par ticker (pipeline BOC :
 * chaque changement du champ « dernier dividende » des bulletins est
 * un versement). Montants NETS par action, après IRVM 10 %.
 */
export interface DividendEvent {
  /** Date de paiement publiée au bulletin, AAAA-MM-JJ */
  date: string;
  /** Dividende net par action, FCFA */
  net: number;
}

const DIVIDENDS = dividendsJson as Record<string, DividendEvent[]>;

export function dividendHistoryFor(ticker: string): DividendEvent[] {
  return DIVIDENDS[ticker] ?? [];
}
