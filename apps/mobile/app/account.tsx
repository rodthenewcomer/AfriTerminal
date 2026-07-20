import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Page, Row, Section } from "../src/components/ui";
import { useMobileAuth } from "../src/providers/AuthProvider";
import {
  isNativeBillingConfigured,
  loadNativePackages,
  manageNativeSubscription,
  purchaseNativePackage,
  restoreNativePurchases,
  type NativeBillingPackage,
} from "../src/services/native-billing";
import { colors, radius, type } from "../src/theme";

interface AccountData {
  profile: { display_name: string | null };
  subscription: { provider: "stripe" | "apple" | "google"; plan: "free" | "pro" | "team"; status: string; current_period_end: string | null };
}

export default function AccountScreen() {
  const router = useRouter();
  const { configured, loading, user, session, signOut, syncStatus, lastSyncedAt, syncError, syncNow } = useMobileAuth();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [packages, setPackages] = useState<NativeBillingPackage[]>([]);
  const [billingError, setBillingError] = useState<string | null>(null);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!session?.access_token) throw new Error("Session requise");
    const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) throw new Error("Serveur WARIBA non configuré");
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${session.access_token}`, ...init?.headers },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Service indisponible");
    return body;
  }, [session?.access_token]);

  const refreshAccount = useCallback(async () => setAccount(await request("/api/v1/me")), [request]);

  useEffect(() => {
    if (!user) return;
    void refreshAccount().catch(() => undefined);
    if (!isNativeBillingConfigured()) return;
    setBusy("offerings");
    void loadNativePackages(user.id)
      .then(setPackages)
      .catch((caught) => setBillingError(caught instanceof Error ? caught.message : "Offres indisponibles"))
      .finally(() => setBusy((value) => value === "offerings" ? null : value));
  }, [refreshAccount, user]);

  const purchase = async (item: NativeBillingPackage) => {
    setBusy(`purchase:${item.identifier}`);
    setBillingError(null);
    try {
      const active = await purchaseNativePackage(item);
      if (!active) return;
      Alert.alert("WARIBA Pro activé", "Votre achat est reconnu sur vos appareils connectés à ce compte.");
      await request("/api/v1/billing/native/refresh", { method: "POST" });
      await refreshAccount();
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Achat impossible");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    setBillingError(null);
    try {
      const active = await restoreNativePurchases();
      if (!active) {
        Alert.alert("Aucun achat actif", "Aucun abonnement Pro actif n'a été trouvé pour ce compte store.");
        return;
      }
      await request("/api/v1/billing/native/refresh", { method: "POST" });
      await refreshAccount();
      Alert.alert("Achats restaurés", "Votre accès Pro est à jour.");
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Restauration impossible");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    if (!session?.access_token) return;
    setBusy("sync");
    try {
      await syncNow();
      Alert.alert("Synchronisation terminée", "Les changements de vos appareils ont été réconciliés sans remplacement destructif.");
    } catch (caught) {
      Alert.alert("Synchronisation impossible", caught instanceof Error ? caught.message : "Réessayez plus tard.");
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = () => {
    const storeWarning = account?.subscription.provider === "apple" || account?.subscription.provider === "google"
      ? " L'abonnement store doit être résilié séparément dans vos abonnements Apple ou Google."
      : "";
    Alert.alert("Supprimer définitivement le compte ?", `Les données personnelles cloud seront supprimées et retirées de cet appareil.${storeWarning}`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        setBusy("delete");
        try {
          await request("/api/v1/account", { method: "DELETE", headers: { "X-Confirm-Account-Deletion": "delete" } });
          await signOut();
          router.replace("/(tabs)");
        } catch (caught) {
          Alert.alert("Suppression impossible", caught instanceof Error ? caught.message : "Réessayez plus tard.");
          setBusy(null);
        }
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={styles.caption}>Chargement du compte…</Text></View>;
  if (!configured) return <Page><Text style={styles.notice}>La connexion est temporairement indisponible. Les données publiques de marché restent accessibles.</Text></Page>;
  if (!user) return <Page><View style={styles.hero}><Text style={styles.eyebrow}>ESPACE PERSONNEL GRATUIT</Text><Text style={styles.title}>Vos actions, votre portefeuille et vos alertes partout avec vous.</Text><Text style={styles.caption}>La cote reste publique. Le compte protège et synchronise vos données personnelles entre le web, iPhone et Android.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/sign-up")} style={styles.primary}><Text style={styles.primaryText}>Créer mon compte gratuit</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/sign-in")} style={styles.secondary}><Text style={styles.secondaryText}>Se connecter</Text></Pressable></View></Page>;

  return (
    <Page subtitle="Identité, synchronisation et forfait">
      <Section title="Compte">
        <View style={styles.group}>
          <Row icon="person-circle-outline" title={account?.profile.display_name || user.email || "Compte WARIBA"} detail={user.email ?? undefined} />
          <Row icon="log-out-outline" title="Se déconnecter" onPress={() => void signOut().then(() => router.replace("/(tabs)"))} />
        </View>
      </Section>
      <Section title="Synchronisation" detail="Automatique · web, iOS et Android">
        <View style={styles.group}>
          <Row icon="sync-outline" title="Synchroniser maintenant" detail="Fusionne watchlist, portefeuille, alertes, filtres et préférences" onPress={() => void sync()} />
          <Row icon={syncStatus === "error" ? "cloud-offline-outline" : "cloud-done-outline"} title={syncStatus === "syncing" ? "Synchronisation en cours…" : syncStatus === "error" ? "Synchronisation à reprendre" : "Synchronisation active"} detail={lastSyncedAt ? `Dernière réussite à ${new Date(lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : syncError ?? "Le compte cloud est la source de référence"} />
        </View>
        {busy === "sync" || syncStatus === "syncing" ? <ActivityIndicator style={styles.activity} color={colors.accent} /> : null}
        {syncError ? <Text accessibilityRole="alert" style={styles.billingError}>{syncError}</Text> : null}
      </Section>
      <Section title="Forfait">
        <View style={styles.plan}><View><Text style={styles.planName}>{account?.subscription.plan === "pro" ? "Pro" : "Essentiel"}</Text><Text style={styles.caption}>Statut : {account?.subscription.status ?? "chargement"}</Text></View><Text style={styles.planBadge}>{account?.subscription.plan === "pro" ? "Actif" : "Gratuit"}</Text></View>
        {account?.subscription.plan === "pro" && account.subscription.provider !== "stripe" ? <Pressable accessibilityRole="button" onPress={() => void manageNativeSubscription()} style={[styles.secondary, styles.storeAction]}><Text style={styles.secondaryText}>Gérer l'abonnement store</Text></Pressable> : null}
        {account?.subscription.plan !== "pro" && isNativeBillingConfigured() ? <View style={styles.offers}>
          {busy === "offerings" ? <ActivityIndicator color={colors.accent} /> : packages.map((item) => <Pressable key={item.identifier} accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void purchase(item)} style={({ pressed }) => [styles.offer, pressed && { opacity: 0.75 }]}><View style={styles.offerCopy}><Text style={styles.offerTitle}>{item.product.title}</Text><Text style={styles.caption}>{item.product.description}</Text></View><Text style={styles.offerPrice}>{item.product.priceString}</Text></Pressable>)}
          <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void restore()} style={styles.secondary}><Text style={styles.secondaryText}>{busy === "restore" ? "Restauration…" : "Restaurer mes achats"}</Text></Pressable>
        </View> : null}
      {!isNativeBillingConfigured() ? <Text style={styles.storeNote}>L’activation Pro n’est pas encore disponible sur ce canal.</Text> : packages.length === 0 && busy !== "offerings" && account?.subscription.plan !== "pro" ? <Text style={styles.storeNote}>L’offre Pro est temporairement indisponible.</Text> : null}
        {billingError ? <Text accessibilityRole="alert" style={styles.billingError}>{billingError}</Text> : null}
      </Section>
      <Section title="Suppression">
        <Pressable accessibilityRole="button" accessibilityLabel="Supprimer définitivement le compte" disabled={Boolean(busy)} onPress={deleteAccount} style={({ pressed }) => [styles.danger, pressed && { opacity: 0.7 }]}><Text style={styles.dangerText}>{busy === "delete" ? "Suppression…" : "Supprimer définitivement le compte"}</Text></Pressable>
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.background },
  hero: { gap: 12, padding: 18, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  eyebrow: { ...type.label, color: colors.accent }, title: { ...type.title, fontSize: 22 }, caption: { ...type.caption },
  notice: { ...type.sub, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  primary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.accent, marginTop: 8 },
  primaryText: { color: colors.onAccent, fontWeight: "800" },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong },
  secondaryText: { color: colors.ink, fontWeight: "700" },
  group: { paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg },
  activity: { marginTop: 10 },
  plan: { minHeight: 74, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentSoft },
  planName: { ...type.title, textTransform: "capitalize" }, planBadge: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  offers: { gap: 10, marginTop: 12 },
  offer: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  offerCopy: { flex: 1, gap: 2 }, offerTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, offerPrice: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  storeNote: { ...type.caption, marginTop: 10, paddingHorizontal: 4 },
  storeAction: { marginTop: 12 },
  billingError: { color: colors.down, fontSize: 12, lineHeight: 17, marginTop: 10 },
  danger: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", backgroundColor: colors.downSoft },
  dangerText: { color: colors.down, fontSize: 13, fontWeight: "800" },
});
