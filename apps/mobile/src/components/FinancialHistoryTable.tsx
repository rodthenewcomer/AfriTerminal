import { ScrollView, StyleSheet, Text, View } from "react-native";
import { buildFinancialHistory } from "@wariba/core/financial-history";
import { metricEvidenceLabel } from "@wariba/core/financial-language";
import type { RealFundamentalInput } from "@wariba/core/real-analysis";
import { fcfa, millions, pct } from "@wariba/core/format";
import { colors, radius, tabular, type } from "../theme";

function formatValue(value: number | null, format: "amount" | "percent" | "per-share"): string {
  if (value === null) return "N/D";
  if (format === "percent") return pct(value, { signed: false, digits: 1 });
  if (format === "per-share") return fcfa(value);
  return millions(value);
}

export function FinancialHistoryTable({
  fundamental,
}: {
  fundamental: RealFundamentalInput;
}) {
  const history = buildFinancialHistory(fundamental);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Historique financier sur 5 exercices</Text>
      <Text style={styles.detail}>
        {history.coverageYears}/{history.totalYears} exercices couverts · données absentes laissées N/D
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.row}>
            <Text style={[styles.label, styles.header]}>Métrique</Text>
            {history.years.map((year) => (
              <Text key={year} style={[styles.cell, styles.header]}>{year}</Text>
            ))}
          </View>
          {history.rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              {history.years.map((year) => {
                const item = row.cells[year];
                return (
                  <View key={year} style={styles.cellBox}>
                    <Text style={styles.value}>{formatValue(item.value, row.format)}</Text>
                    <Text style={styles.status}>{metricEvidenceLabel(item.status)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.note}>
        Ratios calculés uniquement sur montants vérifiés. Dette et trésorerie restent N/D sans postes de bilan normalisés.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, gap: 7, padding: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg },
  title: { ...type.title, fontSize: 14 },
  detail: { ...type.caption, marginBottom: 4 },
  row: { flexDirection: "row", minHeight: 48, borderBottomColor: colors.line, borderBottomWidth: 1 },
  label: { width: 138, paddingHorizontal: 8, paddingVertical: 10, color: colors.ink, fontSize: 11.5, fontWeight: "700" },
  cell: { width: 96, paddingHorizontal: 7, paddingVertical: 10, textAlign: "right" },
  cellBox: { width: 96, paddingHorizontal: 7, paddingVertical: 8, alignItems: "flex-end" },
  value: { color: colors.ink2, fontSize: 11.5, fontWeight: "600", fontVariant: tabular },
  status: { color: colors.ink3, fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 },
  header: { color: colors.ink3, fontSize: 9.5, fontWeight: "700", textTransform: "uppercase" },
  note: { ...type.caption, fontSize: 9.5, lineHeight: 14, marginTop: 4 },
});
