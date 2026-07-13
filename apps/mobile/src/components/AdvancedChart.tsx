import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ChartType, IndicatorId, OHLCV } from "@afriterminal/core/types";
import type { TimeValue } from "@afriterminal/core/indicators";
import {
  calculateATR, calculateBollingerBands, calculateEMA, calculateHeikinAshi,
  calculateMACD, calculateRSI, calculateSMA, calculateStochastic, calculateVWAP,
} from "@afriterminal/core/indicators";
import { WebChart, type WebChartHandle, type WebChartMarker, type WebChartOverlay, type WebChartPanes, type WebChartPayload } from "./chart/WebChart";
import { ActionButton, SegmentedTabs } from "./ui";
import { useChartLevelStore, useChartStore } from "../stores";
import { colors, type } from "../theme";

/** Référence stable : un sélecteur zustand ne doit jamais fabriquer un nouveau tableau. */
const EMPTY_LEVELS: number[] = [];

const RANGES: { id: string; label: string; bars: number }[] = [
  { id: "1m", label: "1M", bars: 22 },
  { id: "3m", label: "3M", bars: 66 },
  { id: "6m", label: "6M", bars: 132 },
  { id: "ytd", label: "YTD", bars: 0 },
  { id: "1y", label: "1A", bars: 264 },
  { id: "3y", label: "3A", bars: 792 },
  { id: "5y", label: "5A", bars: 1320 },
  { id: "all", label: "Tout", bars: Number.POSITIVE_INFINITY },
];

function sliceRange(data: OHLCV[], rangeId: string): OHLCV[] {
  if (rangeId === "ytd") {
    const lastTime = String(data[data.length - 1]?.time ?? "");
    const january = `${lastTime.slice(0, 4)}-01-01`;
    return data.filter((bar) => String(bar.time) >= january);
  }
  const bars = RANGES.find((item) => item.id === rangeId)?.bars ?? Number.POSITIVE_INFINITY;
  return Number.isFinite(bars) ? data.slice(-bars) : data;
}

const TYPES: { id: ChartType; label: string }[] = [
  { id: "candlestick", label: "Bougies" }, { id: "line", label: "Ligne" },
  { id: "area", label: "Aire" }, { id: "baseline", label: "Baseline" },
  { id: "bars", label: "Barres" }, { id: "heikin-ashi", label: "Heikin" },
];
const INDICATORS: { id: IndicatorId; label: string }[] = [
  { id: "sma20", label: "SMA 20" }, { id: "sma50", label: "SMA 50" },
  { id: "sma100", label: "SMA 100" }, { id: "sma200", label: "SMA 200" },
  { id: "ema20", label: "EMA 20" }, { id: "vwap", label: "VWAP" },
  { id: "bollinger", label: "Bollinger" }, { id: "rsi", label: "RSI" },
  { id: "macd", label: "MACD" }, { id: "atr", label: "ATR" },
  { id: "stoch", label: "Stoch" },
];

/** Couleurs des moyennes mobiles — identiques à CHART_COLORS du site web. */
const MA_COLORS: Record<string, string> = {
  sma20: "#38bdf8", sma50: "#8b5cf6", sma100: "#fb923c", sma200: "#94a3b8", ema20: "#ec4899",
};

function toPoints(points: TimeValue[], since: string): { time: string; value: number }[] {
  return points
    .map((point) => ({ time: String(point.time), value: point.value }))
    .filter((point) => point.time >= since);
}

