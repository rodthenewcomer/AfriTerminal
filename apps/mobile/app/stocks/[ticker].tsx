import { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { annualizedVolatility, maxDrawdown } from "@afriterminal/core/risk";
import { compactFcfa, compactVolume, dateFr, fcfa, millions, num, pct, ratio } from "@afriterminal/core/format";
import { companyProfile } from "@afriterminal/core/company-profiles";
import type { OHLCV } from "@afriterminal/core/types";
import { AdvancedChart } from "../../src/components/AdvancedChart";
import type { WebChartMarker } from "../../src/components/chart/WebChart";
import { ActionButton, ChangePill, EmptyState, LoadingState, Metric, Page, Row, Section, SegmentedTabs } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { useWatchlistStore } from "../../src/stores";
import { sectorLabel } from "../../src/lib/sectors";
import { colors, radius, tabular, type } from "../../src/theme";

const STOCK_TABS = [
  { id: "chart", label: "Graphique" },
  { id: "fundamentals", label: "Fondamentaux" },
  { id: "risk", label: "Risque & opérations" },
  { id: "news", label: "Actus & documents" },
] as const;
type Tab = (typeof STOCK_TABS)[number]["id"];

function growthPct(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function FactRow({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "warn" }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[
        styles.factValue,
        tone === "up" && { color: colors.up },
        tone === "down" && { color: colors.down },
        tone === "warn" && { color: colors.warn },
      ]}>
        {value}
      </Text>
    </View>
  );
}

