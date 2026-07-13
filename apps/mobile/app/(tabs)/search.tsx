import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ActionButton, LoadingState, Page, Section } from "../../src/components/ui";
import { QuoteRow } from "../../src/components/QuoteRow";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { colors, radius } from "../../src/theme";
import { sectorLabel } from "../../src/lib/sectors";

export default function SearchScreen() {
  const router = useRouter();
  const market = useMarketData();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("Tous");
  const sectors = useMemo(() => ["Tous", ...new Set(Object.values(market.quotes).map((quote) => sectorLabel(quote.sectorCode)))], [market.quotes]);
  const quotes = useMemo(() => Object.values(market.quotes)
    .filter((quote) => sector === "Tous" || sectorLabel(quote.sectorCode) === sector)
    .filter((quote) => `${quote.ticker} ${quote.name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.dayValueFcfa ?? 0) - (a.dayValueFcfa ?? 0)), [market.quotes, query, sector]);
  if (market.loading && quotes.length === 0) return <LoadingState />;

  return (
    <Page title="Recherche" subtitle={`${quotes.length} valeurs cotées · cours officiels BRVM`} refreshing={market.refreshing} onRefresh={() => void market.refresh()}>
      <View style={styles.actions}>
        <ActionButton label="Screener" icon="filter-outline" onPress={() => router.push("/screener")} />
        <ActionButton label="Carte" icon="grid-outline" onPress={() => router.push("/map")} />
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un ticker ou une société" placeholderTextColor={colors.ink3} style={styles.search} autoCapitalize="characters" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {sectors.map((item) => <ActionButton key={item} label={item} active={sector === item} onPress={() => setSector(item)} />)}
      </ScrollView>
      <Section title="Cote" detail="triée par valeur échangée">
        {quotes.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 }, filters: { gap: 7 },
  search: { height: 46, color: colors.ink, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14, fontSize: 13.5 },
});
