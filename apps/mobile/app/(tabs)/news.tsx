import { useDeferredValue, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, EmptyState, Page, Section, SegmentedTabs } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { colors, radius, tabular, type } from "../../src/theme";
import { openTrustedExternalUrl } from "../../src/lib/external-links";

type NewsFilter = "all" | "results";

const FILTERS: readonly { id: NewsFilter; label: string }[] = [
  { id: "all", label: "Toutes les actions" },
  { id: "results", label: "Résultats & dividendes" },
];

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Abidjan",
});

function displayDate(value: string) {
  return DATE_FORMAT.format(new Date(value));
}

export default function NewsScreen() {
  const market = useMarketData();
  const router = useRouter();
  const [limit, setLimit] = useState(30);
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("fr"));

  const news = useMemo(() => market.news.filter((item) => {
    if (!item.tickers.length) return false;
    if (filter === "results" && !/résultat|rapport annuel|chiffre d.affaires|bénéfice|dividende|publication financière/i.test(`${item.title} ${item.summary}`)) return false;
    if (!deferredQuery) return true;
    return `${item.title} ${item.summary} ${item.source} ${item.tickers.join(" ")}`
      .toLocaleLowerCase("fr")
      .includes(deferredQuery);
  }), [deferredQuery, filter, market.news]);

  const lead = news[0];
  const stream = news.filter((item) => item.link !== lead?.link);

  return (
    <Page title="Actualités" subtitle="Informations directement reliées aux sociétés cotées à la BRVM.">
      <View style={styles.tools}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.ink3} />
          <TextInput
            accessibilityLabel="Rechercher dans les actualités"
            value={query}
            onChangeText={(value) => { setQuery(value); setLimit(30); }}
            placeholder="Société, ticker, résultat…"
            placeholderTextColor={colors.ink3}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
        <SegmentedTabs
          tabs={FILTERS}
          active={filter}
          onChange={(value) => { setFilter(value); setLimit(30); }}
        />
      </View>

      {lead ? (
        <Section title="À la une" detail={`${news.length} article${news.length > 1 ? "s" : ""}`}>
          <View style={styles.lead}>
            <View style={styles.leadMeta}>
              <View style={styles.liveDot} />
              <Text style={styles.leadSource}>{lead.source}</Text>
              <Text style={styles.leadDate}>· {displayDate(lead.publishedAt)}</Text>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${lead.title}, ouvrir la source`}
              onPress={() => void openTrustedExternalUrl(lead.link)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.leadTitle}>{lead.title}</Text>
              {lead.summary ? <Text numberOfLines={4} style={styles.leadSummary}>{lead.summary}</Text> : null}
              <View style={styles.readRow}>
                <Text style={styles.readText}>Lire la source</Text>
                <Ionicons name="arrow-up-outline" size={14} color={colors.accent} />
              </View>
            </Pressable>
            {lead.tickers.length ? (
              <View style={styles.tickers}>
                {lead.tickers.slice(0, 6).map((ticker) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir la fiche ${ticker}`}
                    key={ticker}
                    onPress={() => router.push(`/stocks/${ticker}`)}
                    style={({ pressed }) => [styles.tickerChip, pressed && styles.pressed]}
                  >
                    <Text style={styles.tickerText}>{ticker}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </Section>
      ) : null}

      <Section title="Fil du marché" detail={lead ? `${Math.min(limit, news.length)} sur ${news.length}` : undefined}>
        {news.length ? <>
          {stream.slice(0, Math.max(0, limit - 1)).map((item, index) => (
            <View key={item.link} style={styles.article}>
              <View style={styles.articleHeader}>
                <Text style={styles.articleIndex}>{String(index + 2).padStart(2, "0")}</Text>
                <Text style={styles.source}>{item.source}</Text>
                <Text style={styles.date}>· {displayDate(item.publishedAt)}</Text>
              </View>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${item.title}, ouvrir la source`}
                onPress={() => void openTrustedExternalUrl(item.link)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Ionicons name="arrow-up-outline" size={14} color={colors.ink3} />
                </View>
                {item.summary ? <Text numberOfLines={3} style={styles.summary}>{item.summary}</Text> : null}
              </Pressable>
              {item.tickers.length ? (
                <View style={styles.tickers}>
                  {item.tickers.slice(0, 4).map((ticker) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ouvrir la fiche ${ticker}`}
                      key={ticker}
                      onPress={() => router.push(`/stocks/${ticker}`)}
                      style={({ pressed }) => [styles.tickerChip, pressed && styles.pressed]}
                    >
                      <Text style={styles.tickerText}>{ticker}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {limit < news.length ? (
            <View style={styles.moreRow}>
              <ActionButton label="Afficher 30 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 30)} />
            </View>
          ) : null}
        </> : (
          <EmptyState icon="newspaper-outline" title="Aucun article trouvé" detail="Modifiez la recherche ou le filtre." />
        )}
      </Section>

      <Text style={styles.footnote}>Collecte automatique toutes les 5 minutes. WARIBA renvoie vers les éditeurs originaux et ne republie pas leurs articles.</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  tools: { gap: 10 },
  searchBox: {
    minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, minHeight: 46, color: colors.ink, fontSize: 14 },
  lead: {
    gap: 11, overflow: "hidden", padding: 18, borderWidth: 1, borderColor: "rgba(32,201,130,0.32)",
    borderRadius: radius.xl, backgroundColor: colors.surface,
  },
  leadMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  leadSource: { ...type.label, color: colors.accent },
  regionBadge: { color: colors.ink2, fontSize: 9.5, fontWeight: "800", textTransform: "uppercase" },
  leadDate: { ...type.caption, fontVariant: tabular },
  leadTitle: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900", letterSpacing: -0.35 },
  leadSummary: { ...type.sub, marginTop: 8, lineHeight: 19 },
  readRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 11 },
  readText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  regionalLabel: { ...type.caption, color: colors.accent },
  article: { paddingVertical: 15, gap: 8, borderBottomColor: colors.line, borderBottomWidth: 1 },
  articleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  articleIndex: { color: colors.ink3, fontSize: 10, fontWeight: "700", fontVariant: tabular },
  source: { ...type.label, color: colors.ink2 },
  date: { ...type.caption, flex: 1, fontVariant: tabular },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { ...type.body, flex: 1, lineHeight: 20 },
  summary: { ...type.caption, lineHeight: 17, marginTop: 6 },
  tickers: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tickerChip: {
    minHeight: 30, justifyContent: "center", paddingHorizontal: 9, borderRadius: radius.md,
    backgroundColor: colors.accentSoft, borderColor: "rgba(32,201,130,0.3)", borderWidth: 1,
  },
  tickerText: { color: colors.accent, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.3 },
  moreRow: { alignSelf: "center", marginTop: 12 },
  footnote: { ...type.caption, textAlign: "center", paddingHorizontal: 10 },
  pressed: { opacity: 0.62 },
});
