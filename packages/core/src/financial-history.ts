import type { FinancialEvidenceStatus } from "./financial-language";
import type { RealFundamentalInput } from "./real-analysis";

export type FinancialHistoryFormat = "amount" | "percent" | "per-share";

export interface FinancialHistoryCell {
  value: number | null;
  status: FinancialEvidenceStatus;
}

export interface FinancialHistoryRow {
  id: string;
  label: string;
  format: FinancialHistoryFormat;
  cells: Record<number, FinancialHistoryCell>;
}

export interface FinancialHistory {
  years: number[];
  rows: FinancialHistoryRow[];
  coverageYears: number;
  totalYears: number;
}

function cell(value: number | null, status: FinancialEvidenceStatus): FinancialHistoryCell {
  return {
    value: Number.isFinite(value) ? value : null,
    status: Number.isFinite(value) ? status : "unavailable",
  };
}

function values(
  years: readonly number[],
  fiscalYear: number,
  current: number | null,
  previous: number | null,
  status: FinancialEvidenceStatus = "verified"
): Record<number, FinancialHistoryCell> {
  return Object.fromEntries(
    years.map((year) => [
      year,
      year === fiscalYear
        ? cell(current, status)
        : year === fiscalYear - 1
          ? cell(previous, status)
          : cell(null, "unavailable"),
    ])
  );
}

function calculated(
  years: readonly number[],
  fiscalYear: number,
  current: number | null,
  previous: number | null
): Record<number, FinancialHistoryCell> {
  return values(years, fiscalYear, current, previous, "calculated");
}

export function buildFinancialHistory(
  fundamental: RealFundamentalInput,
  windowYears = 5
): FinancialHistory {
  const totalYears = Math.max(2, Math.round(windowYears));
  const years = Array.from(
    { length: totalYears },
    (_, index) => fundamental.fiscalYear - totalYears + 1 + index
  );
  const shares = fundamental.sharesOutstanding;
  const currentMargin =
    fundamental.revenueM !== 0
      ? (fundamental.netIncomeM / fundamental.revenueM) * 100
      : null;
  const previousMargin =
    fundamental.revenuePrevM && fundamental.netIncomePrevM !== null
      ? (fundamental.netIncomePrevM / fundamental.revenuePrevM) * 100
      : null;
  const currentEps = shares ? (fundamental.netIncomeM * 1e6) / shares : null;
  const previousEps =
    shares && fundamental.netIncomePrevM !== null
      ? (fundamental.netIncomePrevM * 1e6) / shares
      : null;

  const rows: FinancialHistoryRow[] = [
    {
      id: "revenue",
      label: fundamental.revenueLabel,
      format: "amount",
      cells: values(
        years,
        fundamental.fiscalYear,
        fundamental.revenueM,
        fundamental.revenuePrevM
      ),
    },
    {
      id: "ordinary-income",
      label: "Résultat ordinaire",
      format: "amount",
      cells: values(
        years,
        fundamental.fiscalYear,
        fundamental.ordinaryIncomeM,
        fundamental.ordinaryIncomePrevM
      ),
    },
    {
      id: "net-income",
      label: "Résultat net",
      format: "amount",
      cells: values(
        years,
        fundamental.fiscalYear,
        fundamental.netIncomeM,
        fundamental.netIncomePrevM
      ),
    },
    {
      id: "net-margin",
      label: "Marge nette",
      format: "percent",
      cells: calculated(years, fundamental.fiscalYear, currentMargin, previousMargin),
    },
    {
      id: "equity",
      label: "Capitaux propres",
      format: "amount",
      cells: values(
        years,
        fundamental.fiscalYear,
        fundamental.equityM,
        fundamental.equityPrevM
      ),
    },
    {
      id: "eps",
      label: "BPA",
      format: "per-share",
      cells: calculated(years, fundamental.fiscalYear, currentEps, previousEps),
    },
  ];

  if (fundamental.cirPct !== null || fundamental.cirPrevPct !== null) {
    rows.push(
      {
        id: "cir",
        label: "Coefficient d'exploitation",
        format: "percent",
        cells: values(
          years,
          fundamental.fiscalYear,
          fundamental.cirPct,
          fundamental.cirPrevPct
        ),
      },
      {
        id: "deposits",
        label: "Dépôts clientèle",
        format: "amount",
        cells: values(
          years,
          fundamental.fiscalYear,
          fundamental.depositsM,
          fundamental.depositsPrevM
        ),
      },
      {
        id: "loans",
        label: "Crédits clientèle",
        format: "amount",
        cells: values(
          years,
          fundamental.fiscalYear,
          fundamental.loansM,
          fundamental.loansPrevM
        ),
      },
      {
        id: "cost-of-risk",
        label: "Coût du risque",
        format: "amount",
        cells: values(
          years,
          fundamental.fiscalYear,
          fundamental.costOfRiskM,
          fundamental.costOfRiskPrevM
        ),
      }
    );
  } else {
    rows.push(
      {
        id: "debt",
        label: "Dette financière",
        format: "amount",
        cells: values(years, fundamental.fiscalYear, null, null),
      },
      {
        id: "cash",
        label: "Trésorerie",
        format: "amount",
        cells: values(years, fundamental.fiscalYear, null, null),
      }
    );
  }

  const coverageYears = years.filter((year) => {
    const revenue = rows[0]?.cells[year]?.value;
    const netIncome = rows[2]?.cells[year]?.value;
    return revenue !== null && netIncome !== null;
  }).length;

  return { years, rows, coverageYears, totalYears };
}