export function AdvancedChart({
  ticker, data, previousClose, week52High, week52Low, events = [],
}: {
  ticker: string;
  data: OHLCV[];
  previousClose?: number;
  week52High?: number;
  week52Low?: number;
  events?: WebChartMarker[];
}) {
  const chartRef = useRef<WebChartHandle>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [levelMode, setLevelMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [range, setRange] = useState("3m");
  const window_ = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chartType = useChartStore((state) => state.type);
  const indicators = useChartStore((state) => state.indicators);
  const logarithmic = useChartStore((state) => state.logarithmic);
  const percentMode = useChartStore((state) => state.percentMode);
  const setType = useChartStore((state) => state.setType);
  const toggleIndicator = useChartStore((state) => state.toggleIndicator);
  const toggleLog = useChartStore((state) => state.toggleLog);
  const togglePercent = useChartStore((state) => state.togglePercent);
  const levels = useChartLevelStore((state) => state.byTicker[ticker]) ?? EMPTY_LEVELS;
  const toggleLevel = useChartLevelStore((state) => state.toggle);

  const visible = useMemo(() => sliceRange(data, range), [data, range]);
  const since = String(visible[0]?.time ?? "");

  // fitContent uniquement quand l'instrument, la période ou le type change —
  // pas quand on togglise un indicateur (même règle que le site web).
  const fitKey = `${ticker}|${range}|${chartType}`;
  const lastFitKeyRef = useRef("");
  const fit = fitKey !== lastFitKeyRef.current;
  useEffect(() => { lastFitKeyRef.current = fitKey; });

  const payload = useMemo<WebChartPayload>(() => {
    const bars = chartType === "heikin-ashi" ? calculateHeikinAshi(visible) : visible;
    const overlays: WebChartOverlay[] = [];
    for (const id of ["sma20", "sma50", "sma100", "sma200"] as const) {
      if (indicators.includes(id)) {
        overlays.push({ id, color: MA_COLORS[id], data: toPoints(calculateSMA(data, Number(id.slice(3))), since) });
      }
    }
    if (indicators.includes("ema20")) overlays.push({ id: "ema20", color: MA_COLORS.ema20, data: toPoints(calculateEMA(data, 20), since) });
    if (indicators.includes("vwap")) overlays.push({ id: "vwap", color: "#2dd4bf", dashed: true, data: toPoints(calculateVWAP(data), since) });
    if (indicators.includes("bollinger")) {
      const bands = calculateBollingerBands(data);
      overlays.push({ id: "bb-mid", color: "rgba(139,92,246,0.9)", data: toPoints(bands.middle, since) });
      overlays.push({ id: "bb-up", color: "rgba(139,92,246,0.35)", data: toPoints(bands.upper, since) });
      overlays.push({ id: "bb-low", color: "rgba(139,92,246,0.35)", data: toPoints(bands.lower, since) });
    }

    const panes: WebChartPanes = {};
    if (indicators.includes("rsi")) panes.rsi = toPoints(calculateRSI(data), since);
    if (indicators.includes("macd")) {
      const macd = calculateMACD(data);
      panes.macd = { macd: toPoints(macd.macd, since), signal: toPoints(macd.signal, since), histogram: toPoints(macd.histogram, since) };
    }
    if (indicators.includes("atr")) panes.atr = toPoints(calculateATR(data), since);
    if (indicators.includes("stoch")) {
      const stoch = calculateStochastic(data);
      panes.stoch = { k: toPoints(stoch.k, since), d: toPoints(stoch.d, since) };
    }

    const referenceLines = [
      previousClose !== undefined ? { price: previousClose, title: "veille", color: "rgba(148,163,184,0.5)", dashed: true } : null,
      week52High !== undefined ? { price: week52High, title: "52s haut", color: "rgba(34,197,94,0.35)", dashed: false } : null,
      week52Low !== undefined ? { price: week52Low, title: "52s bas", color: "rgba(239,68,68,0.35)", dashed: false } : null,
    ].filter((line): line is NonNullable<typeof line> => line !== null);

    return {
      ticker, chartType, bars, overlays, panes, referenceLines,
      levels, markers: events, logarithmic, percentMode, levelMode, fit,
    };
  }, [chartType, data, events, fit, indicators, levelMode, levels, logarithmic, percentMode, previousClose, since, ticker, visible, week52High, week52Low]);

  const paneCount = ["rsi", "macd", "atr", "stoch"].filter((id) => indicators.includes(id as IndicatorId)).length;
  const height = 400 + paneCount * 90;

  const rangeChips = <SegmentedTabs tabs={RANGES} active={range} onChange={setRange} />;

  return (
    <View style={styles.root}>
      {rangeChips}
      <WebChart ref={chartRef} payload={payload} height={height} onLevelTap={(price) => toggleLevel(ticker, price)} />
      {levelMode ? <Text style={styles.levelHint}>Touchez le graphique pour poser ou retirer un niveau de prix.</Text> : null}
      <SegmentedTabs tabs={TYPES} active={chartType} onChange={setType} />
      <View style={styles.actions}>
        <ActionButton label="Indicateurs" icon="options-outline" active={showIndicators} onPress={() => setShowIndicators((value) => !value)} />
        <ActionButton label="Log" active={logarithmic} onPress={toggleLog} />
        <ActionButton label="%" active={percentMode} onPress={togglePercent} />
        <ActionButton label="Niveau" icon="remove-outline" active={levelMode} onPress={() => setLevelMode((value) => !value)} />
        <ActionButton label="PNG" icon="share-outline" onPress={() => chartRef.current?.shoot()} />
        <ActionButton label="Plein écran" icon="expand-outline" onPress={() => setFullscreen(true)} />
      </View>
      {showIndicators ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}>
          {INDICATORS.map((item) => <ActionButton key={item.id} label={item.label} active={indicators.includes(item.id)} onPress={() => toggleIndicator(item.id)} />)}
        </ScrollView>
      ) : null}

      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <View style={[styles.fullscreen, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>{ticker}</Text>
            <Pressable onPress={() => setFullscreen(false)} hitSlop={10} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {rangeChips}
          {fullscreen ? (
            <WebChart
              payload={{ ...payload, fit: true }}
              height={window_.height - insets.top - insets.bottom - 132}
              onLevelTap={(price) => toggleLevel(ticker, price)}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  rangeRow: { gap: 7 },
  toolbar: { gap: 7 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  levelHint: { ...type.caption, color: colors.accent },
  fullscreen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 12, gap: 10 },
  fullscreenHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fullscreenTitle: { ...type.title, fontSize: 17 },
  closeButton: {
    width: 34, height: 34, alignItems: "center", justifyContent: "center",
    borderRadius: 17, backgroundColor: colors.surface2,
  },
});
