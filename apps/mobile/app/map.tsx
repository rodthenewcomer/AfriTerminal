import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { RealQuote } from "@wariba/core/types";
import { squarify } from "@wariba/core/treemap";
import { pct } from "@wariba/core/format";
import { EmptyState, Page, SegmentedTabs } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { SECTOR_ORDER, sectorLabel } from "../src/lib/sectors";
import { type } from "../src/theme";

/**
 * Horizons de performance (façon Finviz) — mêmes définitions que la
 * market map du site : `range` = variation à laquelle la couleur sature.
 */
const HORIZONS = [
  { id: "1J", label: "1 J", get: (quote: RealQuote) => quote.dayChangePct, range: 4 },
  { id: "1S", label: "1 S", get: (quote: RealQuote) => quote.weekChangePct, range: 6 },
  { id: "1M", label: "1 M", get: (quote: RealQuote) => quote.monthChangePct, range: 10 },
  { id: "3M", label: "3 M", get: (quote: RealQuote) => quote.quarterChangePct, range: 15 },
  { id: "6M", label: "6 M", get: (quote: RealQuote) => quote.halfYearChangePct, range: 25 },
  { id: "YTD", label: "YTD", get: (quote: RealQuote) => quote.ytdChangePct, range: 40 },
  { id: "1A", label: "1 A", get: (quote: RealQuote) => quote.yearChangePct, range: 40 },
  { id: "5A", label: "5 A", get: (quote: RealQuote) => quote.fiveYearChangePct, range: 150 },
] as const;
type HorizonId = (typeof HORIZONS)[number]["id"];

/** Couleur de tuile : neutre à 0, sature à ±range — identique au web. */
function tileColor(changePct: number, saturation: number): string {
  const ratio = Math.min(Math.abs(changePct) / saturation, 1);
  const base = [63, 63, 70];
  const target = changePct >= 0 ? [22, 163, 74] : [220, 38, 38];
  if (Math.abs(changePct) < 0.005) return `rgb(${base.join(",")})`;
  const mix = base.map((channel, index) => Math.round(channel + (target[index] - channel) * ratio));
  return `rgb(${mix.join(",")})`;
}

const GAP = 3;
const HEADER = 16;

function SectorTreemap({ label, quotes, width, horizon, onOpen }: {
  label: string;
  quotes: RealQuote[];
  width: number;
  horizon: (typeof HORIZONS)[number];
  onOpen: (ticker: string) => void;
}) {
  // Poids = liquidité (volume moyen 30 j × cours), plancher pour rester tappable.
  const height = Math.max(96, Math.round(width * 0.42));
  const rects = useMemo(() => squarify(
    quotes.map((quote) => ({ id: quote.ticker, weight: Math.max(1, quote.avgVolume30d * quote.lastClose) })),
    0, 0, width, height
  ), [height, quotes, width]);
  const byTicker = useMemo(() => new Map(quotes.map((quote) => [quote.ticker, quote])), [quotes]);

  return (
    <View style={styles.sector}>
      <Text style={styles.sectorTitle}>{label}</Text>
      <View style={[styles.canvas, { width, height }]}>
        {rects.map((rect) => {
          const quote = byTicker.get(rect.id);
          if (!quote) return null;
          const change = horizon.get(quote);
          const showChange = rect.width > 52 && rect.height > 34;
          return (
            <Pressable
              key={rect.id}
              onPress={() => onOpen(rect.id)}
              style={[styles.tile, {
                left: rect.x, top: rect.y,
                width: Math.max(1, rect.width - GAP), height: Math.max(1, rect.height - GAP),
                backgroundColor: tileColor(change, horizon.range),
              }]}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={styles.tileTicker}>{rect.id}</Text>
              {showChange ? <Text numberOfLines={1} style={styles.tileChange}>{pct(change, { signed: true, digits: 1 })}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MapScreen() {
  const market = useMarketData();
  const router = useRouter();
  const [horizonId, setHorizonId] = useState<HorizonId>("1J");
  const [width, setWidth] = useState(0);
  const horizon = HORIZONS.find((item) => item.id === horizonId) ?? HORIZONS[0];

  const sectors = useMemo(() => {
    const groups = Object.values(market.quotes).reduce<Record<string, RealQuote[]>>((acc, quote) => {
      const key = sectorLabel(quote.sectorCode);
      return { ...acc, [key]: [...(acc[key] ?? []), quote] };
    }, {});
    return SECTOR_ORDER.filter((sector) => groups[sector]?.length).map((sector) => [sector, groups[sector]] as const);
  }, [market.quotes]);

  return (
    <Page subtitle="Taille : liquidité (volume 30 j × cours) · couleur : performance sur l'horizon choisi">
      <SegmentedTabs tabs={HORIZONS} active={horizonId} onChange={setHorizonId} />
      <View onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))} style={styles.measure}>
        {width > 0 && sectors.length
          ? sectors.map(([label, quotes]) => (
            <SectorTreemap key={label} label={label} quotes={quotes} width={width} horizon={horizon} onOpen={(ticker) => router.push(`/stocks/${ticker}`)} />
          ))
          : sectors.length === 0 ? <EmptyState icon="grid-outline" title="Carte indisponible" detail="Les cotations n'ont pas encore été chargées." /> : null}
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendSwatch, { backgroundColor: tileColor(-horizon.range, horizon.range) }]} />
        <Text style={styles.legendText}>-{horizon.range} %</Text>
        <View style={[styles.legendSwatch, { backgroundColor: tileColor(0, horizon.range) }]} />
        <Text style={styles.legendText}>0</Text>
        <View style={[styles.legendSwatch, { backgroundColor: tileColor(horizon.range, horizon.range) }]} />
        <Text style={styles.legendText}>+{horizon.range} %</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  measure: { gap: 18 },
  sector: { gap: 6 },
  sectorTitle: { ...type.label, height: HEADER },
  canvas: { position: "relative" },
  tile: { position: "absolute", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 4, overflow: "hidden" },
  tileTicker: { color: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  tileChange: { color: "rgba(255,255,255,0.75)", fontSize: 9.5, fontWeight: "600", marginTop: 1, fontVariant: ["tabular-nums"] },
  legend: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  legendSwatch: { width: 26, height: 12, borderRadius: 3 },
  legendText: { ...type.caption, fontVariant: ["tabular-nums"], marginRight: 6 },
});
