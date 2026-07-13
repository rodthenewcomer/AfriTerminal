import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { compactFcfa, compactVolume, pct } from "@afriterminal/core/format";
import type { IndexRecord } from "../../src/data/types";
import { ActionButton, ChangePill, EmptyState, LoadingState, Metric, Page, Row, Section } from "../../src/components/ui";
import { QuoteRow } from "../../src/components/QuoteRow";
import { SectorPerformance } from "../../src/components/SectorPerformance";
import { Sparkline } from "../../src/components/Sparkline";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { useWatchlistStore } from "../../src/stores";
import { colors, radius, tabular, type } from "../../src/theme";

/** Carte héro : l'indice principal avec sa courbe 30 séances en grand. */
function HeroIndex({ index, onPress }: { index: IndexRecord; onPress: () => void }) {
  const [width, setWidth] = useState(0);
  const up = index.dayChangePct >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.hero, pressed && { opacity: 0.75 }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroLabel}>{index.name}</Text>
          <Text style={styles.heroLevel}>{index.level.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.heroPills}>
          <ChangePill value={index.dayChangePct} label={pct(index.dayChangePct, { signed: true, digits: 2 })} />
          <Text style={styles.heroYtd}>{pct(index.ytdChangePct, { signed: true, digits: 1 })} YTD</Text>
        </View>
      </View>
      {width > 0 && index.spark?.length >= 2 ? (
        <View style={styles.heroSpark}>
          <Sparkline values={index.spark} width={width - 32} height={92} color={up ? colors.up : colors.down} fillOpacity={0.12} />
        </View>
      ) : null}
      <Text style={styles.heroCaption}>30 dernières séances · clôture {index.asOfDate} · toucher pour l'historique complet</Text>
    </Pressable>
  );
}

