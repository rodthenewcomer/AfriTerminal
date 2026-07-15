import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dateFr } from "@wariba/core/format";
import { EmptyState, Page, Row, Section, SegmentedTabs } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius, type } from "../src/theme";
import { openTrustedExternalUrl } from "../src/lib/external-links";

type Tab = "avis" | "operations";

const CONCEPTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  {
    icon: "rocket-outline",
    title: "Introduction en bourse (IPO)",
    text: "Une société ouvre son capital au public : un prix d'introduction est fixé, puis le titre cote librement à la BRVM.",
  },
  {
    icon: "trending-up-outline",
    title: "Augmentation de capital",
    text: "De nouvelles actions sont émises. Le nombre de titres augmente, la participation existante est diluée sauf exercice du droit préférentiel.",
  },
  {
    icon: "git-branch-outline",
    title: "Division du nominal (split)",
    text: "Chaque action est divisée en plusieurs : le cours de référence est ajusté d'autant, la valeur de la position ne change pas.",
  },
];

export default function IpoScreen() {
  const market = useMarketData();
  const [tab, setTab] = useState<Tab>("avis");
  const notices = market.operations.avis ?? [];
  const operations = market.operations.operations ?? [];
  const count = tab === "avis" ? notices.length : operations.length;

  return (
    <Page subtitle="Avis officiels BRVM — la pédagogie est clairement séparée et ne décrit aucune opération à venir">
      <SegmentedTabs
        tabs={[{ id: "avis", label: "Avis BRVM" }, { id: "operations", label: "Opérations" }] as const}
        active={tab}
        onChange={setTab}
      />
      <Section title={tab === "avis" ? "Avis publiés" : "Opérations sur capital"} detail={`${count} publication${count > 1 ? "s" : ""}`}>
        {tab === "avis" && notices.length
          ? notices.map((item, index) => (
            <Row
              key={`${item.pdf}-${index}`}
              icon="document-attach-outline"
              title={item.title}
              detail={item.date ? dateFr(item.date) : "Date non précisée"}
              onPress={() => void openTrustedExternalUrl(item.pdf)}
            />
          ))
          : tab === "operations" && operations.length
            ? operations.map((item, index) => (
              <Row
                key={`${item.issuer}-${item.kind}-${index}`}
                icon="git-branch-outline"
                title={`${item.ticker ? `${item.ticker} · ` : ""}${item.kind}`}
                detail={[item.issuer, item.date ? dateFr(item.date) : null, item.parity].filter(Boolean).join(" · ")}
                onPress={item.avisPdf ? () => void openTrustedExternalUrl(item.avisPdf as string) : undefined}
              />
            ))
            : <EmptyState icon="document-attach-outline" title="Aucune publication" detail="Les avis officiels apparaîtront ici dès leur publication." />}
      </Section>

      <Section title="Comprendre les opérations" detail="Mécanismes, pas des recommandations">
        {CONCEPTS.map((concept) => (
          <View key={concept.title} style={styles.concept}>
            <View style={styles.conceptIcon}>
              <Ionicons name={concept.icon} size={17} color={colors.accent} />
            </View>
            <View style={styles.conceptCopy}>
              <Text style={styles.conceptTitle}>{concept.title}</Text>
              <Text style={styles.conceptText}>{concept.text}</Text>
            </View>
          </View>
        ))}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  concept: {
    flexDirection: "row", gap: 12, padding: 14, marginBottom: 10,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  conceptIcon: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accentSoft, borderRadius: radius.md,
  },
  conceptCopy: { flex: 1 },
  conceptTitle: { ...type.body },
  conceptText: { ...type.caption, lineHeight: 17, marginTop: 4 },
});
