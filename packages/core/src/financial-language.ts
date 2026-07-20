export type FinancialPeriodType = "annual" | "semiannual" | "ttm" | "brvm-indicator";
export type FinancialConfidence = "high" | "medium" | "limited";

export interface MetricDisclosure {
  period: string;
  periodType: FinancialPeriodType;
  accountsDate: string;
  publishedOn?: string;
  sourceLabel: string;
  sourceUrl?: string;
  confidence: FinancialConfidence;
  basisNote?: string;
}

const PERIOD_LABELS: Record<FinancialPeriodType, string> = {
  annual: "Annuel",
  semiannual: "Semestriel",
  ttm: "12 mois glissants",
  "brvm-indicator": "Indicateur BRVM",
};

const CONFIDENCE_LABELS: Record<FinancialConfidence, string> = {
  high: "élevée",
  medium: "moyenne",
  limited: "limitée",
};

function dateFr(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function annualMetricDisclosure(args: {
  fiscalYear: number;
  publishedOn: string;
  sourceLabel?: string;
  sourceUrl?: string;
  confidence?: FinancialConfidence;
  basisNote?: string;
}): MetricDisclosure {
  return {
    period: `${args.fiscalYear}`,
    periodType: "annual",
    accountsDate: `${args.fiscalYear}-12-31`,
    publishedOn: args.publishedOn,
    sourceLabel: args.sourceLabel ?? "États financiers officiels BRVM",
    sourceUrl: args.sourceUrl,
    confidence: args.confidence ?? "high",
    basisNote: args.basisNote,
  };
}

export function brvmMetricDisclosure(args: {
  asOfDate: string;
  sourceLabel?: string;
  sourceUrl?: string;
  confidence?: FinancialConfidence;
  basisNote?: string;
}): MetricDisclosure {
  return {
    period: `Clôture du ${dateFr(args.asOfDate)}`,
    periodType: "brvm-indicator",
    accountsDate: args.asOfDate,
    sourceLabel: args.sourceLabel ?? "Bulletin officiel de la BRVM",
    sourceUrl: args.sourceUrl,
    confidence: args.confidence ?? "high",
    basisNote: args.basisNote,
  };
}

export function metricDisclosureLabel(disclosure: MetricDisclosure): string {
  return [
    PERIOD_LABELS[disclosure.periodType],
    disclosure.period,
    `données au ${dateFr(disclosure.accountsDate)}`,
    disclosure.publishedOn ? `publié le ${dateFr(disclosure.publishedOn)}` : null,
    `source : ${disclosure.sourceLabel}`,
    `confiance ${CONFIDENCE_LABELS[disclosure.confidence]}`,
  ].filter(Boolean).join(" · ");
}

export interface EarningsQualityExplanation {
  classification: "recurring" | "exceptional-non-recurring" | "loss" | "unknown";
  label: string;
  detail: string;
}

export function explainEarningsQuality(args: {
  netIncome: number | null;
  ordinaryIncome: number | null;
  exceptionalEvent?: "asset-sale" | "property-sale" | null;
}): EarningsQualityExplanation {
  if (args.netIncome === null || args.ordinaryIncome === null) {
    return {
      classification: "unknown",
      label: "Récurrence non déterminée",
      detail: "Les données publiées ne permettent pas de séparer le résultat courant des éléments exceptionnels.",
    };
  }
  if (args.netIncome < 0) {
    return {
      classification: "loss",
      label: "Résultat déficitaire",
      detail: "Le résultat net reste négatif : aucune création de bénéfice récurrent n'est affirmée.",
    };
  }
  if (args.exceptionalEvent || args.ordinaryIncome < 0) {
    const event = args.exceptionalEvent
      ? "La cession d'un actif ou d'un immeuble"
      : "L'écart entre le résultat net et le résultat ordinaire";
    return {
      classification: "exceptional-non-recurring",
      label: "Élément exceptionnel non récurrent",
      detail: `${event} explique tout ou partie du bénéfice ; ce montant ne doit pas être projeté comme un bénéfice habituel.`,
    };
  }
  return {
    classification: "recurring",
    label: "Résultat ordinaire positif",
    detail: "Le résultat ordinaire est positif ; la récurrence doit encore être confirmée sur plusieurs exercices.",
  };
}

export function explainOperatingCashFlow(operatingCashFlow: number | null): {
  classification: "positive" | "negative" | "unknown";
  label: string;
  detail: string;
} {
  if (operatingCashFlow === null) {
    return {
      classification: "unknown",
      label: "Flux opérationnel non vérifié",
      detail: "WARIBA ne classe pas l'entreprise comme génératrice de trésorerie sans flux opérationnel publié et vérifié.",
    };
  }
  if (operatingCashFlow < 0) {
    return {
      classification: "negative",
      label: "Flux opérationnel négatif",
      detail: "L'entreprise n'est pas classée comme génératrice de trésorerie sur cette période.",
    };
  }
  return {
    classification: "positive",
    label: "Flux opérationnel positif",
    detail: "Le flux opérationnel est positif sur cette période ; sa récurrence reste à confirmer.",
  };
}

export function explainOfficialPer(args: {
  officialPer: number | null;
  fiscalYear?: number;
  latestAnnualNetIncome?: number | null;
  impliedAnnualPer?: number | null;
}): string {
  if (args.officialPer === null || args.officialPer <= 0) {
    return "PER officiel BRVM indisponible ou non significatif à cette date.";
  }
  if (args.latestAnnualNetIncome !== undefined && args.latestAnnualNetIncome !== null && args.latestAnnualNetIncome <= 0) {
    return `Le PER officiel BRVM repose sur une autre base bénéficiaire que le dernier résultat annuel ${args.fiscalYear ?? ""} affiché, qui est négatif. Il n'est donc pas utilisé comme ratio interprétable.`.replace("annuel  affiché", "annuel affiché");
  }
  if (
    args.impliedAnnualPer !== undefined &&
    args.impliedAnnualPer !== null &&
    args.impliedAnnualPer > 0 &&
    Math.abs(args.officialPer - args.impliedAnnualPer) / args.impliedAnnualPer > 0.2
  ) {
    return `Le PER officiel BRVM (${args.officialPer.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×) repose sur une base différente du dernier résultat annuel affiché (${args.impliedAnnualPer.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}× recalculé).`;
  }
  return "PER officiel BRVM à la date de clôture indiquée ; sa période bénéficiaire peut différer du dernier exercice annuel affiché.";
}
