"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSnapshots } from "@/lib/data";
import { squarify, type TreemapRect } from "@afriterminal/core/treemap";
import { fcfa, pct } from "@afriterminal/core/format";
import type { RealQuote, StockSnapshot } from "@afriterminal/core/types";
import { PillTabs } from "@/components/ui/tabs";

// Espacement et en-têtes plus compacts sous 480 px : chaque pixel
// compte pour garder 48 tuiles lisibles sur un écran de téléphone.
function metrics(width: number) {
  const small = width < 480;
  return { gap: small ? 3 : 5, header: small ? 14 : 19, small };
}

/**
 * Horizons de performance (façon Finviz). `range` = variation à laquelle
 * la couleur sature : ±4 % est énorme sur un jour, banal sur 5 ans.
 */
const HORIZONS = [
  { id: "1J", label: "1 jour", get: (r: RealQuote) => r.dayChangePct, range: 4 },
  { id: "1S", label: "1 sem.", get: (r: RealQuote) => r.weekChangePct, range: 6 },
  { id: "1M", label: "1 mois", get: (r: RealQuote) => r.monthChangePct, range: 10 },
  { id: "3M", label: "3 mois", get: (r: RealQuote) => r.quarterChangePct, range: 15 },
  { id: "6M", label: "6 mois", get: (r: RealQuote) => r.halfYearChangePct, range: 25 },
  { id: "YTD", label: "YTD", get: (r: RealQuote) => r.ytdChangePct, range: 40 },
  { id: "1A", label: "1 an", get: (r: RealQuote) => r.yearChangePct, range: 40 },
  { id: "5A", label: "5 ans", get: (r: RealQuote) => r.fiveYearChangePct, range: 150 },
] as const;

type HorizonId = (typeof HORIZONS)[number]["id"];

/** Couleur de tuile : neutre à 0, sature à ±range. Palette fixe (canvas de données). */
export function tileColor(changePct: number, range: number): string {
  const t = Math.min(Math.abs(changePct) / range, 1);
  const base = [63, 63, 70];
  const target = changePct >= 0 ? [22, 163, 74] : [220, 38, 38];
  if (Math.abs(changePct) < 0.005) return `rgb(${base.join(",")})`;
  const mix = base.map((b, i) => Math.round(b + (target[i] - b) * t));
  return `rgb(${mix.join(",")})`;
}

/** Poids d'une tuile : liquidité (volume moyen 30 j × cours), plancher
 * pour garder les valeurs illiquides visibles et cliquables. */
function weight(s: StockSnapshot): number {
  return s.avgVolume30d * s.lastPrice;
}

/** Ordre fixe des secteurs (les poids font le reste) — lecture stable
 * d'un jour à l'autre, comme l'option « fixed sector order » de Finviz. */
const SECTOR_ORDER = [
  "Banque",
  "Télécom",
  "Agro-industrie",
  "Industrie",
  "Distribution",
  "Services publics",
  "Autre",
];

interface Layout {
  groups: {
    sector: string;
    rect: TreemapRect;
    tiles: { stock: StockSnapshot; rect: TreemapRect }[];
  }[];
}

function computeLayout(
  snapshots: StockSnapshot[],
  width: number,
  height: number
): Layout {
  const { gap: GROUP_GAP, header: HEADER_H } = metrics(width);
  const bySector = new Map<string, StockSnapshot[]>();
  for (const s of snapshots) {
    const arr = bySector.get(s.sector) ?? [];
    arr.push(s);
    bySector.set(s.sector, arr);
  }
  const maxW = Math.max(...snapshots.map(weight));
  const floor = maxW * 0.006;
  const w = (s: StockSnapshot) => Math.max(weight(s), floor);

  const sectorItems = [...bySector.entries()]
    .map(([sector, stocks]) => ({
      id: sector,
      weight: stocks.reduce((a, s) => a + w(s), 0),
    }))
    .sort(
      (a, b) => SECTOR_ORDER.indexOf(a.id) - SECTOR_ORDER.indexOf(b.id)
    );

  const sectorRects = squarify(sectorItems, 0, 0, width, height);

  const groups = sectorRects.map((rect) => {
    const stocks = bySector.get(rect.id)!;
    const inner = {
      x: rect.x + GROUP_GAP / 2,
      y: rect.y + GROUP_GAP / 2 + HEADER_H,
      width: Math.max(0, rect.width - GROUP_GAP),
      height: Math.max(0, rect.height - GROUP_GAP - HEADER_H),
    };
    const tiles = squarify(
      stocks.map((s) => ({ id: s.ticker, weight: w(s) })),
      inner.x,
      inner.y,
      inner.width,
      inner.height
    ).map((r) => ({
      stock: stocks.find((s) => s.ticker === r.id)!,
      rect: r,
    }));
    return { sector: rect.id, rect, tiles };
  });

  return { groups };
}

interface Hover {
  stock: StockSnapshot;
  x: number;
  y: number;
}

