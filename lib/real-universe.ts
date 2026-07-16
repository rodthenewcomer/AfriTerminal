import type { Country, RealQuote, Sector, StockSnapshot } from "@wariba/core/types";
import { companyProfile } from "@wariba/core/company-profiles";

/**
 * Nomenclature secteur du bulletin officiel (BOC) → libellés de l'app.
 * CB = consommation de base (Nestlé, Palm CI, Solibra, Unilever…),
 * CD = consommation discrétionnaire (CFAO, Servair, Bernabé…),
 * ENE = énergie — à la BRVM ce sont des distributeurs de carburant
 * (TotalEnergies CI/SN, Vivo Energy), d'où le rattachement à
 * "Distribution", cohérent avec la fiche curée de TTLC.
 */
const SECTOR_BY_CODE: Record<string, Sector> = {
  FIN: "Banque",
  TEL: "Télécom",
  CB: "Agro-industrie",
  CD: "Distribution",
  ENE: "Distribution",
  IND: "Industrie",
  SPU: "Services publics",
};

export function sectorFromCode(code: string | null): Sector {
  return (code !== null && SECTOR_BY_CODE[code]) || "Autre";
}

/**
 * Convention de nommage BRVM : le suffixe du ticker encode le pays de la
 * société (BOAB = BOA Bénin, BOABF = BOA Burkina, SNTS = Sonatel Sénégal,
 * ETIT = Ecobank Togo…). Heuristique vérifiée sur les 15 fiches curées de
 * lib/mock/stocks.ts (15/15) et l'ensemble de l'univers coté 2026.
 */
const COUNTRY_BY_SUFFIX: Record<string, Country> = {
  B: "Bénin",
  C: "Côte d'Ivoire",
  M: "Mali",
  N: "Niger",
  S: "Sénégal",
  T: "Togo",
};

export function countryFromTicker(ticker: string): Country {
  if (ticker.endsWith("BF")) return "Burkina Faso";
  return COUNTRY_BY_SUFFIX[ticker.slice(-1)] ?? "Côte d'Ivoire";
}

/**
 * StockSnapshot construit uniquement depuis la cotation réelle, pour les
 * tickers de l'univers BRVM sans fiche curée dans lib/mock/stocks.ts.
 *
 * Les champs pédagogiques sont initialisés à une valeur neutre pour satisfaire
 * la forme de StockSnapshot. getSnapshots() les remplace immédiatement par les
 * scores, signaux et lecture issus du registre réel partagé.
 */
export function realOnlySnapshot(q: RealQuote): StockSnapshot {
  const sector = sectorFromCode(q.sectorCode);
  const country = countryFromTicker(q.ticker);
  const sectorPart = sector === "Autre" ? "" : ` (secteur ${sector.toLowerCase()})`;
  return {
    ticker: q.ticker,
    name: q.name,
    market: "BRVM",
    sector,
    country,
    currency: "FCFA",
    sharesM: 0,
    lastPrice: q.lastClose,
    avgVolume30d: q.avgVolume30d,
    // Fiche curée si disponible ; sinon phrase générique SANS affirmer
    // que les états financiers manquent (faux pour les sociétés dont les
    // fondamentaux sont intégrés — la provenance est déjà affichée ailleurs).
    description:
      companyProfile(q.ticker) ??
      `${q.name} est cotée à la BRVM${sectorPart} — ${country}.`,
    profile: { drift: 0, vol: 0 },
    fundamentals: {
      revenue: 0,
      revenuePrev: 0,
      revenueLabel: "CA",
      netIncome: 0,
      netIncomePrev: 0,
      ordinaryIncome: 0,
      pb: 0,
      roe: 0,
      roa: 0,
      grossDividend: 0,
      payout: 0,
    },
    marketCap: 0,
    // -1 = « non disponible » (les composants affichent "—" quand per <= 0)
    // plutôt qu'un repli sur une valeur inventée.
    per: q.per ?? -1,
    dayChange: q.dayChangePct,
    weekChange: q.weekChangePct,
    monthChange: q.monthChangePct,
    ytdChange: q.ytdChangePct,
    yearChange: q.yearChangePct,
    dayVolume: q.dayVolume,
    volumeRatio: q.volumeRatio,
    yieldGross: 0,
    yieldNet: q.netYieldPct ?? 0,
    netDividend: q.lastDividendNet ?? 0,
    netIncomeGrowth: 0,
    revenueGrowth: 0,
    scores: { quality: 0, valuation: 0, momentum: 0, risk: 0 },
    signals: [],
    insight: {
      headline: "",
      summary: "",
      positives: [],
      risks: [],
      watchNext: [],
    },
    real: q,
  };
}
