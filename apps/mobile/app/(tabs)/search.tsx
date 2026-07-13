import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActionButton, LoadingState, Page, Section, SegmentedTabs } from "../../src/components/ui";
import { QuoteRow } from "../../src/components/QuoteRow";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { colors, radius } from "../../src/theme";
import { sectorLabel } from "../../src/lib/sectors";

export default function SearchScreen() {
  const router = useRouter();
  const market = useMarketData();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("Tous");
  const [ranking, setRanking] = useState("valeur");
  const sectors = useMemo(() => ["Tous", ...new Set(Object.values(market.quotes).map((quote) => sectorLabel(quote.sectorCode)))], [market.quotes]);
  const quotes = useMemo(() => Object.values(market.quotes)
    .filter((quote) => sector === "Tous" || sectorLabel(quote.sectorCode) === sector)
    .filter((quote) => `${quote.ticker} ${quote.name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (ranking === "hausses") return b.dayChangePct - a.dayChangePct;
      if (ranking === "baisses") return a.dayChangePct - b.dayChangePct;
      if (ranking === "volume") return b.dayVolume - a.dayVolume;
      return (b.dayValueFcfa ?? 0) - (a.dayValueFcfa ?? 0);
    }), [market.quotes, query, ranking, sector]);
  if (market.loading && quotes.length === 0) return <LoadingState />;

  return (
    <Page title="Recherche" subtitle={`${quotes.length} valeurs cotées · cours officiels BRVM`} refreshing={market.refreshing} onRefresh={() => void market.refresh()}>
      <View style={styles.actions}>
        <ActionButton label="Screener" icon="filter-outline" onPress={() => router.push("/screener")} />
        <ActionButton label="Carte" icon="grid-outline" onPress={() => router.push("/map")} />
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.ink3} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un ticker ou une société" placeholderTextColor={colors.ink3} style={styles.searchInput} autoCapitalize="characters" returnKeyType="search" />
        {query.length ? (
          <Pressable hitSlop={8} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={17} color={colors.ink3} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {sectors.map((item) => <ActionButton key={item} label={item} active={sector === item} onPress={() => setSector(item)} />)}
      </ScrollView>
      <SegmentedTabs
        tabs={[
          { id: "valeur", label: "Valeur échangée" }, { id: "hausses", label: "Hausses" },
          { id: "baisses", label: "Baisses" }, { id: "volume", label: "Volume" },
        ] as const}
        active={ranking}
        onChange={setRanking}
      />
      <Section title="Cote" detail={`${quotes.length} valeurs`}>
        {quotes.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 }, filters: { gap: 7 },
  searchBox: {
    height: 48, flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 13,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
});
