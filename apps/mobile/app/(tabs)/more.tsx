import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, Row, Section } from "../../src/components/ui";
import { useMobileAuth } from "../../src/providers/AuthProvider";
import { colors, radius, type } from "../../src/theme";

export default function MoreScreen() {
  const router = useRouter();
  const { loading, user } = useMobileAuth();
  return (
    <Page title="WARIBA" subtitle="Marché, compte et outils">
      {!loading && !user ? (
        <View style={styles.accountHero}>
          <Text style={styles.eyebrow}>VOTRE ESPACE</Text>
          <Text style={styles.heroTitle}>Retrouvez vos données sur tous vos appareils.</Text>
          <Text style={styles.heroDetail}>Le marché reste ouvert sans compte. Connectez-vous pour synchroniser watchlist, portefeuille et alertes.</Text>
          <View style={styles.authRow}>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/sign-in")} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>Se connecter</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/sign-up")} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Créer un compte</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <Section title="Suivi">
        <Row icon="funnel-outline" title="Screener" detail="Filtres, tris et recherches enregistrées" onPress={() => router.push("/screener")} />
        <Row icon="notifications-outline" title="Alertes" detail="Alertes factuelles et seuils de prix locaux" onPress={() => router.push("/alerts")} />
        <Row icon="cash-outline" title="Dividendes" detail="Saisonnalité et journal des versements nets" onPress={() => router.push("/dividends")} />
      </Section>
      <Section title="Marché">
        <Row icon="grid-outline" title="Carte du marché" detail="Treemap par liquidité, 8 horizons de performance" onPress={() => router.push("/map")} />
        <Row icon="rocket-outline" title="IPO & opérations" detail="Avis réels et pédagogie clairement séparés" onPress={() => router.push("/ipo")} />
      </Section>
      <Section title="Information">
        <Row icon="newspaper-outline" title="Actualités" detail="Articles sourcés liés aux valeurs de la cote" onPress={() => router.push("/news")} />
        <Row icon="document-text-outline" title="Documents" detail="Publications officielles BRVM" onPress={() => router.push("/documents")} />
      </Section>
      <Section title="Application">
        <Row icon="person-circle-outline" title={user ? "Mon compte" : "Compte"} detail={user?.email ?? "Connexion, synchronisation et forfait"} onPress={() => router.push("/account")} />
        <Row icon="settings-outline" title="Réglages" onPress={() => router.push("/settings")} />
        <Row icon="pulse-outline" title="État des données" onPress={() => router.push("/status")} />
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  accountHero: { gap: 10, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: "rgba(52,217,143,0.28)", backgroundColor: colors.accentSoft },
  eyebrow: { ...type.label, color: colors.accent, letterSpacing: 1.5 },
  heroTitle: { color: colors.ink, fontSize: 21, lineHeight: 26, fontWeight: "900", letterSpacing: -0.4 },
  heroDetail: { ...type.sub },
  authRow: { flexDirection: "row", gap: 9, marginTop: 4 },
  primary: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: colors.accent },
  primaryText: { color: colors.background, fontSize: 12.5, fontWeight: "900" },
  secondary: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  secondaryText: { color: colors.ink, fontSize: 12.5, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