export function MarketMap({ compact = false }: { compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [horizonId, setHorizonId] = useState<HorizonId>("1J");
  const router = useRouter();
  const snapshots = getSnapshots();
  const horizon = HORIZONS.find((h) => h.id === horizonId) ?? HORIZONS[0];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => (size ? computeLayout(snapshots, size.w, size.h) : null),
    [snapshots, size]
  );
  const { gap: GROUP_GAP, header: HEADER_H, small } = metrics(size?.w ?? 1024);

  const change = (s: StockSnapshot): number =>
    s.real ? horizon.get(s.real) : s.dayChange;

  const legendStops = [-1, -0.5, 0, 0.5, 1].map((f) => ({
    label: `${f > 0 ? "+" : ""}${Math.round(f * horizon.range)} %`,
    color: tileColor(f * horizon.range, horizon.range),
  }));

  return (
    <div className="space-y-3">
      <div className={compact ? "hidden" : "flex flex-wrap items-center justify-between gap-3"}>
        <PillTabs
          options={HORIZONS.map((h) => ({ value: h.id, label: h.label }))}
          value={horizonId}
          onChange={(v) => setHorizonId(v as HorizonId)}
          className="max-w-full"
        />
        <div className="flex items-center gap-1.5 text-[10px] text-ink-3">
          {legendStops.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-5 rounded-[3px]"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className={
          compact
            ? "relative h-[300px] min-h-[260px] w-full overflow-hidden rounded-xl bg-[#0c0c0e]"
            : "relative h-[72vh] min-h-[460px] w-full overflow-hidden rounded-xl bg-[#0c0c0e]"
        }
        onMouseLeave={() => setHover(null)}
      >
        {layout?.groups.map((g) => (
          <div key={g.sector}>
            {g.rect.width > 56 && g.rect.height > 40 ? (
              <div
                className="pointer-events-none absolute flex items-center truncate bg-[#0c0c0e] px-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300"
                style={{
                  left: g.rect.x + GROUP_GAP / 2,
                  top: g.rect.y + GROUP_GAP / 2,
                  width: g.rect.width - GROUP_GAP,
                  height: HEADER_H,
                }}
              >
                {g.sector}
              </div>
            ) : null}
            {g.tiles.map(({ stock, rect }) => {
              const chg = change(stock);
              const showTicker = small
                ? rect.width >= 22 && rect.height >= 11
                : rect.width >= 30 && rect.height >= 14;
              const showPct = small
                ? rect.width >= 32 && rect.height >= 24
                : rect.width >= 40 && rect.height >= 30;
              const showPrice = !small && rect.width >= 96 && rect.height >= 64;
              const big = rect.width >= 90 && rect.height >= 54;
              return (
                <button
                  key={stock.ticker}
                  onClick={() => router.push(`/stocks/${stock.ticker}`)}
                  onMouseMove={(e) =>
                    setHover({ stock, x: e.clientX, y: e.clientY })
                  }
                  className="absolute flex cursor-pointer flex-col items-center justify-center overflow-hidden outline outline-1 outline-black/50 transition-[filter] hover:brightness-125 hover:z-10"
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: Math.max(0, rect.width - 1),
                    height: Math.max(0, rect.height - 1),
                    background: tileColor(chg, horizon.range),
                  }}
                  aria-label={`${stock.ticker} ${pct(chg)}`}
                >
                  {showTicker ? (
                    <span
                      className="font-bold leading-none text-white drop-shadow-sm"
                      style={{ fontSize: big ? 15 : rect.width >= 52 ? 12 : small ? 8 : 9 }}
                    >
                      {stock.ticker}
                    </span>
                  ) : null}
                  {showPct ? (
                    <span
                      className="num mt-0.5 leading-none text-white/90"
                      style={{ fontSize: big ? 12 : 9 }}
                    >
                      {pct(chg)}
                    </span>
                  ) : null}
                  {showPrice ? (
                    <span className="num mt-1 text-[10px] leading-none text-white/60">
                      {fcfa(stock.lastPrice)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}

        {!layout ? (
          <div className="absolute inset-0 animate-pulse bg-surface-2" />
        ) : null}

        {hover ? (
          <div
            className="pointer-events-none fixed z-50 w-60 rounded-lg border border-line bg-surface p-2.5 shadow-xl"
            style={{
              left: Math.min(hover.x + 14, (size?.w ?? 320) - 240),
              top: hover.y + 14,
            }}
          >
            <p className="text-xs font-bold text-ink">
              {hover.stock.ticker}{" "}
              <span className="font-medium text-ink-3">{hover.stock.name}</span>
            </p>
            <div className="num mt-1 flex items-baseline justify-between text-xs">
              <span className="font-semibold text-ink">
                {fcfa(hover.stock.lastPrice)}
              </span>
              <span className={change(hover.stock) >= 0 ? "text-up" : "text-down"}>
                {pct(change(hover.stock))}{" "}
                <span className="text-ink-3">({horizon.label})</span>
              </span>
            </div>
            <p className="mt-1 text-[10px] text-ink-3">
              {hover.stock.sector} · jour {pct(hover.stock.dayChange)} · volume{" "}
              {hover.stock.volumeRatio.toFixed(1)}× la moyenne 30 j
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