function IndexCard({ index, onPress }: { index: IndexRecord; onPress: () => void }) {
  const up = index.dayChangePct >= 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.indexCard, pressed && { opacity: 0.75 }]}>
      <Text numberOfLines={1} style={styles.indexName}>{index.name}</Text>
      <Text style={styles.indexLevel}>{index.level.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</Text>
      <View style={styles.indexFooter}>
        <ChangePill value={index.dayChangePct} label={pct(index.dayChangePct, { signed: true, digits: 2 })} />
      </View>
      {index.spark?.length >= 2 ? (
        <View style={styles.indexSpark}>
          <Sparkline values={index.spark} width={164} height={34} color={up ? colors.up : colors.down} fillOpacity={0.1} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const market = useMarketData();
  const watchedTickers = useWatchlistStore((state) => state.tickers);
  const quotes = useMemo(() => Object.values(market.quotes), [market.quotes]);
  const watched = useMemo(
    () => watchedTickers.map((ticker) => market.quotes[ticker]).filter(Boolean).slice(0, 4),
    [market.quotes, watchedTickers]
  );
  const stats = useMemo(() => {
    const up = quotes.filter((quote) => quote.dayChangePct > 0).length;
    const down = quotes.filter((quote) => quote.dayChangePct < 0).length;
    const pers = quotes.map((quote) => quote.per).filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
    const medianPer = pers.length ? pers[Math.floor(pers.length / 2)] : null;
    const yields = quotes.map((quote) => quote.netYieldPct).filter((value): value is number => value !== null && Number.isFinite(value));
    const meanYield = yields.length ? yields.reduce((sum, value) => sum + value, 0) / yields.length : null;
    return { up, down, medianPer, meanYield };
  }, [quotes]);
  if (market.loading && quotes.length === 0) return <LoadingState />;

  const gainers = [...quotes].filter((quote) => quote.dayChangePct > 0).sort((a, b) => b.dayChangePct - a.dayChangePct).slice(0, 3);
  const losers = [...quotes].filter((quote) => quote.dayChangePct < 0).sort((a, b) => a.dayChangePct - b.dayChangePct).slice(0, 3);
  const mainIndex = market.indices.find((index) => index.code === "BRVMC") ?? market.indices[0];
  const otherIndices = market.indices.filter((index) => index !== mainIndex);

  return (
    <Page
      title="AfriTerminal"
      subtitle={`${market.offline ? "Cache appareil" : "Sources officielles BRVM"} · clôture ${quotes[0]?.asOfDate ?? "—"}`}
      refreshing={market.refreshing}
      onRefresh={() => void market.refresh()}
      action={<ActionButton label="Alertes" icon="notifications-outline" onPress={() => router.push("/alerts")} />}
    >
      {market.error ? <Text style={styles.error}>{market.error}</Text> : null}

      {mainIndex ? <HeroIndex index={mainIndex} onPress={() => router.push(`/indices/${mainIndex.code}`)} /> : null}

      {otherIndices.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indexRow}>
          {otherIndices.map((index) => <IndexCard key={index.code} index={index} onPress={() => router.push(`/indices/${index.code}`)} />)}
        </ScrollView>
      ) : null}

      {watched.length ? (
        <Section title="Ma watchlist" detail="Vos valeurs suivies">
          {watched.map((quote) => <QuoteRow key={quote.ticker} quote={quote} />)}
          <View style={styles.moreRow}>
            <ActionButton label="Toute la watchlist" icon="arrow-forward" onPress={() => router.push("/watchlist")} />
          </View>
        </Section>
      ) : null}

      <Section title="Séance" detail="Dernière clôture officielle">
        <View style={styles.metrics}>
          <Metric label="Hausses / baisses" value={`${stats.up} · ${stats.down}`} tone={stats.up >= stats.down ? "up" : "down"} detail={`${quotes.length} valeurs cotées`} />
          <Metric label="Valeur échangée" value={compactFcfa(quotes.reduce((sum, quote) => sum + (quote.dayValueFcfa ?? 0), 0))} detail={`${compactVolume(quotes.reduce((sum, quote) => sum + quote.dayVolume, 0))} titres`} />
          <Metric label="PER médian" value={stats.medianPer === null ? "—" : stats.medianPer.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} detail="cote entière" />
          <Metric label="Rendement moyen" value={stats.meanYield === null ? "—" : pct(stats.meanYield, { signed: false, digits: 2 })} tone="accent" detail="dividende net" />
        </View>
      </Section>

      <Section title="Performance par secteur" detail="Moyenne des variations du jour">
        <SectorPerformance quotes={quotes} />
      </Section>

      <Section title="Plus fortes hausses" detail="Variation du jour">
        {gainers.length
          ? gainers.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)
          : <EmptyState icon="trending-up-outline" title="Aucune hausse" detail="Aucune valeur n'a progressé sur la dernière séance." />}
      </Section>

      <Section title="Plus fortes baisses" detail="Variation du jour">
        {losers.length
          ? losers.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)
          : <EmptyState icon="trending-down-outline" title="Aucune baisse" detail="Aucune valeur n'a reculé sur la dernière séance." />}
        <View style={styles.moreRow}>
          <ActionButton label="Toute la cote" icon="list-outline" onPress={() => router.push("/search")} />
        </View>
      </Section>

      <Section title="Actualités" detail={market.news.length ? `${market.news.length} articles sourcés` : undefined}>
        {market.news.length ? <>
          {market.news.slice(0, 3).map((item) => (
            <Row
              key={item.link}
              icon="newspaper-outline"
              title={item.title}
              detail={`${item.source} · ${item.publishedAt.slice(0, 10)}`}
              onPress={() => void Linking.openURL(item.link)}
            />
          ))}
          <View style={styles.moreRow}>
            <ActionButton label="Toutes les actualités" icon="arrow-forward" onPress={() => router.push("/news")} />
          </View>
        </> : <EmptyState icon="newspaper-outline" title="Aucune actualité" detail="Les articles sourcés apparaîtront ici." />}
      </Section>

      <Section title="Dernières alertes" detail="Faits calculés">
        {market.alerts.length
          ? market.alerts.slice(0, 4).map((alert) => (
            <Row key={alert.id} icon="pulse-outline" title={alert.title} detail={alert.detail} onPress={alert.ticker ? () => router.push(`/stocks/${alert.ticker}`) : undefined} />
          ))
          : <EmptyState icon="pulse-outline" title="Aucune alerte" detail="Rien à signaler sur la dernière séance." />}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 16, gap: 10,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroLabel: { ...type.label },
  heroLevel: { color: colors.ink, fontSize: 34, fontWeight: "800", letterSpacing: -0.8, marginTop: 4, fontVariant: tabular },
  heroPills: { alignItems: "flex-end", gap: 6 },
  heroYtd: { ...type.caption, fontVariant: tabular },
  heroSpark: { marginHorizontal: -2 },
  heroCaption: { ...type.caption },
  indexRow: { gap: 12 },
  indexCard: {
    width: 192, padding: 14, gap: 6,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  indexName: { ...type.label },
  indexLevel: { color: colors.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.4, fontVariant: tabular },
  indexFooter: { flexDirection: "row", alignItems: "center" },
  indexSpark: { marginTop: 2, marginHorizontal: -2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  moreRow: { marginTop: 10, alignSelf: "flex-start" },
  error: {
    color: colors.warn, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, padding: 12, fontSize: 12, lineHeight: 17,
  },
});
