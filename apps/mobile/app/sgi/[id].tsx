import { getSgi } from "@wariba/core/sgi";
import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { ActionButton, EmptyState, Page, Row, Section } from "../../src/components/ui";
import { openTrustedExternalUrl } from "../../src/lib/external-links";
import { colors, radius, type } from "../../src/theme";

export default function SgiDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sgi = getSgi(String(params.id ?? ""));
  if (!sgi) return <Page><EmptyState title="SGI introuvable" detail="Cette fiche n’existe pas dans l’annuaire vérifié." /></Page>;

  const openPhone = async (phone: string) => {
    const safe = phone.replace(/[^\d+]/g, "");
    if (!safe) return;
    if (!await Linking.canOpenURL(`tel:${safe}`)) {
      Alert.alert("Appel indisponible", phone);
      return;
    }
    await Linking.openURL(`tel:${safe}`);
  };
  const openEmail = async (email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await Linking.openURL(`mailto:${email}`);
  };

  return (
    <Page title={sgi.shortName} subtitle={sgi.verifiedRole}>
      <Stack.Screen options={{ title: sgi.shortName }} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>SOURCE VÉRIFIÉE</Text>
        <Text style={styles.name}>{sgi.name}</Text>
        <Text style={styles.meta}>Annuaire BRVM contrôlé le {sgi.verifiedOn} · Côte d’Ivoire</Text>
      </View>
      <Section title="Coordonnées officielles">
        <Row icon="location-outline" title="Adresse" detail={sgi.address} />
        {sgi.phones.map((phone) => <Row key={phone} icon="call-outline" title={phone} detail="Appeler la SGI" onPress={() => void openPhone(phone)} />)}
        {sgi.email ? <Row icon="mail-outline" title={sgi.email} detail="Écrire à la SGI" onPress={() => void openEmail(sgi.email as string)} /> : null}
        <Row icon="shield-checkmark-outline" title="Vérifier dans l’annuaire BRVM" detail="Source primaire officielle" onPress={() => void openTrustedExternalUrl(sgi.officialDirectoryUrl)} />
      </Section>
      <Section title="À demander avant toute ouverture" detail="Informations non publiées par l’annuaire BRVM">
        {sgi.unknowns.map((unknown) => <Row key={unknown} icon="help-circle-outline" title={unknown} detail="À confirmer directement auprès de la SGI" />)}
      </Section>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>WARIBA ne recommande pas cette SGI.</Text>
        <Text style={styles.warningText}>Comparez la grille tarifaire écrite, le dépôt minimum, les canaux d’ordre, les délais et les conditions de retrait avant de signer.</Text>
      </View>
      {sgi.website ? (
        <ActionButton
          label="Site déclaré dans l’annuaire"
          icon="globe-outline"
          onPress={() => Alert.alert("Lien déclaré", sgi.website ?? "", [
            { text: "Annuler", style: "cancel" },
            { text: "Ouvrir", onPress: () => void Linking.openURL(sgi.website as string) },
          ])}
        />
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 18, gap: 6, borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(32,201,130,0.35)", backgroundColor: colors.accentSoft },
  eyebrow: { ...type.label, color: colors.accent },
  name: { color: colors.ink, fontSize: 22, lineHeight: 27, fontWeight: "900" },
  meta: { ...type.caption },
  warning: { padding: 15, gap: 5, borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(251,146,60,0.35)", backgroundColor: "rgba(251,146,60,0.08)" },
  warningTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  warningText: { ...type.caption, lineHeight: 17 },
});
