import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RealQuote } from "@afriterminal/core/types";
import { colors, radius, tabular, type } from "../theme";

/**
 * Largeur de marché façon « Decliners & Advancers » de Webull : barre
 * tricolore proportionnelle (baisses · stables · hausses) avec compteurs.
 */
export function BreadthBar({ quotes }: { quotes: RealQuote[] }) {
  const { up, flat, down } = useMemo(() => ({
    up: quotes.filter((quote) => quote.dayChangePct > 0).length,
    flat: quotes.filter((quote) => quote.dayChangePct === 0).length,
    down: quotes.filter((quote) => quote.dayChangePct < 0).length,
  }), [quotes]);
  const total = Math.max(1, up + flat + down);

  return (
    <View style={styles.card}>
      <View style={styles.counts}>
        <Text style={[styles.count, { color: colors.down }]}>{down}</Text>
        <Text style={styles.countLabel}>baisses · stables · hausses</Text>
        <Text style={[styles.count, { color: colors.up }]}>{up}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.segment, { flex: Math.max(down / total, 0.02), backgroundColor: colors.down }]} />
        <View style={[styles.segment, { flex: Math.max(flat / total, 0.02), backgroundColor: colors.ink3 }]} />
        <View style={[styles.segment, { flex: Math.max(up / total, 0.02), backgroundColor: colors.up }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14, gap: 10,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  counts: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  count: { fontSize: 19, fontWeight: "800", fontVariant: tabular },
  countLabel: { ...type.label, fontSize: 9.5 },
  track: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 },
  segment: { height: 8 },
});
