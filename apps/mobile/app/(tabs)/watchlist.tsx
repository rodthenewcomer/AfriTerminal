import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { pct } from "@wariba/core/format";
import { ActionButton, EmptyState, Metric, Page, Section } from "../../src/components/ui";
import { QuoteRow } from "../../src/components/QuoteRow";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { useWatchlistStore } from "../../src/stores";

export default function WatchlistScreen() {
  const market = useMarketData();
  const router = useRouter();
  const tickers = useWatchlistStore((state) => state.tickers);
  const toggle = useWatchlistStore((state) => state.toggle);
  const quotes = useMemo(
    () => tickers.map((ticker) => market.quotes[ticker]).filter(Boolean),
    [market.quotes, tickers]
  );
  const summary = useMemo(() => {
    if (!quotes.length) return null;
    const average = quotes.reduce((sum, quote) => sum + quote.dayChangePct, 0) / quotes.length;
    const sorted = [...quotes].sort((a, b) => b.dayChangePct - a.dayChangePct);
    return { average, best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [quotes]);

  return (
    <Page title="Watchlist" subtitle="Synchronisée localement sur cet appareil" refreshing={market.refreshing} onRefresh={() => void market.refresh()}>
      {summary ? (
        <View style={styles.metrics}>
          <Metric label="Variation moyenne" value={pct(summary.average, { signed: true, digits: 2 })} tone={summary.average >= 0 ? "up" : "down"} detail={`${quotes.length} titre${quotes.length > 1 ? "s" : ""} suivis`} />
          <Metric label="Meilleure" value={summary.best.ticker} tone="up" detail={pct(summary.best.dayChangePct, { signed: true, digits: 2 })} />
          <Metric label="Moins bonne" value={summary.worst.ticker} tone={summary.worst.dayChangePct >= 0 ? "up" : "down"} detail={pct(summary.worst.dayChangePct, { signed: true, digits: 2 })} />
        </View>
      ) : null}
      <Section title="Valeurs suivies" detail={quotes.length ? "Glisser vers la gauche pour retirer" : undefined}>
        {quotes.length ? quotes.map((quote) => (
          <QuoteRow key={quote.ticker} quote={quote} onRemove={() => toggle(quote.ticker)} />
        )) : <>
          <EmptyState icon="star-outline" title="Aucune valeur suivie" detail="Ajoutez une étoile depuis la recherche ou une fiche action." />
          <View style={styles.cta}>
            <ActionButton label="Parcourir la cote" icon="search-outline" onPress={() => router.push("/search")} />
          </View>
        </>}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cta: { alignSelf: "center", marginTop: 14 },
});
