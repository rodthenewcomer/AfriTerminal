import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ActionButton, EmptyState, Page, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius, type } from "../src/theme";
import { openTrustedExternalUrl } from "../src/lib/external-links";

export default function NewsScreen() {
  const market = useMarketData();
  const router = useRouter();
  const [limit, setLimit] = useState(30);

  return (
    <Page subtitle="Articles sourcés — jamais de résumé sans provenance">
      <Section title="Actualités" detail={`${Math.min(limit, market.news.length)} sur ${market.news.length}`}>
        {market.news.length ? <>
          {market.news.slice(0, limit).map((item) => (
            <Pressable key={item.link} onPress={() => void openTrustedExternalUrl(item.link)} style={({ pressed }) => [styles.article, pressed && { opacity: 0.6 }]}>
              <View style={styles.articleHeader}>
                <Text style={styles.source}>{item.source}</Text>
                <Text style={styles.date}>{item.publishedAt.slice(0, 10)}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              {item.summary ? <Text numberOfLines={3} style={styles.summary}>{item.summary}</Text> : null}
              {item.tickers.length ? (
                <View style={styles.tickers}>
                  {item.tickers.slice(0, 4).map((ticker) => (
                    <Pressable key={ticker} onPress={() => router.push(`/stocks/${ticker}`)} style={styles.tickerChip}>
                      <Text style={styles.tickerText}>{ticker}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>
          ))}
          {limit < market.news.length ? (
            <View style={styles.moreRow}>
              <ActionButton label="Afficher 30 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 30)} />
            </View>
          ) : null}
        </> : <EmptyState icon="newspaper-outline" title="Aucune actualité" detail="Les articles sourcés apparaîtront ici." />}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  article: { paddingVertical: 14, gap: 6, borderBottomColor: colors.line, borderBottomWidth: 1 },
  articleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  source: { ...type.label, color: colors.accent },
  date: { ...type.caption, fontVariant: ["tabular-nums"] },
  title: { ...type.body, lineHeight: 20 },
  summary: { ...type.caption, lineHeight: 17 },
  tickers: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tickerChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1,
  },
  tickerText: { color: colors.ink2, fontSize: 10.5, fontWeight: "700", letterSpacing: 0.3 },
  moreRow: { alignSelf: "center", marginTop: 12 },
});
