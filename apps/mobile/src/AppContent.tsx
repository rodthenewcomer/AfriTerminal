import { useMemo } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { calculateSMA } from "@afriterminal/core/indicators";
import { fcfa, pct } from "@afriterminal/core/format";
import { CandleChart } from "./components/CandleChart";
import snts from "./data/snts-sample.json";
import type { OHLCV } from "@afriterminal/core/types";

const data = snts as OHLCV[];

/**
 * Écran unique du spike Phase 1 — pas encore une vraie app (pas de
 * navigation, un seul ticker en dur). But : prouver le rendu Skia natif
 * avant d'engager la réécriture complète du moteur de chart mobile.
 */
export default function AppContent() {
  const sma20 = useMemo(() => calculateSMA(data, 20), []);
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const change = ((last.close - prev.close) / prev.close) * 100;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>A</Text>
            </View>
            <Text style={styles.brand}>
              Afri<Text style={styles.brandAccent}>Terminal</Text>
            </Text>
          </View>
          <View style={styles.phaseStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.phaseText}>PHASE 1</Text>
          </View>
        </View>

        <View style={styles.tickerRow}>
          <View>
            <View style={styles.tickerIdentity}>
              <Text style={styles.ticker}>SNTS</Text>
              <Text style={styles.company}>Sonatel</Text>
            </View>
            <Text style={styles.market}>BRVM · Télécom · Sénégal</Text>
          </View>
          <View style={styles.quote}>
            <Text style={styles.price}>{fcfa(last.close)}</Text>
            <Text style={[styles.change, change >= 0 ? styles.up : styles.down]}>
              {change >= 0 ? "▲" : "▼"} {pct(change, { signed: true, digits: 2 })}
            </Text>
          </View>
        </View>

        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.sectionLabel}>COURS DE CLÔTURE</Text>
            <Text style={styles.period}>180 séances · 1J</Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendLine} />
            <Text style={styles.legendText}>SMA 20</Text>
          </View>
        </View>

        <CandleChart data={data} sma={sma20} height={360} />

        <Text style={styles.hint}>
          Glisser pour naviguer · pincer pour zoomer · maintenir pour
          inspecter · double-tap pour recadrer
        </Text>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#09090b" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandMark: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: "#e2a63d",
  },
  brandMarkText: {
    color: "#09090b",
    fontSize: 13,
    fontWeight: "900",
  },
  brand: { fontSize: 17, fontWeight: "800", color: "#fafafa" },
  brandAccent: { color: "#e2a63d" },
  phaseStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#111113",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 7,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e2a63d",
  },
  phaseText: {
    color: "#a1a1aa",
    fontSize: 9,
    fontWeight: "800",
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  tickerIdentity: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  ticker: { fontSize: 17, fontWeight: "800", color: "#fafafa" },
  company: { fontSize: 12, fontWeight: "600", color: "#a1a1aa" },
  market: { marginTop: 3, fontSize: 10, color: "#63636b" },
  quote: { alignItems: "flex-end" },
  price: {
    fontSize: 21,
    fontWeight: "800",
    color: "#fafafa",
    fontVariant: ["tabular-nums"],
  },
  change: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  up: { color: "#22c55e" },
  down: { color: "#ef4444" },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    color: "#63636b",
    fontSize: 9,
    fontWeight: "800",
  },
  period: {
    marginTop: 3,
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#e2a63d",
  },
  legendText: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: "#63636b",
    paddingHorizontal: 16,
    paddingTop: 9,
    textAlign: "center",
  },
});
