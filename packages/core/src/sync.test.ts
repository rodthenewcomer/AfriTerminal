import { describe, expect, it } from "vitest";
import { mergeLatest } from "./sync";

describe("mergeLatest", () => {
  it("keeps the newest record regardless of source", () => {
    const local = [{ id: "SNTS", value: 1, updatedAt: "2026-07-14T10:00:00.000Z" }];
    const remote = [{ id: "SNTS", value: 2, updatedAt: "2026-07-14T11:00:00.000Z" }];
    expect(mergeLatest(local, remote)).toEqual(remote);
  });

  it("honors a newer deletion tombstone", () => {
    const local = [{ id: "SNTS", updatedAt: "2026-07-14T10:00:00.000Z" }];
    const remote = [{
      id: "SNTS",
      updatedAt: "2026-07-14T11:00:00.000Z",
      deletedAt: "2026-07-14T11:00:00.000Z",
    }];
    expect(mergeLatest(local, remote)).toEqual([]);
  });
});
