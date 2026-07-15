import type { DividendInfo } from "@wariba/core/types";
import { STOCKS } from "./stocks";

/** IRVM UEMOA : retenue de 10 % sur les dividendes. */
export const IRVM_RATE = 0.1;

const EX_DATES: Record<string, { exDate: string; payDate: string } | null> = {
  SNTS: { exDate: "2026-05-12", payDate: "2026-05-28" },
  ORAC: { exDate: "2026-07-21", payDate: "2026-08-05" },
  NSBC: { exDate: "2026-07-16", payDate: "2026-07-31" },
  SGBC: { exDate: "2026-07-30", payDate: "2026-08-14" },
  SIBC: { exDate: "2026-07-24", payDate: "2026-08-07" },
  BICC: { exDate: "2026-06-18", payDate: "2026-07-02" },
  CBIBF: { exDate: "2026-08-06", payDate: "2026-08-21" },
  BOAB: { exDate: "2026-06-25", payDate: "2026-07-09" },
  ETIT: { exDate: "2026-08-20", payDate: "2026-09-04" },
  ONTBF: { exDate: "2026-06-11", payDate: "2026-06-26" },
  PALC: { exDate: "2026-07-28", payDate: "2026-08-12" },
  SPHC: null,
  UNXC: { exDate: "2026-09-10", payDate: "2026-09-25" },
  CIEC: { exDate: "2026-08-13", payDate: "2026-08-28" },
  TTLC: { exDate: "2026-08-12", payDate: "2026-08-27" },
};

/** Croissance annuelle approximative du dividende par ticker (pour l'historique 5 ans). */
const GROWTH: Record<string, number> = {
  SNTS: 0.06,
  ORAC: 0.09,
  NSBC: 0.18,
  SGBC: 0.07,
  SIBC: 0.08,
  BICC: 0.03,
  CBIBF: 0.14,
  BOAB: 0.01,
  ETIT: 0.25,
  ONTBF: -0.04,
  PALC: 0.2,
  SPHC: 0,
  UNXC: -0.15,
  CIEC: 0.05,
  TTLC: 0.06,
};

function buildHistory(ticker: string, current: number): { year: number; gross: number }[] {
  const g = GROWTH[ticker] ?? 0.05;
  const out: { year: number; gross: number }[] = [];
  let v = current;
  for (let y = 2026; y >= 2022; y--) {
    out.unshift({ year: y, gross: Math.round(v * 100) / 100 });
    v = v / (1 + g);
  }
  return out;
}

export const DIVIDENDS: DividendInfo[] = STOCKS.map((s) => ({
  ticker: s.ticker,
  gross: s.fundamentals.grossDividend,
  net: Math.round(s.fundamentals.grossDividend * (1 - IRVM_RATE) * 100) / 100,
  exDate: EX_DATES[s.ticker]?.exDate ?? null,
  payDate: EX_DATES[s.ticker]?.payDate ?? null,
  history:
    s.fundamentals.grossDividend > 0
      ? buildHistory(s.ticker, s.fundamentals.grossDividend)
      : [],
}));

export const DIVIDEND_MAP: Map<string, DividendInfo> = new Map(
  DIVIDENDS.map((d) => [d.ticker, d])
);

export function upcomingDividends(after: string): DividendInfo[] {
  return DIVIDENDS.filter((d) => d.exDate !== null && d.exDate > after).sort(
    (a, b) => (a.exDate ?? "").localeCompare(b.exDate ?? "")
  );
}
