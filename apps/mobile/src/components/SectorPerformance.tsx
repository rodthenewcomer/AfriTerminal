import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RealQuote } from "@afriterminal/core/types";
import { pct } from "@afriterminal/core/format";
import { sectorLabel } from "../lib/sectors";
import { colors, tabular, type } from "../theme";

/**
 * Barres divergentes de performance sectorielle — port du composant web
 * (sector-performance.tsx) : zéro au centre, gauche = baisse, droite =
 * hausse ; la polarité est portée par la couleur ET la valeur signée.
 */
export function SectorPerformance({ quotes }: { quotes: RealQuote[] }) {
  const rows = useMemo(() => {
    const groups = quotes.reduce<Record<string, { sum: number; count: number }>>((acc, quote) => {
      const key = sectorLabel(quote.sectorCode);
      const current = acc[key] ?? { sum: 0, count: 0 };
      return { ...acc, [key]: { sum: current.sum + quote.dayChangePct, count: current.count + 1 } };
    }, {});
    return Object.entries(groups)
      .map(([sector, { sum, count }]) => ({ sector, avgDayChange: sum / count, count }))
      .sort((a, b) => b.avgDayChange - a.avgDayChange);
  }, [quotes]);

  if (!rows.length) return null;
  const maxAbs = Math.max(0.1, ...rows.map((row) => Math.abs(row.avgDayChange)));

  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const up = row.avgDayChange >= 0;
        const widthPct = (Math.abs(row.avgDayChange) / maxAbs) * 50;
        return (
          <View key={row.sector} style={styles.row}>
            <Text numberOfLines={1} style={styles.label}>{row.sector}</Text>
            <View style={styles.track}>
              <View style={styles.zeroAxis} />
              <View
                style={[
                  styles.bar,
                  up ? styles.barUp : styles.barDown,
                  { width: `${widthPct}%` },
                ]}
              />
            </View>
            <Text style={[styles.value, { color: up ? colors.up : colors.down }]}>
              {pct(row.avgDayChange, { digits: 2 })}
            </Text>
            <Text style={styles.count}>{row.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 104, ...type.caption, color: colors.ink2 },
  track: { flex: 1, height: 14, borderRadius: 4, backgroundColor: colors.surface2, overflow: "hidden" },
  zeroAxis: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: colors.lineStrong },
  bar: { position: "absolute", top: 2, bottom: 2, borderRadius: 3 },
  barUp: { left: "50%", backgroundColor: "rgba(34,197,94,0.7)" },
  barDown: { right: "50%", backgroundColor: "rgba(239,68,68,0.7)" },
  value: { width: 64, textAlign: "right", fontSize: 11.5, fontWeight: "600", fontVariant: tabular },
  count: { width: 20, textAlign: "right", ...type.caption, fontVariant: tabular },
});
