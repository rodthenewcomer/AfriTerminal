import type { AIInsight, RealQuote, Scores, Signal } from "./types";
import { explainEarningsQuality } from "./financial-language";

export const REAL_ANALYSIS_VERSION = "WARIBA Factuel v1.1";

export interface NetIncomeTrend {
  id:
    | "profit-turnaround"
    | "profit-loss"
    | "profit-growth"
    | "profit-decline"
    | "loss-reduction"
    | "loss-widening"
    | "profit-stable";
  label: string;
  detail: string;
  changePct: number | null;
  tone: Signal["tone"];
}

/**
 * Sous-ensemble commun des états financiers réels utilisé par le web et le
 * mobile. Tous les montants sont en millions de FCFA.
 */
export interface RealFundamentalInput {
  ticker: string;
  fiscalYear: number;
  revenueLabel: "CA" | "PNB";
  revenueM: number;
  revenuePrevM: number | null;
  netIncomeM: number;
  netIncomePrevM: number | null;
  ordinaryIncomeM: number | null;
  ordinaryIncomePrevM: number | null;
  cirPct: number | null;
  cirPrevPct: number | null;
  depositsM: number | null;
  depositsPrevM: number | null;
  loansM: number | null;
  loansPrevM: number | null;
  costOfRiskM: number | null;
  costOfRiskPrevM: number | null;
  proposedGrossDividend: number | null;
  sharesOutstanding: number | null;
  equityM: number | null;
  equityPrevM: number | null;
  source: string;
  publishedOn: string;
}

export type RealAnalysisConfidenceLevel = "high" | "medium" | "low";

export type RealComparisonMetric =
  | "per"
  | "pb"
  | "roe"
  | "yield"
  | "revenueGrowth"
  | "netIncomeGrowth"
  | "netMargin"
  | "cir";

export interface RealSectorComparison {
  metric: RealComparisonMetric;
  label: string;
  value: number;
  median: number;
  /** 0 = bas de l'échantillon, 100 = haut. Le sens économique est séparé. */
  percentile: number;
  higherIsBetter: boolean;
  sampleSize: number;
}

export interface RealEquityAnalysis {
  ticker: string;
  methodologyVersion: typeof REAL_ANALYSIS_VERSION;
  asOfDate: string;
  fiscalYear: number;
  publishedOn: string;
  overallScore: number;
  scores: Scores & {
    dividend: number;
    liquidity: number;
  };
  signals: Signal[];
  insight: AIInsight;
  confidence: {
    level: RealAnalysisConfidenceLevel;
    label: string;
    coveragePct: number;
    reasons: string[];
  };
  benchmark: {
    scope: "sector" | "market";
    sectorKey: string;
    companyCount: number;
    /** Nombre d'autres sociétés dans l'échantillon. */
    peerCount: number;
  };
  comparisons: RealSectorComparison[];
}

interface NormalizedCompany {
  quote: RealQuote;
  fundamental: RealFundamentalInput;
  sectorKey: string;
  per: number | null;
  pb: number | null;
  roe: number | null;
  yield: number | null;
  dividendRecency: number;
  revenueGrowth: number | null;
  netIncomeGrowth: number | null;
  netMargin: number | null;
  ordinaryMargin: number | null;
  equityGrowth: number | null;
  cir: number | null;
  cirImprovement: number | null;
  liquidity: number;
  rangeWidth: number;
  earningsStress: number | null;
  balanceStress: number;
}

