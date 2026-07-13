import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { EmptyState, Page, Row, Section, SegmentedTabs } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { usePriceAlertStore, useSettingsStore, type PriceAlertRule } from "../src/stores";
import { disableNotifications, enableNotifications, evaluatePriceAlerts } from "../src/services/alerts";
import { colors, radius, tabular, type } from "../src/theme";

function RuleRow({ rule, onRemove }: { rule: PriceAlertRule; onRemove: () => void }) {
  const above = rule.direction === "above";
  return (
    <View style={styles.rule}>
      <View style={[styles.ruleIcon, { backgroundColor: above ? colors.upSoft : colors.downSoft }]}>
        <Ionicons name={above ? "trending-up" : "trending-down"} size={16} color={above ? colors.up : colors.down} />
      </View>
      <View style={styles.ruleCopy}>
        <Text style={styles.ruleTitle}>
          {rule.ticker} {above ? "≥" : "≤"} {rule.target.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={styles.ruleDetail}>
          {rule.triggeredAt ? `Déclenchée le ${rule.triggeredAt.slice(0, 10)}` : "En attente du prochain cours officiel"}
        </Text>
      </View>
      <Pressable hitSlop={8} onPress={onRemove} style={({ pressed }) => [styles.ruleDelete, pressed && { opacity: 0.6 }]}>
        <Ionicons name="trash-outline" size={17} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

export default function AlertsScreen() {
  const market = useMarketData();
  const params = useLocalSearchParams<{ ticker?: string }>();
  const rules = usePriceAlertStore((state) => state.rules);
  const add = usePriceAlertStore((state) => state.add);
  const remove = usePriceAlertStore((state) => state.remove);
  const notifications = useSettingsStore((state) => state.notifications);
  const [ticker, setTicker] = useState(typeof params.ticker === "string" && params.ticker ? params.ticker.toUpperCase() : "SNTS");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const quote = market.quotes[ticker.toUpperCase()];

  const submit = () => {
    const parsed = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!quote || parsed <= 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    add({ id: `${Date.now()}`, ticker: ticker.toUpperCase(), target: parsed, direction, enabled: true });
    setTarget("");
  };

  return (
    <Page
      subtitle="Seuils évalués contre le dernier cours officiel — à l'ouverture, au rafraîchissement et lors des fenêtres système"
      refreshing={market.refreshing}
      onRefresh={() => void market.refresh().then(() => evaluatePriceAlerts(market.quotes))}
    >
      <View style={styles.permission}>
        <View style={styles.permissionCopy}>
          <Text style={styles.permissionTitle}>Notifications locales</Text>
          <Text style={styles.permissionDetail}>
            Sans serveur, une app totalement arrêtée ne reçoit pas de push temps réel.
          </Text>
        </View>
        <Switch
          value={notifications}
          onValueChange={(value) => void (value ? enableNotifications() : disableNotifications())}
          trackColor={{ false: colors.surface2, true: "rgba(226,166,61,0.45)" }}
          thumbColor={notifications ? colors.accent : colors.ink3}
        />
      </View>

      <Section title="Créer un seuil" detail={quote ? `${ticker.toUpperCase()} · dernier cours ${quote.lastClose.toLocaleString("fr-FR")} FCFA` : "Ticker inconnu"}>
        <View style={styles.form}>
          <View style={styles.formRow}>
            <TextInput
              value={ticker}
              onChangeText={setTicker}
              placeholder="Ticker"
              placeholderTextColor={colors.ink3}
              autoCapitalize="characters"
              style={[styles.input, { flex: 0.7 }]}
            />
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="Prix seuil (FCFA)"
              placeholderTextColor={colors.ink3}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
          <SegmentedTabs
            tabs={[{ id: "above", label: "Au-dessus" }, { id: "below", label: "En dessous" }] as const}
            active={direction}
            onChange={setDirection}
          />
          <Pressable onPress={submit} style={({ pressed }) => [styles.submit, (!quote || !target) && styles.submitDisabled, pressed && { opacity: 0.75 }]}>
            <Ionicons name="notifications-outline" size={16} color={colors.background} />
            <Text style={styles.submitText}>Créer l'alerte</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Mes seuils" detail={rules.length ? `${rules.length} actif${rules.length > 1 ? "s" : ""}` : undefined}>
        {rules.length
          ? rules.map((rule) => <RuleRow key={rule.id} rule={rule} onRemove={() => remove(rule.id)} />)
          : <EmptyState icon="notifications-off-outline" title="Aucun seuil" detail="Créez une alerte de prix locale — elle reste sur cet appareil." />}
      </Section>

      <Section title="Alertes factuelles" detail={`${market.alerts.length} calculées sur la dernière séance`}>
        {market.alerts.length
          ? market.alerts.map((alert) => <Row key={alert.id} icon="pulse-outline" title={alert.title} detail={alert.detail} />)
          : <EmptyState icon="pulse-outline" title="Rien à signaler" detail="Aucun fait notable sur la dernière séance." />}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  permission: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  permissionCopy: { flex: 1 },
  permissionTitle: { ...type.body },
  permissionDetail: { ...type.caption, marginTop: 3 },
  form: {
    padding: 14, gap: 12,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  formRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1, height: 46, color: colors.ink, fontSize: 13.5, fontVariant: tabular,
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 13,
  },
  submit: {
    minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: colors.accent, borderRadius: radius.md,
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: colors.background, fontSize: 14, fontWeight: "800" },
  rule: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  ruleIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  ruleCopy: { flex: 1 },
  ruleTitle: { ...type.body, fontVariant: tabular },
  ruleDetail: { ...type.caption, marginTop: 3 },
  ruleDelete: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface2 },
});
