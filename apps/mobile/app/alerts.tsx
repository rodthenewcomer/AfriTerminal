import { useState } from "react";
import { Alert as NativeAlert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { EmptyState, Page, Section, SegmentedTabs } from "../src/components/ui";
import { AlertRow } from "../src/components/AlertRow";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { usePriceAlertStore, useSettingsStore, type PriceAlertRule } from "../src/stores";
import { disableNotifications, enableNotifications, evaluatePriceAlerts } from "../src/services/alerts";
import { parseAmount } from "../src/lib/forms";
import { colors, radius, tabular, type } from "../src/theme";
import { useMobileAuth } from "../src/providers/AuthProvider";
import { uploadMobileData } from "../src/services/cloud-sync";
import { trackMobileEvent } from "../src/services/analytics";

function RuleRow({ rule, onRemove, onRearm }: { rule: PriceAlertRule; onRemove: () => void; onRearm: () => void }) {
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
          {rule.triggeredAt ? `Déclenchée le ${rule.triggeredAt.slice(0, 10)} — inactive, réarmez-la pour surveiller à nouveau` : "En attente du prochain cours officiel"}
        </Text>
        <Text style={styles.ruleDetail}>
          Canaux : {(rule.channels ?? ["in_app"]).map((channel) => channel === "in_app" ? "app" : channel).join(", ")}
        </Text>
      </View>
      {rule.triggeredAt ? (
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Réarmer l'alerte ${rule.ticker}`}
          onPress={onRearm}
          style={({ pressed }) => [styles.ruleDelete, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="refresh-outline" size={17} color={colors.accent} />
        </Pressable>
      ) : null}
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Supprimer l'alerte ${rule.ticker}`}
        onPress={onRemove}
        style={({ pressed }) => [styles.ruleDelete, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="trash-outline" size={17} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

export default function AlertsScreen() {
  const { session } = useMobileAuth();
  const market = useMarketData();
  const params = useLocalSearchParams<{ ticker?: string }>();
  const rules = usePriceAlertStore((state) => state.rules);
  const add = usePriceAlertStore((state) => state.add);
  const remove = usePriceAlertStore((state) => state.remove);
  const rearm = usePriceAlertStore((state) => state.rearm);
  const notifications = useSettingsStore((state) => state.notifications);
  const emailNotifications = useSettingsStore((state) => state.emailNotifications);
  const [ticker, setTicker] = useState(typeof params.ticker === "string" && params.ticker ? params.ticker.toUpperCase() : "SNTS");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const quote = market.quotes[ticker.toUpperCase()];
  const parsedTarget = parseAmount(target);
  const formError = !ticker.trim()
    ? "Saisissez un ticker."
    : !quote
      ? `Ticker inconnu : ${ticker.toUpperCase()}.`
      : target && parsedTarget === null
        ? "Le seuil doit être un montant positif en FCFA."
        : null;
  const canSubmit = Boolean(quote && parsedTarget !== null);

  const syncNow = async () => {
    if (session?.access_token) await uploadMobileData(session.access_token);
  };

  const submit = async () => {
    if (!quote || parsedTarget === null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const channels: ("in_app" | "push" | "email")[] = ["in_app"];
    if (notifications && session) channels.push("push");
    if (emailNotifications && session) channels.push("email");
    add({ id: `${Date.now()}`, ticker: ticker.toUpperCase(), target: parsedTarget, direction, enabled: true, channels });
    try {
      await syncNow();
    } catch {
      NativeAlert.alert("Alerte créée localement", "La synchronisation a échoué. Relancez-la depuis Compte quand le réseau revient.");
    }
    void trackMobileEvent("alert_create", { ticker: ticker.toUpperCase(), push: channels.includes("push"), email: channels.includes("email") }, "/alerts");
    setTarget("");
  };

  return (
    <Page
      subtitle="Seuils évalués contre le dernier cours officiel, localement et par le serveur pour les comptes synchronisés"
      refreshing={market.refreshing}
      onRefresh={() => void market.refresh().then(() => evaluatePriceAlerts(market.quotes))}
    >
      <View style={styles.permission}>
        <View style={styles.permissionCopy}>
          <Text style={styles.permissionTitle}>Notifications de prix</Text>
          <Text style={styles.permissionDetail}>
            {session ? "Push serveur sur cet appareil ; les seuils sont synchronisés à leur création." : "Sans compte, vérification locale uniquement."}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Activer les notifications locales"
          value={notifications}
          onValueChange={(value) => void (value ? enableNotifications(session?.access_token) : disableNotifications(session?.access_token))}
          trackColor={{ false: colors.surface2, true: "rgba(226,166,61,0.45)" }}
          thumbColor={notifications ? colors.accent : colors.ink3}
        />
      </View>

      <Section title="Créer un seuil" detail={quote ? `${ticker.toUpperCase()} · dernier cours ${quote.lastClose.toLocaleString("fr-FR")} FCFA` : "Ticker inconnu"}>
        <View style={styles.form}>
          <View style={styles.formRow}>
            <View style={[styles.field, { flex: 0.7 }]}>
              <Text style={styles.inputLabel}>Ticker</Text>
              <TextInput accessibilityLabel="Ticker de l'alerte" value={ticker} onChangeText={setTicker} placeholder="Ex. SNTS" placeholderTextColor={colors.ink3} autoCapitalize="characters" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Seuil (FCFA)</Text>
              <TextInput accessibilityLabel="Seuil de prix en FCFA" value={target} onChangeText={setTarget} placeholder="Ex. 32 000" placeholderTextColor={colors.ink3} keyboardType="decimal-pad" style={styles.input} />
            </View>
          </View>
          {formError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.formError}>{formError}</Text> : null}
          <SegmentedTabs
            tabs={[{ id: "above", label: "Au-dessus" }, { id: "below", label: "En dessous" }] as const}
            active={direction}
            onChange={setDirection}
          />
          <Text style={styles.channelHint}>
            Canaux : app{notifications && session ? ", push" : ""}{emailNotifications && session ? ", e-mail" : ""}. Modifiables dans Réglages.
          </Text>
          <Pressable disabled={!canSubmit} accessibilityRole="button" accessibilityLabel="Créer l'alerte de prix" accessibilityState={{ disabled: !canSubmit }} onPress={() => void submit()} style={({ pressed }) => [styles.submit, !canSubmit && styles.submitDisabled, pressed && { opacity: 0.75 }]}>
            <Ionicons name="notifications-outline" size={16} color={colors.background} />
            <Text style={styles.submitText}>Créer l'alerte</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Mes seuils" detail={rules.length ? `${rules.length} actif${rules.length > 1 ? "s" : ""}` : undefined}>
        {rules.length
          ? rules.map((rule) => <RuleRow key={rule.id} rule={rule} onRemove={() => { remove(rule.id); void syncNow().catch(() => undefined); }} onRearm={() => { rearm(rule.id); void syncNow().catch(() => undefined); }} />)
          : <EmptyState icon="notifications-off-outline" title="Aucun seuil" detail="Créez une alerte de prix locale — elle reste sur cet appareil." />}
      </Section>

      <Section title="Alertes factuelles" detail={`${market.alerts.length} calculées sur la dernière séance`}>
        {market.alerts.length
          ? market.alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
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
  field: { flex: 1, gap: 6 },
  inputLabel: { ...type.label, color: colors.ink2 },
  input: {
    flex: 1, height: 46, color: colors.ink, fontSize: 13.5, fontVariant: tabular,
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 13,
  },
  submit: {
    minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: colors.accent, borderRadius: radius.md,
  },
  submitDisabled: { opacity: 0.45 },
  formError: { color: colors.down, fontSize: 12, lineHeight: 16 },
  channelHint: { ...type.caption },
  submitText: { color: colors.background, fontSize: 14, fontWeight: "800" },
  rule: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  ruleIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  ruleCopy: { flex: 1 },
  ruleTitle: { ...type.body, fontVariant: tabular },
  ruleDetail: { ...type.caption, marginTop: 3 },
  ruleDelete: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surface2 },
});