interface WeightedComponent {
  score: number | null;
  weight: number;
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Variation signée robuste aux bases négatives; null si la base vaut zéro. */
export function signedGrowthPct(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** CD et ENE appartiennent tous deux au secteur Distribution dans WARIBA. */
export function analysisSectorKey(code: string | null): string {
  if (code === "CD" || code === "ENE") return "DISTRIBUTION";
  return code ?? "OTHER";
}

function values<T>(input: Readonly<Record<string, T>> | readonly T[]): T[] {
  return Array.isArray(input) ? [...input] : Object.values(input);
}

function median(input: readonly number[]): number {
  const sorted = [...input].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Rang centile avec rang moyen pour les ex-aequo. */
export function percentileRank(value: number, input: readonly number[]): number {
  const cohort = input.filter(Number.isFinite);
  if (cohort.length <= 1) return 50;
  const lower = cohort.filter((item) => item < value).length;
  const equal = cohort.filter((item) => item === value).length;
  const midRank = lower + Math.max(0, equal - 1) / 2;
  return Math.round((midRank / (cohort.length - 1)) * 100);
}

function percentileScore(
  value: number | null,
  cohort: readonly number[],
  higherIsBetter = true
): number | null {
  if (value === null || cohort.length === 0) return null;
  const rank = percentileRank(value, cohort);
  return higherIsBetter ? rank : 100 - rank;
}

function weightedAverage(components: readonly WeightedComponent[]): {
  score: number;
  coverage: number;
} {
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const available = components.filter((component) => component.score !== null);
  const availableWeight = available.reduce((sum, component) => sum + component.weight, 0);
  if (availableWeight === 0 || totalWeight === 0) return { score: 50, coverage: 0 };
  const score = available.reduce(
    (sum, component) => sum + (component.score ?? 0) * component.weight,
    0
  ) / availableWeight;
  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    coverage: availableWeight / totalWeight,
  };
}

function normalize(
  quote: RealQuote,
  fundamental: RealFundamentalInput
): NormalizedCompany {
  const equityPerShare =
    fundamental.sharesOutstanding && fundamental.equityM && fundamental.equityM > 0
      ? (fundamental.equityM * 1e6) / fundamental.sharesOutstanding
      : null;
  // Une perte réduite reste une perte : elle est décrite séparément, mais ne
  // doit ni améliorer le score qualité ni être classée comme croissance du
  // bénéfice dans les comparaisons sectorielles.
  const netIncomeGrowth =
    fundamental.netIncomeM > 0 &&
    fundamental.netIncomePrevM !== null &&
    fundamental.netIncomePrevM > 0
      ? signedGrowthPct(fundamental.netIncomeM, fundamental.netIncomePrevM)
      : null;
  let balanceStress = 0;
  if (fundamental.netIncomeM < 0) balanceStress += 40;
  if (fundamental.ordinaryIncomeM !== null && fundamental.ordinaryIncomeM < 0) balanceStress += 25;
  if (fundamental.equityM !== null && fundamental.equityM <= 0) balanceStress += 35;

  return {
    quote,
    fundamental,
    sectorKey: analysisSectorKey(quote.sectorCode),
    // Un PER positif n'est pas économiquement interprétable si les derniers
    // comptes intégrés affichent une perte.
    per:
      fundamental.netIncomeM > 0 && quote.per !== null && quote.per > 0
        ? quote.per
        : null,
    pb: equityPerShare && equityPerShare > 0 ? quote.lastClose / equityPerShare : null,
    roe:
      fundamental.equityM !== null && fundamental.equityM > 0
        ? (fundamental.netIncomeM / fundamental.equityM) * 100
        : null,
    yield: finite(quote.netYieldPct),
    dividendRecency: (() => {
      if (!quote.lastDividendDate) return 0;
      const paidAt = Date.parse(`${quote.lastDividendDate}T00:00:00Z`);
      const observedAt = Date.parse(`${quote.asOfDate}T00:00:00Z`);
      if (!Number.isFinite(paidAt) || !Number.isFinite(observedAt) || paidAt > observedAt) return 0;
      const ageDays = (observedAt - paidAt) / 86_400_000;
      if (ageDays <= 550) return 100;
      if (ageDays <= 1_095) return 60;
      if (ageDays <= 1_825) return 30;
      return 10;
    })(),
    revenueGrowth: signedGrowthPct(fundamental.revenueM, fundamental.revenuePrevM),
    netIncomeGrowth,
    netMargin:
      fundamental.revenueM !== 0
        ? (fundamental.netIncomeM / Math.abs(fundamental.revenueM)) * 100
        : null,
    ordinaryMargin:
      fundamental.ordinaryIncomeM !== null && fundamental.revenueM !== 0
        ? (fundamental.ordinaryIncomeM / Math.abs(fundamental.revenueM)) * 100
        : null,
    equityGrowth: signedGrowthPct(fundamental.equityM, fundamental.equityPrevM),
    cir: finite(fundamental.cirPct),
    cirImprovement:
      fundamental.cirPct !== null && fundamental.cirPrevPct !== null
        ? fundamental.cirPrevPct - fundamental.cirPct
        : null,
    liquidity: Math.max(0, quote.avgVolume30d * quote.lastClose),
    rangeWidth:
      quote.week52High > 0
        ? ((quote.week52High - quote.week52Low) / quote.week52High) * 100
        : 0,
    earningsStress:
      fundamental.netIncomeM < 0
        ? 100
        : netIncomeGrowth === null
          ? null
          : -netIncomeGrowth,
    balanceStress: Math.min(100, balanceStress),
  };
}

function cohortValues(
  cohort: readonly NormalizedCompany[],
  key: keyof NormalizedCompany
): number[] {
  return cohort
    .map((company) => finite(company[key] as number | null))
    .filter((value): value is number => value !== null);
}

function pctFr(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}

function amountM(value: number): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M FCFA`;
}

function pctAbsFr(value: number): string {
  return `${Math.abs(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

/**
 * Décrit le résultat net sans transformer une perte moins forte en bénéfice.
 * Cette règle est partagée par les signaux, le web et les apps natives.
 */
export function describeNetIncomeTrend(
  current: number,
  previous: number | null
): NetIncomeTrend | null {
  if (previous === null) return null;
  const changePct = signedGrowthPct(current, previous);

  if (previous < 0 && current >= 0) {
    return {
      id: "profit-turnaround",
      label: "Retour aux bénéfices",
      detail: `Le résultat net passe de ${amountM(previous)} à ${amountM(current)}.`,
      changePct,
      tone: "positive",
    };
  }
  if (previous >= 0 && current < 0) {
    return {
      id: "profit-loss",
      label: "Passage en perte",
      detail: `Le résultat net passe de ${amountM(previous)} à une perte de ${amountM(current)}.`,
      changePct,
      tone: "negative",
    };
  }
  if (previous < 0 && current < 0) {
    const reductionPct = changePct ?? 0;
    if (current > previous) {
      return {
        id: "loss-reduction",
        label: "Perte réduite",
        detail: `La perte nette est ramenée de ${amountM(previous)} à ${amountM(current)}, soit une réduction de ${pctAbsFr(reductionPct)}.`,
        changePct,
        tone: "warning",
      };
    }
    if (current < previous) {
      return {
        id: "loss-widening",
        label: "Perte aggravée",
        detail: `La perte nette se creuse de ${amountM(previous)} à ${amountM(current)}, soit une dégradation de ${pctAbsFr(reductionPct)}.`,
        changePct,
        tone: "negative",
      };
    }
    return {
      id: "profit-stable",
      label: "Perte stable",
      detail: `La perte nette reste à ${amountM(current)}.`,
      changePct,
      tone: "warning",
    };
  }
  if (changePct !== null && changePct >= 8) {
    return {
      id: "profit-growth",
      label: "Bénéfice en hausse",
      detail: `Le bénéfice net progresse de ${pctFr(changePct)} sur un an.`,
      changePct,
      tone: "positive",
    };
  }
  if (changePct !== null && changePct <= -8) {
    return {
      id: "profit-decline",
      label: "Bénéfice en baisse",
      detail: `Le bénéfice net recule de ${pctFr(changePct)} sur un an.`,
      changePct,
      tone: "warning",
    };
  }
  return {
    id: "profit-stable",
    label: "Bénéfice stable",
    detail: changePct === null
      ? `Le bénéfice net s'établit à ${amountM(current)} ; la variation n'est pas calculable.`
      : `Le bénéfice net varie de ${pctFr(changePct)} sur un an.`,
    changePct,
    tone: "neutral",
  };
}

function addSignal(
  signals: Signal[],
  id: string,
  label: string,
  tone: Signal["tone"],
  detail: string
): void {
  if (!signals.some((signal) => signal.id === id)) {
    signals.push({ id, label, tone, detail });
  }
}

function comparison(
  company: NormalizedCompany,
  cohort: readonly NormalizedCompany[],
  metric: RealComparisonMetric,
  label: string,
  key: keyof NormalizedCompany,
  higherIsBetter: boolean
): RealSectorComparison | null {
  const value = finite(company[key] as number | null);
  const sample = cohortValues(cohort, key);
  if (value === null || sample.length < 2) return null;
  return {
    metric,
    label,
    value,
    median: median(sample),
    percentile: percentileRank(value, sample),
    higherIsBetter,
    sampleSize: sample.length,
  };
}

function confidenceLabel(level: RealAnalysisConfidenceLevel): string {
  if (level === "high") return "Élevée";
  if (level === "medium") return "Moyenne";
  return "Limitée";
}

function scoreBand(score: number): string {
  if (score >= 70) return "positionnement relatif élevé";
  if (score >= 55) return "positionnement relatif supérieur";
  if (score >= 45) return "positionnement relatif intermédiaire";
  if (score >= 30) return "positionnement relatif inférieur";
  return "positionnement relatif faible";
}

function dateLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

export function analyzeRealEquity(args: {
  ticker: string;
  quotes: Readonly<Record<string, RealQuote>> | readonly RealQuote[];
  fundamentals:
    | Readonly<Record<string, RealFundamentalInput>>
    | readonly RealFundamentalInput[];
}): RealEquityAnalysis | null {
  const ticker = args.ticker.toUpperCase();
  const quoteList = values(args.quotes);
  const fundamentalList = values(args.fundamentals);
  const quote = quoteList.find((item) => item.ticker === ticker);
  const fundamental = fundamentalList.find((item) => item.ticker === ticker);
  if (!quote || !fundamental) return null;

  const fundamentalsByTicker = new Map(
    fundamentalList.map((item) => [item.ticker, item] as const)
  );
  const universe = quoteList.flatMap((item) => {
    const companyFundamental = fundamentalsByTicker.get(item.ticker);
    return companyFundamental ? [normalize(item, companyFundamental)] : [];
  });
  const company = normalize(quote, fundamental);
  const sector = universe.filter((item) => item.sectorKey === company.sectorKey);
  // Un seul titre ne constitue pas un benchmark. Dans ce cas uniquement,
  // le marché entier devient le référentiel et l'interface le dit.
  const benchmarkScope: "sector" | "market" = sector.length >= 2 ? "sector" : "market";
  const cohort = benchmarkScope === "sector" ? sector : universe;

  const scoreFor = (
    key: keyof NormalizedCompany,
    higherIsBetter = true
  ): number | null => {
    const value = finite(company[key] as number | null);
    return percentileScore(value, cohortValues(cohort, key), higherIsBetter);
  };

  const quality = weightedAverage([
    { score: scoreFor("roe"), weight: 25 },
    { score: scoreFor("netMargin"), weight: 20 },
    { score: scoreFor("netIncomeGrowth"), weight: 20 },
    { score: scoreFor("revenueGrowth"), weight: 15 },
    { score: scoreFor("ordinaryMargin"), weight: 10 },
    { score: scoreFor("equityGrowth"), weight: 10 },
    { score: scoreFor("cirImprovement"), weight: 10 },
  ]);
  const valuation = weightedAverage([
    { score: scoreFor("per", false), weight: 50 },
    { score: scoreFor("pb", false), weight: 20 },
    { score: scoreFor("yield"), weight: 30 },
  ]);
  const momentum = weightedAverage([
    {
      score: percentileScore(
        quote.monthChangePct,
        cohort.map((item) => item.quote.monthChangePct)
      ),
      weight: 20,
    },
    {
      score: percentileScore(
        quote.halfYearChangePct,
        cohort.map((item) => item.quote.halfYearChangePct)
      ),
      weight: 35,
    },
    {
      score: percentileScore(
        quote.yearChangePct,
        cohort.map((item) => item.quote.yearChangePct)
      ),
      weight: 30,
    },
    {
      score: percentileScore(
        quote.fiveYearChangePct,
        cohort.map((item) => item.quote.fiveYearChangePct)
      ),
      weight: 15,
    },
  ]);
  const dividend = weightedAverage([
    { score: scoreFor("yield"), weight: 70 },
    { score: company.dividendRecency, weight: 30 },
  ]);
  const liquidity = weightedAverage([
    { score: scoreFor("liquidity"), weight: 100 },
  ]);

  const expectedFiscalYear = Number(quote.asOfDate.slice(0, 4)) - 1;
  const fiscalLag = Math.max(0, expectedFiscalYear - fundamental.fiscalYear);
  const risk = weightedAverage([
    { score: scoreFor("liquidity", false), weight: 35 },
    { score: scoreFor("rangeWidth"), weight: 20 },
    { score: scoreFor("earningsStress"), weight: 20 },
    { score: company.balanceStress, weight: 15 },
    { score: Math.min(100, fiscalLag * 50), weight: 10 },
  ]);

  const scores: Scores & { dividend: number; liquidity: number } = {
    quality: quality.score,
    valuation: valuation.score,
    momentum: momentum.score,
    risk: risk.score,
    dividend: dividend.score,
    liquidity: liquidity.score,
  };
  const overallScore = Math.round(
    scores.quality * 0.35 +
      scores.valuation * 0.2 +
      scores.momentum * 0.25 +
      (100 - scores.risk) * 0.2
  );
  const coveragePct = Math.round(
    (quality.coverage * 0.35 +
      valuation.coverage * 0.2 +
      momentum.coverage * 0.25 +
      risk.coverage * 0.2) *
      100
  );

  const hasPreviousPeriod = [
    fundamental.revenuePrevM,
    fundamental.netIncomePrevM,
    fundamental.equityPrevM,
    fundamental.cirPrevPct,
  ].some((value) => value !== null);
  const financialPeriods = hasPreviousPeriod ? 2 : 1;
  let confidenceLevel: RealAnalysisConfidenceLevel = "medium";
  if (
    coveragePct < 55 ||
    fiscalLag >= 2 ||
    benchmarkScope === "market" ||
    cohort.length < 2 ||
    financialPeriods < 2
  ) {
    confidenceLevel = "low";
  }
  const confidenceReasons = [
    `${financialPeriods} exercice${financialPeriods > 1 ? "s" : ""} financier${financialPeriods > 1 ? "s" : ""} comparable${financialPeriods > 1 ? "s" : ""} (N${financialPeriods > 1 ? " et N-1" : ""}) ; 3 exercices sont requis pour une confiance élevée.`,
    benchmarkScope === "sector"
      ? `${cohort.length} sociétés dans le benchmark sectoriel.`
      : "Secteur sans pair coté comparable : benchmark de marché et confiance limitée.",
    `${coveragePct} % des pondérations du modèle sont alimentées par des métriques disponibles.`,
  ];
  if (fiscalLag > 0) {
    confidenceReasons.push(
      `États financiers en retard de ${fiscalLag} exercice${fiscalLag > 1 ? "s" : ""} sur le dernier exercice attendu.`
    );
  }

  const comparisons = [
    comparison(company, cohort, "per", "PER", "per", false),
    comparison(company, cohort, "pb", "P/B", "pb", false),
    comparison(company, cohort, "roe", "ROE", "roe", true),
    comparison(company, cohort, "yield", "Rendement net", "yield", true),
    comparison(company, cohort, "revenueGrowth", `Croissance ${fundamental.revenueLabel}`, "revenueGrowth", true),
    comparison(company, cohort, "netIncomeGrowth", "Croissance résultat net", "netIncomeGrowth", true),
    comparison(company, cohort, "netMargin", "Marge nette", "netMargin", true),
    comparison(company, cohort, "cir", "Coefficient d'exploitation", "cir", false),
  ].filter((item): item is RealSectorComparison => item !== null);

  const signals: Signal[] = [];
  if (company.revenueGrowth !== null) {
    if (company.revenueGrowth >= 5) {
      addSignal(signals, "revenue-growth", `${fundamental.revenueLabel} en hausse`, "positive", `${fundamental.revenueLabel} ${fundamental.fiscalYear} en progression de ${pctFr(company.revenueGrowth)} sur un an.`);
    } else if (company.revenueGrowth <= -5) {
      addSignal(signals, "revenue-decline", `${fundamental.revenueLabel} en baisse`, "warning", `${fundamental.revenueLabel} ${fundamental.fiscalYear} en recul de ${pctFr(company.revenueGrowth)} sur un an.`);
    }
  }
  const netIncomeTrend = describeNetIncomeTrend(
    fundamental.netIncomeM,
    fundamental.netIncomePrevM
  );
  if (netIncomeTrend && netIncomeTrend.id !== "profit-stable") {
    addSignal(
      signals,
      netIncomeTrend.id,
      netIncomeTrend.label,
      netIncomeTrend.tone,
      netIncomeTrend.detail
    );
  }
  if (fundamental.ordinaryIncomeM !== null && fundamental.ordinaryIncomeM < 0) {
    addSignal(signals, "ordinary-loss", "Activité ordinaire déficitaire", "negative", `Le résultat des activités ordinaires est négatif (${fundamental.ordinaryIncomeM.toLocaleString("fr-FR")} M FCFA).`);
  }
  const earningsQuality = explainEarningsQuality({
    netIncome: fundamental.netIncomeM,
    ordinaryIncome: fundamental.ordinaryIncomeM,
  });
  if (earningsQuality.classification === "exceptional-non-recurring") {
    addSignal(
      signals,
      "exceptional-non-recurring",
      earningsQuality.label,
      "warning",
      earningsQuality.detail
    );
  }
  if (company.cirImprovement !== null) {
    if (company.cirImprovement >= 2) {
      addSignal(signals, "cir-improvement", "Efficacité bancaire en hausse", "positive", `Le coefficient d'exploitation baisse de ${company.cirImprovement.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} points ; une baisse est favorable.`);
    } else if (company.cirImprovement <= -2) {
      addSignal(signals, "cir-decline", "Efficacité bancaire en baisse", "warning", `Le coefficient d'exploitation augmente de ${Math.abs(company.cirImprovement).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} points.`);
    }
  }
  if (quote.volumeRatio >= 3 && quote.quoteStatus !== "delayed-live") {
    addSignal(signals, "unusual-volume", "Volume inhabituel", "warning", `Le volume de la séance représente ${quote.volumeRatio.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}× la moyenne des 30 séances.`);
  }
  const highDistance = quote.week52High > 0
    ? ((quote.lastClose - quote.week52High) / quote.week52High) * 100
    : null;
  if (highDistance !== null && highDistance >= -2) {
    addSignal(signals, "near-high", "Proche du plus haut 52 s", "neutral", `Le cours est à ${pctFr(highDistance)} de son plus haut de clôture sur 52 semaines.`);
  }
  const perComparison = comparisons.find((item) => item.metric === "per");
  if (perComparison && perComparison.percentile <= 25) {
    addSignal(signals, "low-sector-per", "PER sous le secteur", "positive", `PER ${company.per?.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}× contre une médiane de ${perComparison.median.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×.`);
  } else if (perComparison && perComparison.percentile >= 75) {
    addSignal(signals, "high-sector-per", "PER au-dessus du secteur", "warning", `PER ${company.per?.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}× contre une médiane de ${perComparison.median.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×.`);
  }
  const roeComparison = comparisons.find((item) => item.metric === "roe");
  if (roeComparison && roeComparison.percentile >= 75) {
    addSignal(signals, "high-sector-roe", "ROE dans le haut du secteur", "positive", `ROE de ${company.roe?.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % contre une médiane de ${roeComparison.median.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %.`);
  }
  if (fiscalLag > 0) {
    addSignal(signals, "stale-fundamentals", "Comptes à actualiser", "warning", `Le dernier exercice intégré est ${fundamental.fiscalYear}, contre ${expectedFiscalYear} attendu à cette date.`);
  }

  const positives = signals
    .filter((signal) => signal.tone === "positive")
    .slice(0, 3)
    .map((signal) => signal.detail);
  const risks = signals
    .filter((signal) => signal.tone === "warning" || signal.tone === "negative")
    .slice(0, 3)
    .map((signal) => signal.detail);
  if (positives.length === 0) {
    positives.push("Aucun avantage net n'est affirmé : les indicateurs disponibles se situent près du centre de leur échantillon.");
  }
  if (risks.length === 0) {
    risks.push("Aucun signal fondamental critique n'est détecté par les règles publiées ; cela n'exclut pas les risques futurs.");
  }
  const watchNext = [
    `Publication des comptes ${fundamental.fiscalYear + 1} et confirmation de l'évolution du ${fundamental.revenueLabel} et du résultat net.`,
    financialPeriods < 3
      ? "Intégration d'un troisième exercice normalisé pour lever le plafond de confiance."
      : "Maintien de la tendance sur au moins trois exercices normalisés.",
    fundamental.cirPct !== null
      ? "Évolution du coefficient d'exploitation, du coût du risque, des dépôts et des crédits."
      : "Évolution de la marge nette, des capitaux propres et du dividende proposé.",
  ];

  return {
    ticker,
    methodologyVersion: REAL_ANALYSIS_VERSION,
    asOfDate: quote.asOfDate,
    fiscalYear: fundamental.fiscalYear,
    publishedOn: fundamental.publishedOn,
    overallScore,
    scores,
    signals,
    insight: {
      headline: `Score factuel ${overallScore}/100 · confiance ${confidenceLabel(confidenceLevel).toLowerCase()}`,
      summary: `À partir de la clôture du ${dateLabel(quote.asOfDate)}, des comptes ${fundamental.fiscalYear} et d'un benchmark ${benchmarkScope === "sector" ? "sectoriel" : "de marché"}, ${ticker} obtient un ${scoreBand(overallScore)}. Le score décrit les données observées ; il ne constitue ni une prévision ni un signal d'achat ou de vente.`,
      positives,
      risks,
      watchNext,
    },
    confidence: {
      level: confidenceLevel,
      label: confidenceLabel(confidenceLevel),
      coveragePct,
      reasons: confidenceReasons,
    },
    benchmark: {
      scope: benchmarkScope,
      sectorKey: company.sectorKey,
      companyCount: cohort.length,
      peerCount: Math.max(0, cohort.length - 1),
    },
    comparisons,
  };
}
