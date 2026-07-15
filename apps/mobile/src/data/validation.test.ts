import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  alertsSchema,
  dividendsSchema,
  documentsSchema,
  fundamentalsSchema,
  indicesSchema,
  liveMarketSchema,
  newsSchema,
  operationsSchema,
  quoteMapSchema,
  seriesSchema,
} from "./validation";

function json(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

describe("mobile public data boundary", () => {
  it.each([
    ["data/real/snapshot.json", quoteMapSchema],
    ["data/real/fundamentals.json", fundamentalsSchema],
    ["data/real/indices.json", indicesSchema],
    ["data/real/live.json", liveMarketSchema],
    ["data/real/alerts.json", alertsSchema],
    ["data/real/dividends.json", dividendsSchema],
    ["data/real/documents.json", documentsSchema],
    ["data/real/operations.json", operationsSchema],
    ["data/news/news.json", newsSchema],
    ["data/real/series/SNTS.json", seriesSchema],
  ] as const)("validates %s before cache or rendering", (path, schema) => {
    expect(() => schema.parse(json(path))).not.toThrow();
  });

  it("rejects non-finite and impossible market values", () => {
    expect(() => seriesSchema.parse([{ time: "2026-07-10", open: 10, high: 10, low: -1, close: 10, volume: 1 }])).toThrow();
  });
});
