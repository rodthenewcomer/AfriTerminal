import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { pct } from "@afriterminal/core/format";
import { colors, tabular, type } from "../theme";

export interface DonutSlice {
  label: string;
  value: number;
}

/** Palette catégorielle du donut — accent d'abord, teintes distinctes ensuite. */
const SLICE_COLORS = [colors.accent, colors.up, colors.violet, "#38bdf8", colors.warn, "#ec4899", colors.ink3];

/**
 * Donut d'allocation en Skia pur (arcs statiques, aucun geste) : chaque
 * segment est un arc épais, petit espace entre segments pour la lisibilité.
 */
export function AllocationDonut({ slices, size = 128 }: { slices: DonutSlice[]; size?: number }) {
  const stroke = 15;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    const inset = stroke / 2 + 1;
    const rect = { x: inset, y: inset, width: size - inset * 2, height: size - inset * 2 };
    const gapDegrees = slices.length > 1 ? 2.5 : 0;
    let cursor = -90;
    return slices.map((slice, index) => {
      const sweep = Math.max(0, (slice.value / total) * 360 - gapDegrees);
      const path = Skia.Path.Make();
      path.addArc(rect, cursor, sweep);
      cursor += (slice.value / total) * 360;
      return { key: `${slice.label}-${index}`, path, color: SLICE_COLORS[index % SLICE_COLORS.length] };
    });
  }, [size, slices, total]);

  if (total <= 0) return null;

  return (
    <View style={styles.root}>
      <Canvas style={{ width: size, height: size }}>
        {arcs.map((arc) => (
          <Path key={arc.key} path={arc.path} color={arc.color} style="stroke" strokeWidth={stroke} strokeCap="butt" />
        ))}
      </Canvas>
      <View style={styles.legend}>
        {slices.map((slice, index) => (
          <View key={`${slice.label}-${index}`} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }]} />
            <Text numberOfLines={1} style={styles.legendLabel}>{slice.label}</Text>
            <Text style={styles.legendValue}>{pct((slice.value / total) * 100, { signed: false, digits: 1 })}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 18 },
  legend: { flex: 1, gap: 7 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { flex: 1, ...type.caption, color: colors.ink2 },
  legendValue: { ...type.caption, color: colors.ink, fontWeight: "600", fontVariant: tabular },
});
