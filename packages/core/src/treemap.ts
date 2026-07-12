/**
 * Treemap « squarify » (Bruls, Huizing & van Wijk) — pur et sans
 * dépendance : produit des tuiles aussi proches du carré que possible,
 * l'algorithme des market maps type Finviz.
 */

export interface TreemapInput {
  id: string;
  weight: number;
}

export interface TreemapRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pire ratio d'aspect d'une rangée d'aires `row` posée le long d'un côté de longueur `side`. */
function worstAspect(row: number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const strip = sum / side;
  let worst = 0;
  for (const area of row) {
    const len = area / strip;
    worst = Math.max(worst, len / strip, strip / len);
  }
  return worst;
}

export function squarify(
  items: TreemapInput[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect[] {
  const positive = items.filter((i) => i.weight > 0);
  if (positive.length === 0 || width <= 0 || height <= 0) return [];

  const total = positive.reduce((a, i) => a + i.weight, 0);
  const scale = (width * height) / total;
  const sorted = [...positive].sort((a, b) => b.weight - a.weight);
  const areas = sorted.map((i) => i.weight * scale);

  const rects: TreemapRect[] = [];
  let rx = x;
  let ry = y;
  let rw = width;
  let rh = height;
  let row: number[] = [];
  let rowStart = 0;

  const layoutRow = (endExclusive: number) => {
    const sum = row.reduce((a, b) => a + b, 0);
    const horizontal = rw >= rh; // rangée posée le long du côté court
    const side = horizontal ? rh : rw;
    const strip = sum / side;
    let offset = 0;
    for (let i = 0; i < row.length; i++) {
      const len = row[i] / strip;
      const item = sorted[rowStart + i];
      rects.push(
        horizontal
          ? { id: item.id, x: rx, y: ry + offset, width: strip, height: len }
          : { id: item.id, x: rx + offset, y: ry, width: len, height: strip }
      );
      offset += len;
    }
    if (horizontal) {
      rx += strip;
      rw -= strip;
    } else {
      ry += strip;
      rh -= strip;
    }
    rowStart = endExclusive;
    row = [];
  };

  for (let i = 0; i < areas.length; i++) {
    const side = Math.min(rw, rh);
    if (
      row.length === 0 ||
      worstAspect([...row, areas[i]], side) <= worstAspect(row, side)
    ) {
      row.push(areas[i]);
    } else {
      layoutRow(i);
      row.push(areas[i]);
    }
  }
  if (row.length > 0) layoutRow(areas.length);

  return rects;
}
