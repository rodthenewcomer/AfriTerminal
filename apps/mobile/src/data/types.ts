import type { AlertItem, OHLCV, RealQuote } from "@wariba/core/types";

export type QuoteMap = Record<string, RealQuote>;

export interface FundamentalRecord {
  ticker: string;
  fiscalYear: number;
  revenueLabel: "CA" | "PNB";
  revenueM: number;
  revenuePrevM: number | null;
  netIncomeM: number;
  netIncomePrevM: number | null;
  ordinaryIncomeM: number | null;
  cirPct: number | null;
  cirPrevPct: number | null;
  depositsM: number | null;
  loansM: number | null;
  costOfRiskM: number | null;
  costOfRiskPrevM: number | null;
  sharesOutstanding: number | null;
  equityM: number | null;
  equityPrevM: number | null;
  depositsPrevM: number | null;
  loansPrevM: number | null;
  ordinaryIncomePrevM: number | null;
  proposedGrossDividend: number | null;
  source: string;
  publishedOn: string;
}

export interface IndexRecord {
  code: string;
  name: string;
  asOfDate: string;
  level: number;
  dayChangePct: number;
  ytdChangePct: number;
  spark: number[];
}

export interface DocumentRecord {
  ticker: string;
  title: string;
  type: string;
  date: string;
  url: string;
}

export interface NewsRecord {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  tickers: string[];
}

export interface OperationNotice {
  title: string;
  date: string;
  pdf: string;
}

export interface CapitalOperation {
  kind: string;
  issuer: string;
  ticker: string | null;
  date: string | null;
  parity: string | null;
  avisPdf: string | null;
  communiquePdf: string | null;
}

export interface OperationsPayload {
  avis: OperationNotice[];
  operations: CapitalOperation[];
}

export type DividendMap = Record<string, { date: string; net: number }[]>;

export interface MarketPayload {
  quotes: QuoteMap;
  fundamentals: Record<string, FundamentalRecord>;
  indices: IndexRecord[];
  alerts: AlertItem[];
  dividends: DividendMap;
  documents: DocumentRecord[];
  operations: OperationsPayload;
  news: NewsRecord[];
}

export type SeriesPayload = OHLCV[];
