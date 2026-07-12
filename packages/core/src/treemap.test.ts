import { describe, expect, it } from "vitest";
import { squarify, type TreemapRect } from "./treemap";

const area = (r: TreemapRect) => r.width * r.height;

function overlaps(a: TreemapRect, b: TreemapRect): boolean {
  const eps = 1e-7;
  return (
    a.x + a.width > b.x + eps &&
    b.x + b.width > a.x + eps &&
    a.y + a.height > b.y + eps &&
    b.y + b.height > a.y + eps
  );
}

const ITEMS = [
  { id: "A", weight: 6 },
  { id: "B", weight: 6 },
  { id: "C", weight: 4 },
  { id: "D", weight: 3 },
  { id: "E", weight: 2 },
  { id: "F", weight: 2 },
  { id: "G", weight: 1 },
];

describe("squarify", () => {
  it("conserve l'aire totale et la proportionnalité des poids", () => {
    const rects = squarify(ITEMS, 0, 0, 600, 400);
    const total = rects.reduce((a, r) => a + area(r), 0);
    expect(total).toBeCloseTo(600 * 400, 6);
    const a = rects.find((r) => r.id === "A")!;
    const g = rects.find((r) => r.id === "G")!;
    expect(area(a) / area(g)).toBeCloseTo(6, 6);
  });

  it("aucun chevauchement, tout dans les bornes", () => {
    const rects = squarify(ITEMS, 10, 20, 300, 500);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(10 - 1e-7);
      expect(r.y).toBeGreaterThanOrEqual(20 - 1e-7);
      expect(r.x + r.width).toBeLessThanOrEqual(310 + 1e-7);
      expect(r.y + r.height).toBeLessThanOrEqual(520 + 1e-7);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it("les poids nuls ou négatifs sont ignorés", () => {
    const rects = squarify(
      [{ id: "A", weight: 5 }, { id: "Z", weight: 0 }, { id: "N", weight: -2 }],
      0, 0, 100, 100
    );
    expect(rects.map((r) => r.id)).toEqual(["A"]);
    expect(area(rects[0])).toBeCloseTo(10000, 6);
  });

  it("un seul élément occupe tout le rectangle", () => {
    const [r] = squarify([{ id: "X", weight: 42 }], 0, 0, 200, 100);
    expect(r).toEqual({ id: "X", x: 0, y: 0, width: 200, height: 100 });
  });

  it("les tuiles restent raisonnablement carrées (objectif de l'algo)", () => {
    // squarify est une heuristique : pas de garantie stricte, mais sur un
    // carré avec ces poids, aucun ratio ne doit partir en lamelle.
    const rects = squarify(ITEMS, 0, 0, 400, 400);
    for (const r of rects) {
      const aspect = Math.max(r.width / r.height, r.height / r.width);
      expect(aspect).toBeLessThan(6);
    }
  });
});
