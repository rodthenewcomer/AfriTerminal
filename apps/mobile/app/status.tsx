import { StyleSheet, Text, View } from "react-native";
import { dateFr } from "@wariba/core/format";
import { Metric, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius, type } from "../src/theme";

export default function StatusScreen() {
  const market = useMarketData();
  const quotes = Object.values(market.quotes);
  const latest = quotes.reduce((date, quote) => quote.asOfDate > date ? quote.asOfDate : date, "");
  const liveQuote = quotes.find((quote) => quote.quoteStatus === "delayed-live");
  const marketDetail = liveQuote
    ? `différé 15 min · ${liveQuote.asOfTimestamp
      ? new Date(liveQuote.asOfTimestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" })
      : dateFr(liveQuote.asOfDate)}`
    : latest ? `clôture ${dateFr(latest)}` : undefined;

  return (
    <Page
      subtitle="Fraîcheur et couverture de chaque source de données"
      refreshing={market.refreshing}
      onRefresh={() => void market.refresh()}
    >
      <Section title="Résumé" detail={market.updatedAt ? `Vérifié à ${market.updatedAt.slice(11, 16)} UTC` : undefined}>
        <View style={styles.metrics}>
          <Metric label="Cotations" value={`${quotes.length} / 48`} tone={quotes.length === 48 ? "up" : "down"} detail={marketDetail} />
          <Metric label="Fondamentaux" value={`${Object.keys(market.fundamentals).length} / 48`} tone="up" detail="sociétés curées" />
          <Metric label="Documents" value={`${market.documents.length}`} detail="liens brvm.org" />
          <Metric label="Mode" value={market.offline ? "Cache" : "Réseau"} tone={market.offline ? "accent" : "up"} detail={market.offline ? "données locales" : "sources en ligne"} />
        </View>
      </Section>

      <Section title="Sources">
        <Row icon="stats-chart-outline" title="Cours et indices" detail={`BRVM · ${marketDetail ?? "indisponible"} · actualisation automatique`} />
        <Row icon="business-outline" title="Fondamentaux" detail="États financiers officiels, extraction curée société par société" />
        <Row icon="document-text-outline" title="Documents" detail={`${market.documents.length} publications · vérification toutes les 15 min`} />
        <Row icon="newspaper-outline" title="Actualités" detail={`${market.news.length} articles, chacun avec sa source`} />
        <Row icon="cash-outline" title="Dividendes" detail={`${Object.keys(market.dividends).length} sociétés avec historique de versements`} />
      </Section>

      {market.error ? <Text style={styles.error}>{market.error}</Text> : null}

      <Text style={styles.note}>
        Les cours intraday sont différés de 15 minutes et ne conviennent pas à l'exécution d'ordres.
        Les volumes officiels sont consolidés après clôture.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  error: {
    color: colors.warn, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, padding: 12, fontSize: 12, lineHeight: 17,
  },
  note: { ...type.caption, textAlign: "center", paddingHorizontal: 8 },
});