export default function StockScreen() {
  const params = useLocalSearchParams<{ ticker: string }>();
  const ticker = String(params.ticker ?? "SNTS").toUpperCase();
  const market = useMarketData();
  const quote = market.quotes[ticker];
  const fundamental = market.fundamentals[ticker];
  const [series, setSeries] = useState<OHLCV[]>([]);
  const [tab, setTab] = useState<Tab>("chart");
  const watched = useWatchlistStore((state) => state.tickers.includes(ticker));
  const toggle = useWatchlistStore((state) => state.toggle);
  useEffect(() => { void market.loadSeries(ticker).then(setSeries); }, [market.loadSeries, ticker]);
  const riskSeries = useMemo(() => series.map((bar) => ({ time: String(bar.time), close: bar.close })), [series]);
  const risk = useMemo(() => ({ volatility: annualizedVolatility(riskSeries), drawdown: maxDrawdown(riskSeries) }), [riskSeries]);
  const documents = useMemo(() => market.documents.filter((document) => document.ticker === ticker).slice(0, 15), [market.documents, ticker]);
  const operations = useMemo(() => documents.filter((item) => /capital|split|fusion/i.test(item.title)), [documents]);
  const news = useMemo(() => market.news.filter((item) => item.tickers.includes(ticker)).slice(0, 10), [market.news, ticker]);
  const events = useMemo<WebChartMarker[]>(() => [
    ...(market.dividends[ticker] ?? []).map((item) => ({ time: item.date, kind: "dividend" as const, label: `D ${num(item.net)}` })),
    ...operations.map((item) => ({ time: item.date, kind: "operation" as const, label: "S" })),
  ], [market.dividends, operations, ticker]);

  if (!quote) return market.loading ? <LoadingState /> : <EmptyState title="Valeur introuvable" detail={`Aucune cotation pour ${ticker}.`} />;
  const description = companyProfile(ticker);
  const week52Share = quote.week52High > quote.week52Low
    ? Math.min(100, Math.max(0, ((quote.lastClose - quote.week52Low) / (quote.week52High - quote.week52Low)) * 100))
    : 100;
  const bpa = fundamental?.sharesOutstanding ? (fundamental.netIncomeM * 1e6) / fundamental.sharesOutstanding : null;

  return (
    <Page>
      <Stack.Screen options={{ title: ticker }} />

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text numberOfLines={2} style={styles.name}>{quote.name} · {sectorLabel(quote.sectorCode)}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{fcfa(quote.lastClose)}</Text>
            <ChangePill value={quote.dayChangePct} label={pct(quote.dayChangePct, { signed: true, digits: 2 })} />
          </View>
          <Text style={styles.asOf}>Clôture officielle du {dateFr(quote.asOfDate)}</Text>
        </View>
        <ActionButton label={watched ? "Suivie" : "Suivre"} icon={watched ? "star" : "star-outline"} active={watched} onPress={() => toggle(ticker)} />
      </View>

      <SegmentedTabs tabs={STOCK_TABS} active={tab} onChange={setTab} />

      {tab === "chart" ? <>
        {series.length ? (
          <AdvancedChart ticker={ticker} data={series} previousClose={quote.prevClose} week52High={quote.week52High} week52Low={quote.week52Low} events={events} />
        ) : <LoadingState label="Chargement de la série…" />}

        <Section title="Résumé" detail="Séance et variations">
          <View style={styles.factCard}>
            <FactRow label="Ouverture" value={fcfa(quote.dayOpen)} />
            <FactRow label="+ Haut / + Bas du jour" value={`${fcfa(quote.dayHigh)} / ${fcfa(quote.dayLow)}`} />
            <FactRow label="Clôture veille" value={fcfa(quote.prevClose)} />
            {quote.dayValueFcfa ? <FactRow label="Valeur échangée" value={compactFcfa(quote.dayValueFcfa)} /> : null}
            <FactRow label="Volume du jour" value={`${compactVolume(quote.dayVolume)} (${quote.volumeRatio.toFixed(1)}×)`} tone={quote.volumeRatio >= 3 ? "warn" : undefined} />
          </View>
          <View style={styles.factCard}>
            <FactRow label="Variation 1 semaine" value={pct(quote.weekChangePct, { signed: true, digits: 2 })} tone={quote.weekChangePct >= 0 ? "up" : "down"} />
            <FactRow label="Variation 1 mois" value={pct(quote.monthChangePct, { signed: true, digits: 2 })} tone={quote.monthChangePct >= 0 ? "up" : "down"} />
            <FactRow label="Variation YTD" value={pct(quote.ytdChangePct, { signed: true, digits: 2 })} tone={quote.ytdChangePct >= 0 ? "up" : "down"} />
            <FactRow label="Variation 1 an" value={pct(quote.yearChangePct, { signed: true, digits: 2 })} tone={quote.yearChangePct >= 0 ? "up" : "down"} />
            <FactRow label="Variation 5 ans" value={pct(quote.fiveYearChangePct, { signed: true, digits: 2 })} tone={quote.fiveYearChangePct >= 0 ? "up" : "down"} />
          </View>
        </Section>

        <Section title="À propos">
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.rangeBlock}>
            <View style={styles.rangeHeader}>
              <Text style={styles.rangeLabel}>Extrêmes 52 semaines</Text>
              <Text style={styles.rangeValues}>{fcfa(quote.week52Low)} – {fcfa(quote.week52High)}</Text>
            </View>
            <View style={styles.rangeTrack}>
              <View style={[styles.rangeFill, { width: `${week52Share}%` }]} />
            </View>
            <Text style={styles.rangeCaption}>
              {quote.lastClose >= quote.week52High
                ? "Au plus haut de ses 52 dernières semaines."
                : `À ${pct(((quote.lastClose - quote.week52High) / quote.week52High) * 100, { digits: 1 })} de son plus haut 52 semaines.`}
            </Text>
            <FactRow label="Record de clôture (depuis 2019)" value={`${fcfa(quote.allTimeHigh)} le ${dateFr(quote.allTimeHighDate)}`} />
          </View>
        </Section>
      </> : null}

      {tab === "fundamentals" ? (
        <Section
          title="Fondamentaux"
          detail={fundamental ? `Exercice ${fundamental.fiscalYear} · publié le ${dateFr(fundamental.publishedOn)}` : undefined}
        >
          <View style={styles.metrics}>
            <Metric label="PER" value={quote.per !== null ? ratio(quote.per) : "—"} />
            <Metric label="Rendement net" value={quote.netYieldPct !== null ? pct(quote.netYieldPct, { signed: false, digits: 2 }) : "—"} tone={quote.netYieldPct !== null && quote.netYieldPct >= 6 ? "up" : "default"} />
            <Metric label="Vol. moyen 30 j" value={compactVolume(quote.avgVolume30d)} />
            <Metric label="Dernier dividende net" value={quote.lastDividendNet !== null ? fcfa(quote.lastDividendNet) : "—"} detail={quote.lastDividendDate ? `Payé le ${dateFr(quote.lastDividendDate)}` : undefined} />
            {fundamental?.sharesOutstanding ? <>
              <Metric label="Capitalisation" value={compactFcfa(fundamental.sharesOutstanding * quote.lastClose)} detail={`${(fundamental.sharesOutstanding / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M d'actions`} />
              {bpa !== null ? <Metric label={`BPA ${fundamental.fiscalYear}`} value={fcfa(bpa)} detail="Bénéfice net par action" /> : null}
              {fundamental.equityM ? <Metric label="P/B" value={ratio(quote.lastClose / ((fundamental.equityM * 1e6) / fundamental.sharesOutstanding))} /> : null}
            </> : null}
            {fundamental?.equityM ? <Metric label={`ROE ${fundamental.fiscalYear}`} value={pct((fundamental.netIncomeM / fundamental.equityM) * 100, { signed: false, digits: 1 })} /> : null}
            {fundamental ? <>
              <Metric label={`${fundamental.revenueLabel} ${fundamental.fiscalYear}`} value={millions(fundamental.revenueM)} detail={(() => {
                const growth = growthPct(fundamental.revenueM, fundamental.revenuePrevM);
                return growth !== null ? `${pct(growth, { digits: 1 })} vs ${fundamental.fiscalYear - 1}` : undefined;
              })()} />
              <Metric label={`Résultat net ${fundamental.fiscalYear}`} value={millions(fundamental.netIncomeM)} tone={fundamental.netIncomeM >= 0 ? "up" : "down"} detail={(() => {
                const growth = growthPct(fundamental.netIncomeM, fundamental.netIncomePrevM);
                return growth !== null ? `${pct(growth, { digits: 1 })} vs ${fundamental.fiscalYear - 1}` : undefined;
              })()} />
              <Metric label="Marge nette" value={pct((fundamental.netIncomeM / fundamental.revenueM) * 100, { signed: false, digits: 1 })} />
              {fundamental.ordinaryIncomeM !== null ? <Metric label="Résultat ordinaire" value={millions(fundamental.ordinaryIncomeM)} tone={fundamental.ordinaryIncomeM < 0 ? "down" : "default"} /> : null}
              {fundamental.cirPct !== null ? <Metric label="Coefficient d'exploitation" value={pct(fundamental.cirPct, { signed: false, digits: 1 })} detail={fundamental.cirPrevPct !== null ? `${pct(fundamental.cirPrevPct, { signed: false, digits: 1 })} en ${fundamental.fiscalYear - 1}` : undefined} /> : null}
              {fundamental.costOfRiskM !== null ? <Metric label="Coût du risque" value={millions(fundamental.costOfRiskM)} detail={fundamental.costOfRiskM < 0 ? "Négatif = reprise nette" : undefined} /> : null}
              {fundamental.depositsM !== null ? <Metric label="Dépôts clientèle" value={millions(fundamental.depositsM)} detail="L'argent que les clients confient" /> : null}
              {fundamental.loansM !== null ? <Metric label="Crédits clientèle" value={millions(fundamental.loansM)} detail={fundamental.depositsM ? `${pct((fundamental.loansM / fundamental.depositsM) * 100, { signed: false, digits: 0 })} des dépôts prêtés` : undefined} /> : null}
              {fundamental.proposedGrossDividend !== null ? <Metric label="Dividende brut proposé" value={fcfa(fundamental.proposedGrossDividend)} tone="accent" detail={`Au titre de ${fundamental.fiscalYear}, soumis à l'AG`} /> : null}
            </> : null}
          </View>
          {fundamental ? (
            <Row icon="open-outline" title="Document source BRVM" detail="États financiers officiels dont sont issus ces chiffres" onPress={() => void Linking.openURL(fundamental.source)} />
          ) : (
            <EmptyState title="Fondamentaux détaillés indisponibles" detail="Aucun état financier vérifié n'est encore curé pour cette société." />
          )}
        </Section>
      ) : null}

      {tab === "risk" ? <>
        <Section title="Risque historique" detail="Calculé sur l'historique complet des clôtures">
          <View style={styles.metrics}>
            <Metric label="Volatilité annualisée" value={risk.volatility === null ? "—" : pct(risk.volatility, { signed: false, digits: 1 })} />
            <Metric label="Max drawdown" value={risk.drawdown ? pct(risk.drawdown.pct, { signed: true, digits: 1 }) : "—"} tone="down" detail={risk.drawdown ? `${dateFr(risk.drawdown.peakDate)} → ${dateFr(risk.drawdown.troughDate)}` : undefined} />
            <Metric label="Plus haut 52s" value={fcfa(quote.week52High)} />
            <Metric label="Plus bas 52s" value={fcfa(quote.week52Low)} />
          </View>
          <Text style={styles.disclaimer}>Statistiques historiques descriptives, pas une prévision ni un conseil en investissement.</Text>
        </Section>
        <Section title="Opérations sur capital" detail="Splits, augmentations, fusions actés à la BRVM">
          {operations.length
            ? operations.map((item) => <Row key={item.url} icon="git-branch-outline" title={item.title} detail={`${item.type} · ${dateFr(item.date)}`} onPress={() => void Linking.openURL(item.url)} />)
            : <EmptyState icon="git-branch-outline" title="Aucune opération" detail="Aucune opération sur capital identifiée pour cette société." />}
        </Section>
      </> : null}

      {tab === "news" ? <>
        <Section title="Actualités" detail={news.length ? `${news.length} articles liés` : undefined}>
          {news.length
            ? news.map((item) => <Row key={item.link} icon="newspaper-outline" title={item.title} detail={`${item.source} · ${item.publishedAt.slice(0, 10)}`} onPress={() => void Linking.openURL(item.link)} />)
            : <EmptyState icon="newspaper-outline" title="Aucun article" detail={`Aucune actualité sourcée liée à ${ticker}.`} />}
        </Section>
        <Section title="Publications officielles" detail={`${documents.length} récentes`}>
          {documents.length
            ? documents.map((document) => <Row key={document.url} icon="document-text-outline" title={document.title} detail={`${document.type} · ${dateFr(document.date)}`} onPress={() => void Linking.openURL(document.url)} />)
            : <EmptyState icon="document-text-outline" title="Aucune publication" detail={`Aucun document officiel lié à ${ticker} pour le moment.`} />}
        </Section>
      </> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroCopy: { flex: 1, gap: 6 },
  name: { ...type.sub },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, fontVariant: tabular },
  asOf: { ...type.caption },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  factCard: {
    padding: 14, gap: 10, marginBottom: 10,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  factRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  factLabel: { ...type.caption },
  factValue: { color: colors.ink, fontSize: 12.5, fontWeight: "600", fontVariant: tabular },
  description: { ...type.sub, lineHeight: 19, marginBottom: 10 },
  rangeBlock: {
    padding: 14, gap: 8,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  rangeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rangeLabel: { ...type.caption },
  rangeValues: { ...type.caption, color: colors.ink2, fontVariant: tabular },
  rangeTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: "hidden" },
  rangeFill: { height: 6, borderRadius: 3, backgroundColor: colors.up, opacity: 0.65 },
  rangeCaption: { ...type.caption },
  disclaimer: { ...type.caption, marginTop: 10 },
});
