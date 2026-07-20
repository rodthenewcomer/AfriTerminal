import { z } from "zod";
import { validateMarketSeries } from "@wariba/core/market-series";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const finiteNumber = z.number().finite();
const nullableNumber = finiteNumber.nullable();

const quoteSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,12}$/),
  name: z.string().min(1),
  sectorCode: z.string().nullable(),
  asOfDate: isoDate,
  lastClose: finiteNumber.nonnegative(),
  prevClose: finiteNumber.nonnegative(),
  dayChangePct: finiteNumber,
  weekChangePct: finiteNumber,
  monthChangePct: finiteNumber,
  quarterChangePct: finiteNumber,
  halfYearChangePct: finiteNumber,
  ytdChangePct: finiteNumber,
  yearChangePct: finiteNumber,
  fiveYearChangePct: finiteNumber,
  dayVolume: finiteNumber.nonnegative(),
  avgVolume30d: finiteNumber.nonnegative(),
  volumeRatio: finiteNumber.nonnegative(),
  per: nullableNumber,
  netYieldPct: nullableNumber,
  lastDividendNet: nullableNumber,
  lastDividendDate: isoDate.nullable(),
  dayOpen: finiteNumber.nonnegative(),
  dayHigh: finiteNumber.nonnegative(),
  dayLow: finiteNumber.nonnegative(),
  dayValueFcfa: nullableNumber,
  week52High: finiteNumber.nonnegative(),
  week52Low: finiteNumber.nonnegative(),
  allTimeHigh: finiteNumber.nonnegative(),
  allTimeHighDate: isoDate,
  sparkline: z.array(finiteNumber.nonnegative()),
});

export const quoteMapSchema = z.record(z.string(), quoteSchema);

export const liveMarketSchema = z.object({
  asOfDate: isoDate,
  updatedAt: z.string().datetime({ offset: true }),
  source: z.string().min(1),
  delayMinutes: z.number().int().nonnegative(),
  quotes: z.record(z.string(), z.object({
    open: finiteNumber.nonnegative(),
    high: finiteNumber.nonnegative(),
    low: finiteNumber.nonnegative(),
    close: finiteNumber.nonnegative(),
    samples: z.number().int().positive(),
    firstSeen: z.string().datetime({ offset: true }),
    lastSeen: z.string().datetime({ offset: true }),
    points: z.array(z.object({
      time: z.string().datetime({ offset: true }),
      price: finiteNumber.nonnegative(),
    })),
  })),
});

const fundamentalSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,12}$/),
  fiscalYear: z.number().int().min(1998).max(2200),
  revenueLabel: z.enum(["CA", "PNB"]),
  revenueM: finiteNumber,
  revenuePrevM: nullableNumber,
  netIncomeM: finiteNumber,
  netIncomePrevM: nullableNumber,
  ordinaryIncomeM: nullableNumber,
  ordinaryIncomePrevM: nullableNumber,
  cirPct: nullableNumber,
  cirPrevPct: nullableNumber,
  depositsM: nullableNumber,
  depositsPrevM: nullableNumber,
  loansM: nullableNumber,
  loansPrevM: nullableNumber,
  costOfRiskM: nullableNumber,
  costOfRiskPrevM: nullableNumber,
  proposedGrossDividend: nullableNumber,
  sharesOutstanding: nullableNumber,
  equityM: nullableNumber,
  equityPrevM: nullableNumber,
  source: z.string().url(),
  publishedOn: isoDate,
});

export const fundamentalsSchema = z.record(z.string(), fundamentalSchema);

export const indicesSchema = z.array(z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  asOfDate: isoDate,
  level: finiteNumber.nonnegative(),
  dayChangePct: finiteNumber,
  ytdChangePct: finiteNumber,
  spark: z.array(finiteNumber.nonnegative()),
}));

export const alertsSchema = z.array(z.object({
  id: z.string().min(1),
  type: z.enum(["prix", "volume", "dividende", "document", "fondamental", "ia"]),
  ticker: z.string().nullable(),
  title: z.string().min(1),
  detail: z.string(),
  time: z.string().datetime({ offset: true }),
  severity: z.enum(["info", "warning", "critical", "positive"]),
  active: z.boolean(),
  basis: z.enum(["réel", "illustratif"]),
  sourceUrl: z.string().url().optional(),
}));

export const dividendsSchema = z.record(
  z.string(),
  z.array(z.object({ date: isoDate, net: finiteNumber.nonnegative() }))
);

export const documentsSchema = z.array(z.object({
  ticker: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  date: isoDate,
  url: z.string().url(),
}));

const operationNoticeSchema = z.object({
  title: z.string().min(1),
  date: isoDate,
  pdf: z.string().url(),
});

export const operationsSchema = z.object({
  avis: z.array(operationNoticeSchema),
  operations: z.array(z.object({
    kind: z.string().min(1),
    issuer: z.string().min(1),
    ticker: z.string().nullable(),
    date: isoDate.nullable(),
    parity: z.string().nullable(),
    avisPdf: z.string().url().nullable(),
    communiquePdf: z.string().url().nullable(),
  })),
});

export const newsSchema = z.array(z.object({
  title: z.string().min(1),
  link: z.string().url(),
  source: z.string().min(1),
  publishedAt: z.string().datetime({ offset: true }),
  summary: z.string(),
  tickers: z.array(z.string()),
}));

export const seriesSchema = z.array(z.object({
  time: z.union([isoDate, finiteNumber]),
  open: finiteNumber.nonnegative(),
  high: finiteNumber.nonnegative(),
  low: finiteNumber.nonnegative(),
  close: finiteNumber.nonnegative(),
  volume: finiteNumber.nonnegative(),
})).superRefine((series, context) => {
  for (const issue of validateMarketSeries(series)) {
    if (issue.severity !== "error") continue;
    context.addIssue({
      code: "custom",
      message: issue.detail,
      path: [issue.index],
    });
  }
});

export const indexSeriesSchema = z.array(z.object({
  time: isoDate,
  value: finiteNumber.nonnegative(),
}));
