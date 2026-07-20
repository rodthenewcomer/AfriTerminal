import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { OHLCV } from "@wariba/core/types";
import {
  TIMEFRAME_OPTIONS,
  sliceSeriesByTimeframe,
  summarizePeriod,
  type PeriodDividend,
} from "@wariba/core/market-series";
import { compactVolume, dateFr, fcfa, pct } from "@wariba/core/format";
import { colors, radius, tabular, type } from "../theme";

export function PerformanceTable({
  data,
  dividends,
  previousClose,
}: {
  data: OHLCV[];
  dividends: PeriodDividend[];
  previousClose: number;
}) {
  const rows = TIMEFRAME_OPTIONS.map(({ value, label }) => ({
    label,
    summary: summarizePeriod(sliceSeriesByTimeframe(data, value), value, dividends, {
      previousClose,
    }),
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Performance par période</Text>
      <Text style={styles.detail}>Même historique et mêmes calculs que le graphique</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.row}>
            {["Pér.", "Dates", "Cours", "Total", "Haut / Bas", "Vol. moy.", "Sans éch."].map((label, index) => (
              <Text key={label} style={[index === 0 ? styles.period : styles.cell, index === 1 && styles.dates, styles.header]}>{label}</Text>
            ))}
          </View>
          {rows.map(({ label, summary }) => (
            <View key={label} style={styles.row}>
              <Text style={styles.period}>{label}</Text>
              <Text style={[styles.cell, styles.dates]}>{summary ? `${dateFr(summary.startDate)} → ${dateFr(summary.endDate)}` : "N/D"}</Text>
              <Text style={styles.cell}>{summary ? pct(summary.priceReturnPct, { digits: 2 }) : "N/D"}</Text>
              <Text style={styles.cell}>{summary ? pct(summary.totalReturnPct, { digits: 2 }) : "N/D"}</Text>
              <Text style={styles.cell}>{summary ? `${fcfa(summary.high)} / ${fcfa(summary.low)}` : "N/D"}</Text>
              <Text style={styles.cell}>{summary ? compactVolume(summary.averageVolume) : "N/D"}</Text>
              <Text style={styles.cell}>{summary ? `${summary.sessionsWithoutTrade}/${summary.sessions}` : "N/D"}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.note}>Total = variation du cours + dividendes nets enregistrés sur la période.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 7, padding: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg },
  title: { ...type.title, fontSize: 14 },
  detail: { ...type.caption, marginBottom: 4 },
  row: { flexDirection: "row", minHeight: 44, borderBottomColor: colors.line, borderBottomWidth: 1 },
  period: { width: 48, paddingHorizontal: 6, paddingVertical: 10, color: colors.ink, fontSize: 11, fontWeight: "800", fontVariant: tabular },
  cell: { width: 100, paddingHorizontal: 6, paddingVertical: 10, color: colors.ink2, fontSize: 10.5, fontWeight: "600", textAlign: "right", fontVariant: tabular },
  dates: { width: 184, textAlign: "left" },
  header: { color: colors.ink3, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  note: { ...type.caption, fontSize: 9.5, lineHeight: 14, marginTop: 4 },
});
