import { z } from "zod";

const id = z.string().trim().min(1).max(100);
const ticker = z.string().regex(/^[A-Z0-9]{2,8}$/);
const timestamp = z.string().datetime({ offset: true });
const deletedAt = timestamp.optional();

export const cloudSyncSchema = z.object({
  watchlists: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(80),
    isActive: z.boolean(),
    tickers: z.array(ticker).max(100),
    updatedAt: timestamp,
    deletedAt,
  })).max(100),
  transactions: z.array(z.object({
    id,
    ticker,
    side: z.enum(["achat", "vente"]),
    date: z.iso.date().refine((value) => value >= "1998-09-16" && value <= new Date().toISOString().slice(0, 10)),
    quantity: z.number().int().positive().max(1_000_000_000),
    price: z.number().positive().max(1_000_000_000_000),
    fees: z.number().nonnegative().max(1_000_000_000_000).optional(),
    updatedAt: timestamp,
    deletedAt,
  })).max(10_000),
  alerts: z.array(z.object({
    id,
    ticker,
    direction: z.enum(["above", "below"]),
    target: z.number().positive().max(1_000_000_000_000),
    enabled: z.boolean(),
    triggeredAt: timestamp.optional(),
    channels: z.array(z.enum(["in_app", "push", "email"])).min(1).max(3),
    updatedAt: timestamp,
    deletedAt,
  })).max(1_000),
  savedFilters: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(100),
    filters: z.record(z.string(), z.string().max(200)),
    updatedAt: timestamp,
    deletedAt,
  })).max(500),
  preferences: z.array(z.object({
    key: z.enum(["chart", "chart_levels", "chart_layouts", "settings"]),
    value: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]),
    updatedAt: timestamp,
  })).max(5),
}).strict();
