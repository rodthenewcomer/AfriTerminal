import { describe, expect, it } from "vitest";
import type { AlertItem } from "./types";
import { prioritizeCriticalAlerts } from "./alerts";

function item(id: string, time: string, severity: AlertItem["severity"]): AlertItem {
  return { id, type: "document", ticker: "UNXC", title: id, detail: "", time, severity, active: true, basis: "réel" };
}

describe("prioritizeCriticalAlerts", () => {
  it("remonte une publication critique récente avant un fait plus récent", () => {
    const ordered = prioritizeCriticalAlerts([
      item("latest", "2026-07-15T15:30:00+00:00", "info"),
      item("critical", "2026-07-13T09:05:00+00:00", "critical"),
    ]);
    expect(ordered.map((alert) => alert.id)).toEqual(["critical", "latest"]);
  });

  it("ne remonte pas une publication critique ancienne", () => {
    const ordered = prioritizeCriticalAlerts([
      item("latest", "2026-07-15T15:30:00+00:00", "info"),
      item("old", "2026-06-01T09:05:00+00:00", "critical"),
    ]);
    expect(ordered.map((alert) => alert.id)).toEqual(["latest", "old"]);
  });
});
