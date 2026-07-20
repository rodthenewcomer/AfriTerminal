import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AlertItem } from "@wariba/core/types";
import { explainAlert } from "@wariba/core/alerts";
import { colors, radius, type } from "../theme";

/** Couleur et icône par sévérité — lecture « Stock Monitor » de Webull. */
const SEVERITY: Record<AlertItem["severity"], { color: string; soft: string; icon: keyof typeof Ionicons.glyphMap }> = {
  positive: { color: colors.up, soft: colors.upSoft, icon: "trending-up" },
  critical: { color: colors.down, soft: colors.downSoft, icon: "trending-down" },
  warning: { color: colors.warn, soft: "rgba(251,146,60,0.14)", icon: "alert-circle-outline" },
  info: { color: colors.ink2 as string, soft: colors.surface2 as string, icon: "information-circle-outline" },
};

export function AlertRow({
  alert,
  onPress,
  context,
  onHideType,
}: {
  alert: AlertItem;
  onPress?: () => void;
  context?: string;
  onHideType?: () => void;
}) {
  const look = SEVERITY[alert.severity] ?? SEVERITY.info;
  const explanation = explainAlert(alert);
  return (
    <Pressable onPress={onPress} disabled={!onPress && !onHideType} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={[styles.icon, { backgroundColor: look.soft }]}>
        <Ionicons name={look.icon} size={16} color={look.color} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          {alert.ticker ? <Text style={styles.ticker}>{alert.ticker}</Text> : null}
          <Text style={[styles.kind, { color: look.color }]}>{explanation.importance} · {alert.type}</Text>
          {context ? <Text style={styles.context}>{context}</Text> : null}
        </View>
        <Text numberOfLines={2} style={styles.title}>{alert.title}</Text>
        <Text numberOfLines={2} style={styles.detail}>{alert.detail}</Text>
        <Text style={styles.explanation}><Text style={styles.explanationLabel}>Pourquoi : </Text>{explanation.reason}</Text>
        <Text style={styles.explanation}><Text style={styles.explanationLabel}>Conséquence possible : </Text>{explanation.possibleConsequence}</Text>
        <View style={styles.actions}>
          {alert.sourceUrl ? <Text style={styles.source}>Document source disponible</Text> : null}
          {onHideType ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Masquer les alertes ${alert.type}`}
              onPress={(event) => {
                event.stopPropagation();
                onHideType();
              }}
              hitSlop={8}
            >
              <Text style={styles.hide}>Masquer ce type</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={15} color={colors.ink3} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 11 },
  icon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ticker: { color: colors.ink, fontSize: 12.5, fontWeight: "800", letterSpacing: 0.2 },
  kind: { fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  context: { color: colors.accent, fontSize: 9.5, fontWeight: "700", textTransform: "uppercase" },
  title: { ...type.body, fontSize: 13.5, marginTop: 3 },
  detail: { ...type.caption, marginTop: 2 },
  explanation: { ...type.caption, fontSize: 10.5, lineHeight: 15, marginTop: 5 },
  explanationLabel: { color: colors.ink2, fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 7 },
  source: { color: colors.accent, fontSize: 10.5, fontWeight: "700" },
  hide: { color: colors.ink3, fontSize: 10.5, textDecorationLine: "underline" },
});
