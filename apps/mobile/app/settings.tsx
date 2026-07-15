import { useEffect, useState, type ReactNode } from "react";
import { Alert, Linking, StyleSheet, Switch, Text, View } from "react-native";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { ActionButton, Page, Row, Section } from "../src/components/ui";
import { usePortfolioStore, usePriceAlertStore, useSettingsStore, useWatchlistStore, type ExperienceLevel } from "../src/stores";
import { disableNotifications, enableNotifications } from "../src/services/alerts";
import { parseBackupPayload } from "../src/lib/forms";
import { colors, radius, type } from "../src/theme";
import { useMobileAuth } from "../src/providers/AuthProvider";

/** Groupe de réglages façon iOS : lignes rassemblées dans une carte. */
function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Setting({ label, detail, value, onChange, disabled = false }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.setting}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.surface2, true: "rgba(226,166,61,0.45)" }}
        thumbColor={value ? colors.accent : colors.ink3}
      />
    </View>
  );
}

const LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: "debutant", label: "Débutant" },
  { id: "intermediaire", label: "Intermédiaire" },
  { id: "avance", label: "Avancé" },
];

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "https://wariba.app";

async function openTrustedUrl(path: string) {
  try {
    const url = new URL(path, SITE_URL);
    const localDevelopment = __DEV__ && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopment) throw new Error("scheme");
    if (!await Linking.canOpenURL(url.toString())) throw new Error("unsupported");
    await Linking.openURL(url.toString());
  } catch {
    Alert.alert("Lien indisponible", "Cette page ne peut pas être ouverte sur cet appareil.");
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useMobileAuth();
  const notifications = useSettingsStore((state) => state.notifications);
  const emailNotifications = useSettingsStore((state) => state.emailNotifications);
  const setEmailNotifications = useSettingsStore((state) => state.setEmailNotifications);
  const analyticsConsent = useSettingsStore((state) => state.analyticsConsent);
  const setAnalyticsConsent = useSettingsStore((state) => state.setAnalyticsConsent);
  const experienceLevel = useSettingsStore((state) => state.experienceLevel);
  const setExperienceLevel = useSettingsStore((state) => state.setExperienceLevel);
  const dataSaver = useSettingsStore((state) => state.dataSaver);
  const setDataSaver = useSettingsStore((state) => state.setDataSaver);
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    const controller = new AbortController();
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!baseUrl) return;
    void fetch(`${baseUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("preferences");
      const body = await response.json() as { profile?: { email_notifications?: boolean; analytics_consent?: boolean | null } };
      setEmailNotifications(body.profile?.email_notifications === true);
      if (typeof body.profile?.analytics_consent === "boolean") {
        setAnalyticsConsent(body.profile.analytics_consent ? "granted" : "denied");
      }
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        Alert.alert("Préférences indisponibles", "Vos réglages locaux restent actifs. Réessayez plus tard.");
      }
    });
    return () => controller.abort();
  }, [session?.access_token, setAnalyticsConsent, setEmailNotifications]);

  const updatePreference = async (payload: { emailNotifications?: boolean; analyticsConsent?: boolean }) => {
    const token = session?.access_token;
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!token || !baseUrl) throw new Error("Connexion requise");
    const response = await fetch(`${baseUrl}/api/v1/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Préférence non enregistrée");
  };

  const exportBackup = async () => {
    const payload = {
      app: "WARIBA",
      version: 1,
      exportedAt: new Date().toISOString(),
      watchlist: useWatchlistStore.getState().tickers,
      transactions: usePortfolioStore.getState().transactions,
      alerts: usePriceAlertStore.getState().rules,
    };
    const uri = `${FileSystem.cacheDirectory}wariba-backup.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json" });
  };

  const importBackup = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain"], copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets[0]) return;
      if (typeof picked.assets[0].size === "number" && picked.assets[0].size > 1_000_000) {
        Alert.alert("Import impossible", "La sauvegarde dépasse la limite de 1 Mo.");
        return;
      }
      const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const result = parseBackupPayload(raw);
      if ("error" in result) {
        Alert.alert("Import impossible", result.error);
        return;
      }
      const { payload, skipped } = result;
      const summary = [
        `${payload.watchlist.length} valeur${payload.watchlist.length > 1 ? "s" : ""} suivie${payload.watchlist.length > 1 ? "s" : ""}`,
        `${payload.transactions.length} transaction${payload.transactions.length > 1 ? "s" : ""}`,
        `${payload.alerts.length} alerte${payload.alerts.length > 1 ? "s" : ""}`,
      ].join(", ");
      Alert.alert(
        "Restaurer cette sauvegarde ?",
        `${summary}.${skipped ? `\n${skipped} entrée(s) invalide(s) ignorée(s).` : ""}\nLes données actuelles de cet appareil seront remplacées.`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Restaurer", style: "destructive",
            onPress: () => {
              useWatchlistStore.getState().replaceAll(payload.watchlist);
              usePortfolioStore.getState().replaceAll(payload.transactions);
              usePriceAlertStore.getState().replaceAll(payload.alerts);
            },
          },
        ]
      );
    } catch {
      Alert.alert("Import impossible", "Le fichier n'a pas pu être lu. Réessayez avec une sauvegarde WARIBA au format JSON.");
    }
  };

  const confirmClear = () => {
    Alert.alert("Effacer le portefeuille ?", "Toutes les transactions locales seront supprimées. Action irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: () => usePortfolioStore.getState().clear() },
    ]);
  };

  return (
    <Page subtitle="Préférences locales, compte, notifications et confidentialité">
      <View style={styles.identity}>
        <View style={styles.monogram}>
          <Text style={styles.monogramText}>W</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.identityName}>WARIBA</Text>
          <Text style={styles.identityVersion}>Version {version} · mode sombre permanent</Text>
        </View>
      </View>

      <Section title="Compte">
        <Group>
          <Row icon="person-circle-outline" title="Compte & synchronisation" detail="Connexion, données privées, forfait et suppression" onPress={() => router.push("/account")} />
        </Group>
      </Section>

      <Section title="Notifications">
        <Group>
          <Setting
            label="Alertes de prix push"
            detail={session ? "Envoi serveur après franchissement, avec vérification locale de secours hors connexion" : "Mode local sans compte : vérification à l'ouverture et lors des fenêtres système"}
            value={notifications}
            disabled={savingPreferences}
            onChange={(value) => {
              setSavingPreferences(true);
              void (value ? enableNotifications(session?.access_token) : disableNotifications(session?.access_token))
                .catch(() => Alert.alert("Notifications indisponibles", "Vérifiez l'autorisation système et la configuration de l'appareil."))
                .finally(() => setSavingPreferences(false));
            }}
          />
          <Setting
            label="Alertes par e-mail"
            detail={session ? "Envoi uniquement pour les seuils synchronisés avec le canal e-mail" : "Connexion requise"}
            value={emailNotifications}
            disabled={!session || savingPreferences}
            onChange={(value) => {
              setSavingPreferences(true);
              void updatePreference({ emailNotifications: value })
                .then(() => setEmailNotifications(value))
                .catch(() => Alert.alert("Réglage non enregistré", "Réessayez quand la connexion est disponible."))
                .finally(() => setSavingPreferences(false));
            }}
          />
        </Group>
      </Section>

      <Section title="Confidentialité">
        <Group>
          <Setting
            label="Mesure d'audience interne"
            detail="Événements fonctionnels pseudonymisés, sans publicité ni IP stockée, supprimés après 90 jours"
            value={analyticsConsent === "granted"}
            disabled={savingPreferences}
            onChange={(value) => {
              setSavingPreferences(true);
              const save = session ? updatePreference({ analyticsConsent: value }) : Promise.resolve();
              void save.then(() => setAnalyticsConsent(value ? "granted" : "denied"))
                .catch(() => Alert.alert("Consentement non enregistré", "Votre choix n'a pas été modifié."))
                .finally(() => setSavingPreferences(false));
            }}
          />
        </Group>
      </Section>

      <Section title="Expérience">
        <Group>
          <View style={styles.levelRow}>
            {LEVELS.map((level) => (
              <ActionButton
                key={level.id}
                label={level.label}
                active={experienceLevel === level.id}
                onPress={() => setExperienceLevel(level.id)}
              />
            ))}
          </View>
          <Text style={styles.levelHint}>
            Le mode débutant ajoute des explications simples (PER, PRU, rendement…) et
            un graphique épuré par défaut — sans jamais masquer de données.
          </Text>
        </Group>
      </Section>

      <Section title="Données">
        <Group>
          <Setting
            label="Économie de données"
            detail="Réduit les rafraîchissements automatiques en arrière-plan"
            value={dataSaver}
            onChange={setDataSaver}
          />
          <Row icon="pulse-outline" title="État des données" detail="Fraîcheur et couverture de chaque source" onPress={() => router.push("/status")} />
        </Group>
      </Section>

      <Section title="Sauvegarde locale">
        <Group>
          <Row icon="share-outline" title="Exporter une sauvegarde" detail="Watchlist, portefeuille et seuils au format JSON" onPress={() => void exportBackup()} />
          <Row icon="download-outline" title="Importer une sauvegarde" detail="Restaure un fichier JSON exporté depuis l'app ou le site" onPress={() => void importBackup()} />
          <Row icon="trash-outline" title="Effacer le portefeuille" detail="Supprime toutes les transactions de cet appareil" onPress={confirmClear} />
        </Group>
      </Section>

      <Section title="À propos">
        <Group>
          <Row icon="globe-outline" title="Site web WARIBA" detail="Mêmes données, même pipeline officiel BOC" onPress={() => void openTrustedUrl("/")} />
          <Row icon="shield-checkmark-outline" title="Confidentialité" detail="Données locales, compte et synchronisation" onPress={() => void openTrustedUrl("/privacy")} />
          <Row icon="document-text-outline" title="Conditions d'utilisation" detail="Cadre du service et abonnement" onPress={() => void openTrustedUrl("/terms")} />
          <Row icon="help-circle-outline" title="Support" detail="Aide et signalement d'un problème" onPress={() => void openTrustedUrl("/support")} />
        </Group>
      </Section>

      <Text style={styles.disclaimer}>
        WARIBA fournit des données et outils descriptifs à partir des publications officielles de la BRVM.
        Aucun contenu ne constitue un conseil en investissement ni une affiliation officielle à la BRVM.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  monogram: {
    width: 52, height: 52, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accentSoft, borderColor: "rgba(226,166,61,0.35)", borderWidth: 1, borderRadius: 14,
  },
  monogramText: { color: colors.accent, fontSize: 24, fontWeight: "800" },
  identityCopy: { flex: 1 },
  identityName: { color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  identityAccent: { color: colors.accent },
  identityVersion: { ...type.caption, marginTop: 3 },
  group: {
    paddingHorizontal: 14, paddingVertical: 2,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  setting: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  settingCopy: { flex: 1 },
  settingLabel: { ...type.body },
  settingDetail: { ...type.caption, marginTop: 3 },
  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 12, paddingBottom: 4 },
  levelHint: { ...type.caption, paddingBottom: 12, paddingTop: 6 },
  disclaimer: {
    ...type.caption, textAlign: "center", paddingHorizontal: 8,
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface, paddingVertical: 14,
  },
});
