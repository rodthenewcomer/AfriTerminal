import { Ionicons } from "@expo/vector-icons";
import { dateFr } from "@wariba/core/format";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionButton, EmptyState, Page, Row, Section } from "../src/components/ui";
import { openTrustedExternalUrl } from "../src/lib/external-links";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius, type } from "../src/theme";

type Tab = "publications" | "avis" | "capital" | "comprendre";

const TABS: { id: Tab; label: string }[] = [
  { id: "publications", label: "Publications" },
  { id: "avis", label: "Avis marché" },
  { id: "capital", label: "Capital" },
  { id: "comprendre", label: "Comprendre" },
];

const CONCEPTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  {
    icon: "rocket-outline",
    title: "Introduction en bourse (IPO)",
    text: "Une société ouvre son capital au public. WARIBA n’affiche une opération que lorsqu’un avis officiel est disponible.",
  },
  {
    icon: "trending-up-outline",
    title: "Augmentation de capital",
    text: "De nouvelles actions sont émises. Un actionnaire peut être dilué s’il ne participe pas selon les conditions de l’avis.",
  },
  {
    icon: "git-branch-outline",
    title: "Division du nominal (split)",
    text: "Le nombre d’actions augmente et le cours de référence baisse proportionnellement ; la valeur économique ne change pas mécaniquement.",
  },
  {
    icon: "document-text-outline",
    title: "Publication financière",
    text: "Résultats, états financiers et communiqués servent de source aux fondamentaux. Ouvrez toujours le PDF avant une décision.",
  },
];

export default function OperationsScreen() {
  const market = useMarketData();
  const [tab, setTab] = useState<Tab>("publications");
  const [limit, setLimit] = useState(40);
  const documents = market.documents.slice(0, limit);
  const notices = market.operations.avis ?? [];
  const operations = market.operations.operations ?? [];

  return (
    <Page title="Opérations & documents" subtitle="Une seule source pour les publications, avis et opérations officielles">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((item) => (
          <ActionButton key={item.id} label={item.label} active={tab === item.id} onPress={() => setTab(item.id)} />
        ))}
      </ScrollView>

      {tab === "publications" ? (
        <Section title="Publications officielles" detail={`${documents.length} sur ${market.documents.length}`}>
          {documents.length ? documents.map((item) => (
            <Row
              key={item.url}
              icon="document-text-outline"
              title={`${item.ticker} · ${item.title}`}
              detail={`${item.type} · ${dateFr(item.date)}`}
              onPress={() => void openTrustedExternalUrl(item.url)}
            />
          )) : <EmptyState icon="document-text-outline" title="Aucune publication" detail="Les publications apparaîtront ici après collecte et validation de leur source." />}
          {limit < market.documents.length ? (
            <View style={styles.more}>
              <ActionButton label="Afficher 40 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 40)} />
            </View>
          ) : null}
        </Section>
      ) : null}

      {tab === "avis" ? (
        <Section title="Avis de marché" detail={`${notices.length} avis officiels`}>
          {notices.length ? notices.map((item, index) => (
            <Row
              key={`${item.pdf}-${index}`}
              icon="document-attach-outline"
              title={item.title}
              detail={item.date ? dateFr(item.date) : "Date non précisée"}
              onPress={() => void openTrustedExternalUrl(item.pdf)}
            />
          )) : <EmptyState icon="document-attach-outline" title="Aucun avis" detail="Aucun avis officiel n’est présent dans les données collectées." />}
        </Section>
      ) : null}

      {tab === "capital" ? (
        <Section title="Opérations sur capital" detail={`${operations.length} opérations sourcées`}>
          {operations.length ? operations.map((item, index) => (
            <Row
              key={`${item.issuer}-${item.kind}-${index}`}
              icon="git-branch-outline"
              title={`${item.ticker ? `${item.ticker} · ` : ""}${item.kind}`}
              detail={[item.issuer, item.date ? dateFr(item.date) : null, item.parity].filter(Boolean).join(" · ")}
              onPress={item.avisPdf ? () => void openTrustedExternalUrl(item.avisPdf as string) : undefined}
            />
          )) : <EmptyState icon="git-branch-outline" title="Aucune opération" detail="Aucune opération sur capital sourcée n’est disponible." />}
        </Section>
      ) : null}

      {tab === "comprendre" ? (
        <Section title="Comprendre avant d’agir" detail="Pédagogie, jamais une recommandation">
          {CONCEPTS.map((concept) => (
            <View key={concept.title} style={styles.concept}>
              <View style={styles.conceptIcon}>
                <Ionicons name={concept.icon} size={18} color={colors.accent} />
              </View>
              <View style={styles.conceptCopy}>
                <Text style={styles.conceptTitle}>{concept.title}</Text>
                <Text style={styles.conceptText}>{concept.text}</Text>
              </View>
            </View>
          ))}
        </Section>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 7, paddingRight: 18 },
  more: { alignSelf: "center", marginTop: 14 },
  concept: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  conceptIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  conceptCopy: { flex: 1 },
  conceptTitle: { ...type.body },
  conceptText: { ...type.caption, lineHeight: 17, marginTop: 4 },
});
