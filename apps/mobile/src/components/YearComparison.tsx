import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { millions, pct } from "@wariba/core/format";
import type { FundamentalRecord } from "../data/types";
import { ChangePill, SegmentedTabs } from "./ui";
import { colors, radius, tabular, type } from "../theme";

interface MetricPair {
  id: string;
  label: string;
  current: number;
  previous: number;
}

const BAR_MAX_HEIGHT = 110;

function metricPairs(fundamental: FundamentalRecord): MetricPair[] {
  const candidates: { id: string; label: string; current: number | null; previous: number | null }[] = [
    { id: "revenue", label: fundamental.revenueLabel, current: fundamental.revenueM, previous: fundamental.revenuePrevM },
    { id: "net", label: "Résultat net", current: fundamental.netIncomeM, previous: fundamental.netIncomePrevM },
    { id: "ordinary", label: "Rés. ordinaire", current: fundamental.ordinaryIncomeM, previous: fundamental.ordinaryIncomePrevM },
    { id: "equity", label: "Capitaux propres", current: fundamental.equityM, previous: fundamental.equityPrevM },
    { id: "deposits", label: "Dépôts", current: fundamental.depositsM, previous: fundamental.depositsPrevM },
    { id: "loans", label: "Crédits", current: fundamental.loansM, previous: fundamental.loansPrevM },
  ];
  return candidates.filter(
    (pair): pair is MetricPair & { current: number; previous: number } =>
      pair.current !== null && pair.previous !== null && pair.previous !== 0
  );
}

/**
 * Comparaison N-1 / N d'un agrégat financier — le pattern « Financials »
 * de Webull (barres + croissance), réduit honnêtement aux deux exercices
 * réellement vérifiés dans les états financiers BRVM.
 */
export function YearComparison({ fundamental }: { fundamental: FundamentalRecord }) {
  const pairs = useMemo(() => metricPairs(fundamental), [fundamental]);
  const [selectedId, setSelectedId] = useState(pairs[0]?.id ?? "");
  const selected = pairs.find((pair) => pair.id === selectedId) ?? pairs[0];
  if (!selected) return null;

  const growth = ((selected.current - selected.previous) / Math.abs(selected.previous)) * 100;
  const maxValue = Math.max(Math.abs(selected.previous), Math.abs(selected.current), 1);
  const heightFor = (value: number) => Math.max(6, (Math.abs(value) / maxValue) * BAR_MAX_HEIGHT);

  return (
    <View style={styles.card}>
      <SegmentedTabs
        tabs={pairs.map((pair) => ({ id: pair.id, label: pair.label }))}
        active={selected.id}
        onChange={setSelectedId}
      />
      <View style={styles.chart}>
        <View style={styles.barGroup}>
          <Text style={styles.barValue}>{millions(selected.previous)}</Text>
          <View style={[styles.bar, styles.barPrevious, { height: heightFor(selected.previous) }]} />
          <Text style={styles.barLabel}>{fundamental.fiscalYear - 1}</Text>
        </View>
        <View style={styles.barGroup}>
          <Text style={[styles.barValue, { color: colors.ink }]}>{millions(selected.current)}</Text>
          <View style={[styles.bar, styles.barCurrent, { height: heightFor(selected.current) }]} />
          <Text style={styles.barLabel}>{fundamental.fiscalYear}</Text>
        </View>
        <View style={styles.growth}>
          <Text style={styles.growthLabel}>Évolution</Text>
          <ChangePill value={growth} label={pct(growth, { signed: true, digits: 1 })} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14, gap: 16,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-evenly", gap: 12 },
  barGroup: { alignItems: "center", gap: 7 },
  bar: { width: 44, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barPrevious: { backgroundColor: colors.surface2, borderColor: colors.lineStrong, borderWidth: 1 },
  barCurrent: { backgroundColor: colors.accent },
  barValue: { ...type.caption, fontWeight: "700", fontVariant: tabular },
  barLabel: { ...type.label, fontSize: 9.5 },
  growth: { alignItems: "center", gap: 7, paddingBottom: 18 },
  growthLabel: { ...type.label, fontSize: 9.5 },
});
