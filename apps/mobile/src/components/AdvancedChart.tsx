import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ChartType, IndicatorId, OHLCV, Timeframe } from "@wariba/core/types";
import {
  sliceSeriesByTimeframe,
  summarizePeriod,
  TIMEFRAME_OPTIONS,
} from "@wariba/core/market-series";
import { compactVolume, dateFr, fcfa, pct } from "@wariba/core/format";
import type { TimeValue } from "@wariba/core/indicators";
import {
  calculateATR, calculateBollingerBands, calculateEMA, calculateHeikinAshi,
  calculateMACD, calculateRSI, calculateSMA, calculateStochastic, calculateVWAP,
} from "@wariba/core/indicators";
import { WebChart, type WebChartHandle, type WebChartMarker, type WebChartOverlay, type WebChartPanes, type WebChartPayload } from "./chart/WebChart";
import { ActionButton } from "./ui";
import { useChartLevelStore, useChartStore } from "../stores";
import { colors, type } from "../theme";

/** Référence stable : un sélecteur zustand ne doit jamais fabriquer un nouveau tableau. */
const EMPTY_LEVELS: number[] = [];

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
  ticker, data, previousClose, week52High, week52Low, events = [], dividends = [],
}: {
  ticker: string;
  data: OHLCV[];
  previousClose?: number;
  week52High?: number;
  week52Low?: number;
  events?: WebChartMarker[];
  dividends?: { date: string; net: number }[];
}) {
  const chartRef = useRef<WebChartHandle>(null);
  const closeRef = useRef<View>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [levelMode, setLevelMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [range, setRange] = useState<Timeframe>("3M");
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

  const visible = useMemo(() => sliceSeriesByTimeframe(data, range), [data, range]);
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
      levels, markers: showEvents ? events : [], logarithmic, percentMode, levelMode, fit,
    };
  }, [chartType, data, events, fit, indicators, levelMode, levels, logarithmic, percentMode, previousClose, showEvents, since, ticker, visible, week52High, week52Low]);

  const paneCount = ["rsi", "macd", "atr", "stoch"].filter((id) => indicators.includes(id as IndicatorId)).length;
  const height = 400 + paneCount * 90;
  const rangeStats = useMemo(
    () => summarizePeriod(visible, range, dividends, { previousClose }),
    [dividends, previousClose, range, visible]
  );
  const chartSummary = rangeStats
    ? `Graphique ${ticker}, ${rangeStats.sessions} séances. Cours initial ${rangeStats.initialClose.toLocaleString("fr-FR")} FCFA, cours final ${rangeStats.finalClose.toLocaleString("fr-FR")} FCFA, performance ${rangeStats.priceReturnPct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %, plus haut ${rangeStats.high.toLocaleString("fr-FR")}, plus bas ${rangeStats.low.toLocaleString("fr-FR")}.`
    : `Graphique ${ticker}, aucune donnée sur la période.`;

  const rangeChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.toolbar}
      accessibilityLabel="Choisir la période du graphique"
    >
      {TIMEFRAME_OPTIONS.map((item) => (
        <ActionButton key={item.value} label={item.label} active={range === item.value} onPress={() => setRange(item.value)} />
      ))}
    </ScrollView>
  );
  const typeChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.toolbar}
      accessibilityLabel="Choisir le type de graphique"
    >
      {TYPES.map((item) => (
        <ActionButton key={item.id} label={item.label} active={chartType === item.id} onPress={() => setType(item.id)} />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      {rangeChips}
      {range === "1D" ? (
        <Text style={styles.sessionNotice}>
          1J = dernière séance officielle, de la clôture précédente à la clôture
          du jour. Le bulletin BRVM ne fournit pas le détail intraday.
        </Text>
      ) : null}
      <Text accessibilityRole="summary" style={styles.srSummary}>{chartSummary}</Text>
      {rangeStats ? (
        <View style={styles.periodSummary}>
          <Text style={styles.periodTitle}>
            {range === "MAX"
              ? "Depuis le début de l’historique disponible"
              : range === "1D"
                ? "Variation de la dernière séance officielle"
              : `Performance du cours sur ${TIMEFRAME_OPTIONS.find((item) => item.value === range)?.label ?? range}`}
          </Text>
          <Text style={styles.periodDates}>
            {range === "1D"
              ? `Séance du ${dateFr(rangeStats.endDate)}`
              : `Du ${dateFr(rangeStats.startDate)} au ${dateFr(rangeStats.endDate)}`} · calcul WARIBA sur clôtures officielles
          </Text>
          <View style={styles.summaryStrip}>
            <View style={styles.summaryCell}><Text style={styles.summaryLabel}>{range === "1D" ? "Clôture précédente" : "Cours initial"}</Text><Text style={styles.summaryValue}>{fcfa(rangeStats.initialClose)}</Text></View>
            <View style={styles.summaryCell}><Text style={styles.summaryLabel}>Cours final</Text><Text style={styles.summaryValue}>{fcfa(rangeStats.finalClose)}</Text></View>
            <View style={styles.summaryCell}><Text style={styles.summaryLabel}>Performance</Text><Text style={[styles.summaryValue, { color: rangeStats.priceReturnPct >= 0 ? colors.up : colors.down }]}>{pct(rangeStats.priceReturnPct, { signed: true, digits: 2 })}</Text></View>
          </View>
          <View style={styles.summaryStrip}>
            <View style={styles.summaryCell}><Text style={styles.summaryLabel}>Annualisée</Text><Text style={styles.summaryValue}>{rangeStats.annualizedReturnPct === null ? "N/D" : `${pct(rangeStats.annualizedReturnPct, { signed: true, digits: 1 })}/an`}</Text></View>
            <View style={styles.summaryCell}><Text style={styles.summaryLabel}>Plus haut</Text><Text style={styles.summaryValue}>{fcfa(rangeStats.high)}</Text></View>
            <View style={styles.summaryCell}><Text style={styles.summaryLabel}>Plus bas</Text><Text style={styles.summaryValue}>{fcfa(rangeStats.low)}</Text></View>
          </View>
          <Text style={styles.periodFootnote}>
            Dividendes nets {fcfa(rangeStats.cumulativeDividends)}/action · rendement total hors réinvestissement {pct(rangeStats.totalReturnPct, { signed: true, digits: 2 })} · {rangeStats.sessions} séances · {rangeStats.sessionsWithoutTrade} sans transaction{rangeStats.bestSessionPct === null ? "" : ` · meilleure ${pct(rangeStats.bestSessionPct, { signed: true, digits: 1 })}`}{rangeStats.worstSessionPct === null ? "" : ` · pire ${pct(rangeStats.worstSessionPct, { signed: true, digits: 1 })}`} · vol. {compactVolume(rangeStats.totalVolume)}
          </Text>
        </View>
      ) : null}
      <View style={styles.selectorBlock}>
        <Text style={styles.selectorLabel}>Type de graphique</Text>
        {typeChips}
      </View>
      <WebChart ref={chartRef} payload={payload} height={height} onLevelTap={(price) => toggleLevel(ticker, price)} />
      {levelMode ? <Text style={styles.levelHint}>Touchez le graphique pour poser ou retirer un niveau de prix.</Text> : null}
      <View style={styles.actions}>
        <ActionButton label="Indicateurs" icon="options-outline" active={showIndicators} onPress={() => setShowIndicators((value) => !value)} />
        <ActionButton label="Événements" icon="calendar-outline" active={showEvents} onPress={() => setShowEvents((value) => !value)} />
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
      {showEvents && events.length ? (
        <Text style={styles.eventLegend}>D = dividende · R = résultats · S = opération sur capital</Text>
      ) : null}

      <Modal
        visible={fullscreen}
        animationType="fade"
        onShow={() => {
          const node = findNodeHandle(closeRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }}
        onRequestClose={() => setFullscreen(false)}
      >
        <View accessibilityViewIsModal style={[styles.fullscreen, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>{ticker}</Text>
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Fermer le graphique plein écran" onPress={() => setFullscreen(false)} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {rangeChips}
          {typeChips}
          {fullscreen ? (
            <WebChart
              payload={{ ...payload, fit: true }}
              height={Math.max(260, window_.height - insets.top - insets.bottom - 190)}
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
  selectorBlock: { gap: 6 },
  selectorLabel: { ...type.label, color: colors.ink2 },
  sessionNotice: {
    ...type.caption,
    color: colors.ink2,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  levelHint: { ...type.caption, color: colors.accent },
  srSummary: { position: "absolute", width: 1, height: 1, opacity: 0 },
  periodSummary: { gap: 7, borderTopColor: colors.line, borderBottomColor: colors.line, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 11 },
  periodTitle: { color: colors.ink, fontSize: 12.5, fontWeight: "800" },
  periodDates: { ...type.caption, fontSize: 10 },
  periodFootnote: { ...type.caption, fontSize: 9.5, lineHeight: 14 },
  summaryStrip: { flexDirection: "row", paddingVertical: 3 },
  summaryCell: { flex: 1, gap: 3, paddingRight: 6 },
  summaryLabel: { ...type.label, fontSize: 9 },
  summaryValue: { color: colors.ink, fontSize: 11.5, fontWeight: "700", fontVariant: ["tabular-nums"] },
  eventLegend: { ...type.caption, fontSize: 10, color: colors.ink2 },
  fullscreen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 12, gap: 10 },
  fullscreenHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fullscreenTitle: { ...type.title, fontSize: 17 },
  closeButton: {
    width: 48, height: 48, alignItems: "center", justifyContent: "center",
    borderRadius: 24, backgroundColor: colors.surface2,
  },
});
