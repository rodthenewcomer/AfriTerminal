import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState, ActionButton, Page, Section } from "../src/components/ui";
import { QuoteRow } from "../src/components/QuoteRow";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius } from "../src/theme";
import { useScreenerStore, type ScreenerSort } from "../src/stores";
import { sectorLabel } from "../src/lib/sectors";

const SORTS: { id: ScreenerSort; label: string }[] = [
  { id: "variation", label: "Variation" },
  { id: "rendement", label: "Rendement" },
  { id: "per", label: "PER" },
  { id: "liquidite", label: "Liquidité" },
];

export default function ScreenerScreen() {
  const market = useMarketData();
  const { query, sector, sort, saved, setQuery, setSector, setSort, saveCurrent, apply, remove } = useScreenerStore();
  const sectors = useMemo(
    () => ["Tous", ...new Set(Object.values(market.quotes).map((quote) => sectorLabel(quote.sectorCode)))],
    [market.quotes]
  );
  const quotes = useMemo(() => Object.values(market.quotes)
    .filter((quote) => sector === "Tous" || sectorLabel(quote.sectorCode) === sector)
    .filter((quote) => `${quote.ticker} ${quote.name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === "rendement") return (b.netYieldPct ?? -Infinity) - (a.netYieldPct ?? -Infinity);
      if (sort === "per") return (a.per ?? Infinity) - (b.per ?? Infinity);
      if (sort === "liquidite") return (b.dayValueFcfa ?? 0) - (a.dayValueFcfa ?? 0);
      return b.dayChangePct - a.dayChangePct;
    }), [market.quotes, query, sector, sort]);

  return (
    <Page subtitle={`${quotes.length} résultats sur ${Object.keys(market.quotes).length} valeurs · données officielles uniquement`}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.ink3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ticker ou société"
          placeholderTextColor={colors.ink3}
          autoCapitalize="characters"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length ? (
          <Pressable hitSlop={8} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={17} color={colors.ink3} />
          </Pressable>
        ) : null}
      </View>

      <Section title="Secteur">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {sectors.map((item) => <ActionButton key={item} label={item} active={sector === item} onPress={() => setSector(item)} />)}
        </ScrollView>
      </Section>

      <Section title="Trier par">
        <View style={styles.chips}>
          {SORTS.map((item) => <ActionButton key={item.id} label={item.label} active={sort === item.id} onPress={() => setSort(item.id)} />)}
        </View>
      </Section>

      <Section title="Filtres enregistrés" detail={saved.length ? `${saved.length}` : "aucun"}>
        <View style={styles.chipsWrap}>
          <ActionButton label="Enregistrer le filtre actuel" icon="bookmark-outline" onPress={saveCurrent} />
          {saved.map((filter) => (
            <ActionButton
              key={filter.id}
              label={filter.label}
              active={filter.query === query && filter.sector === sector && filter.sort === sort}
              onPress={() => apply(filter)}
            />
          ))}
          {saved.length ? <ActionButton label="Effacer le dernier" icon="trash-outline" onPress={() => remove(saved[saved.length - 1].id)} /> : null}
        </View>
      </Section>

      <Section title="Résultats" detail={SORTS.find((item) => item.id === sort)?.label}>
        {quotes.length
          ? quotes.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)
          : <EmptyState icon="filter-outline" title="Aucun résultat" detail="Élargissez la recherche ou changez de secteur." />}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    height: 48, flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 13,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
  chips: { flexDirection: "row", gap: 7 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
});
