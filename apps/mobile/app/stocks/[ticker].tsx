import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { annualizedVolatility, maxDrawdown } from "@wariba/core/risk";
import { analyzeRealEquity, describeNetIncomeTrend, type RealEquityAnalysis, type RealSectorComparison } from "@wariba/core/real-analysis";
import { compactFcfa, compactVolume, dateFr, fcfa, millions, num, pct, ratio } from "@wariba/core/format";
import { companyProfile } from "@wariba/core/company-profiles";
import { GLOSSARY } from "@wariba/core/glossary";
import type { OHLCV } from "@wariba/core/types";
import { AdvancedChart } from "../../src/components/AdvancedChart";
import { YearComparison } from "../../src/components/YearComparison";
import type { WebChartMarker } from "../../src/components/chart/WebChart";
import { ActionButton, ChangePill, EmptyState, LoadingState, Metric, Page, Row, Section, SegmentedTabs } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { useSettingsStore, useWatchlistStore } from "../../src/stores";
import { countryFromTicker, sectorLabel } from "../../src/lib/sectors";
import { openTrustedExternalUrl } from "../../src/lib/external-links";
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

/** Cellule de la grille de stats dense (façon Webull : libellé au-dessus, valeur dessous). */
function StatCell({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "warn" }) {
  return (
    <View style={styles.statCell}>
      <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        style={[
          styles.statValue,
          tone === "up" && { color: colors.up },
          tone === "down" && { color: colors.down },
          tone === "warn" && { color: colors.warn },
        ]}
      >
        {value}
      </Text>
    </View>
  );
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

function AnalysisScore({
  label,
  value,
  risk = false,
}: {
  label: string;
  value: number;
  risk?: boolean;
}) {
  const favorable = risk ? 100 - value : value;
  const color = favorable >= 65 ? colors.up : favorable >= 40 ? colors.warn : colors.down;
  return (
    <View style={styles.analysisScore}>
      <Text style={styles.analysisScoreLabel}>{label}</Text>
      <Text style={[styles.analysisScoreValue, { color }]}>{value}</Text>
      <View style={styles.analysisScoreTrack}>
        <View style={[styles.analysisScoreFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function formatComparison(row: RealSectorComparison, value: number): string {
  if (row.metric === "per" || row.metric === "pb") return ratio(value);
  return pct(value, {
    signed: row.metric === "revenueGrowth" || row.metric === "netIncomeGrowth",
    digits: 1,
  });
}

function QuantitativeAnalysis({
  analysis,
  sector,
}: {
  analysis: RealEquityAnalysis;
  sector: string;
}) {
  const benchmark = analysis.benchmark.scope === "sector" ? sector : "marché BRVM";
  return (
    <Section
      title="Analyse quantitative"
      detail={`${analysis.methodologyVersion} · données réelles`}
    >
      <View style={styles.analysisHero}>
        <View style={styles.analysisOverall}>
          <Text style={styles.analysisOverallValue}>{analysis.overallScore}</Text>
          <Text style={styles.analysisOverallLabel}>score factuel / 100</Text>
        </View>
        <View style={styles.analysisHeroCopy}>
          <Text style={styles.analysisHeadline}>{analysis.insight.headline}</Text>
          <Text style={styles.analysisMeta}>
            {analysis.confidence.coveragePct} % des pondérations renseignées · comptes {analysis.fiscalYear} · benchmark {benchmark.toLowerCase()}
          </Text>
        </View>
      </View>

      <View style={styles.analysisScores}>
        <AnalysisScore label="Qualité" value={analysis.scores.quality} />
        <AnalysisScore label="Valorisation" value={analysis.scores.valuation} />
        <AnalysisScore label="Momentum" value={analysis.scores.momentum} />
        <AnalysisScore label="Risque" value={analysis.scores.risk} risk />
      </View>

      <Text style={styles.analysisSummary}>{analysis.insight.summary}</Text>

      {analysis.signals.length ? (
        <View style={styles.analysisSignals}>
          <Text style={styles.analysisBlockTitle}>Signaux factuels</Text>
          {analysis.signals.slice(0, 6).map((signal) => {
            const color = signal.tone === "positive"
              ? colors.up
              : signal.tone === "negative"
                ? colors.down
                : signal.tone === "warning"
                  ? colors.warn
                  : colors.ink3;
            return (
              <View key={signal.id} style={styles.analysisSignal}>
                <View style={[styles.analysisSignalDot, { backgroundColor: color }]} />
                <View style={styles.analysisSignalCopy}>
                  <Text style={[styles.analysisSignalTitle, { color }]}>{signal.label}</Text>
                  <Text style={styles.analysisSignalDetail}>{signal.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.analysisComparisons}>
        <Text style={styles.analysisBlockTitle}>
          Comparaison {benchmark} · médianes
        </Text>
        {analysis.comparisons.slice(0, 6).map((row) => {
          const favorable = row.higherIsBetter ? row.value >= row.median : row.value <= row.median;
          const favorableRank = row.higherIsBetter ? row.percentile : 100 - row.percentile;
          return (
            <View key={row.metric} style={styles.analysisComparison}>
              <View style={styles.analysisComparisonHeader}>
                <View style={styles.analysisComparisonCopy}>
                  <Text style={styles.analysisComparisonLabel}>{row.label}</Text>
                  <Text style={styles.analysisComparisonSample}>médiane · n={row.sampleSize}</Text>
                </View>
                <View style={styles.analysisComparisonValues}>
                  <Text style={[styles.analysisComparisonValue, { color: favorable ? colors.up : colors.warn }]}>
                    {formatComparison(row, row.value)}
                  </Text>
                  <Text style={styles.analysisComparisonMedian}>vs {formatComparison(row, row.median)}</Text>
                </View>
              </View>
              <View style={styles.analysisComparisonTrack}>
                <View
                  style={[
                    styles.analysisComparisonFill,
                    { width: `${Math.max(3, favorableRank)}%`, backgroundColor: favorable ? colors.up : colors.warn },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.analysisConfidence}>
        <Ionicons name="shield-checkmark-outline" size={17} color={colors.accent} />
        <View style={styles.analysisConfidenceCopy}>
          <Text style={styles.analysisConfidenceTitle}>Confiance {analysis.confidence.label.toLowerCase()}</Text>
          <Text style={styles.analysisConfidenceText}>{analysis.confidence.reasons.join(" ")}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Voir la formule, les pondérations et les limites"
        onPress={() => void openTrustedExternalUrl("https://wariba.app/methodologie#score-factuel")}
        style={({ pressed }) => [styles.analysisMethodLink, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="calculator-outline" size={16} color={colors.accent} />
        <Text style={styles.analysisMethodText}>Formule, pondérations et limites publiées</Text>
        <Ionicons name="open-outline" size={14} color={colors.ink3} />
      </Pressable>
      <Text style={styles.disclaimer}>Score descriptif, pas une prévision ni un conseil d&apos;achat ou de vente.</Text>
    </Section>
  );
}

export default function StockScreen() {
  const params = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const ticker = String(params.ticker ?? "SNTS").toUpperCase();
  const market = useMarketData();
  const loadSeries = market.loadSeries;
  const quote = market.quotes[ticker];
  const fundamental = market.fundamentals[ticker];
  const [series, setSeries] = useState<OHLCV[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState(false);
  const [tab, setTab] = useState<Tab>("chart");
  const watched = useWatchlistStore((state) => state.tickers.includes(ticker));
  const beginner = useSettingsStore((state) => state.experienceLevel === "debutant");
  const toggle = useWatchlistStore((state) => state.toggle);
  useEffect(() => {
    let cancelled = false;
    setSeries([]);
    setSeriesError(false);
    setSeriesLoading(true);
    void loadSeries(ticker)
      .then((next) => { if (!cancelled) setSeries(next); })
      .catch(() => { if (!cancelled) setSeriesError(true); })
      .finally(() => { if (!cancelled) setSeriesLoading(false); });
    return () => { cancelled = true; };
  }, [loadSeries, ticker]);
  const chartSeries = useMemo(() => {
    if (!quote || quote.quoteStatus !== "delayed-live") return series;
    if (String(series.at(-1)?.time ?? "") >= quote.asOfDate) return series;
    return [...series, {
      time: quote.asOfDate,
      open: quote.dayOpen,
      high: quote.dayHigh,
      low: quote.dayLow,
      close: quote.lastClose,
      volume: 0,
    }];
  }, [quote, series]);
  const riskSeries = useMemo(() => chartSeries.map((bar) => ({ time: String(bar.time), close: bar.close })), [chartSeries]);
  const risk = useMemo(() => ({ volatility: annualizedVolatility(riskSeries), drawdown: maxDrawdown(riskSeries) }), [riskSeries]);
  const documents = useMemo(() => market.documents.filter((document) => document.ticker === ticker).slice(0, 15), [market.documents, ticker]);
  const latestFinancialDocument = useMemo(
    () => documents.find((item) => item.type === "Résultats" || item.type === "États financiers"),
    [documents]
  );
  const operations = useMemo(() => documents.filter((item) => /capital|split|fusion/i.test(item.title)), [documents]);
  const news = useMemo(() => market.news.filter((item) => item.tickers.includes(ticker)).slice(0, 10), [market.news, ticker]);
  const realAnalysis = useMemo(
    () => analyzeRealEquity({ ticker, quotes: market.quotes, fundamentals: market.fundamentals }),
    [market.fundamentals, market.quotes, ticker]
  );
  const events = useMemo<WebChartMarker[]>(() => [
    ...(market.dividends[ticker] ?? []).map((item) => ({ time: item.date, kind: "dividend" as const, label: `D ${num(item.net)}` })),
    ...operations.map((item) => ({ time: item.date, kind: "operation" as const, label: "S" })),
    ...documents
      .filter((item) => item.type === "Résultats" || item.type === "États financiers")
      .map((item) => ({ time: item.date, kind: "result" as const, label: "R" })),
  ], [documents, market.dividends, operations, ticker]);

  if (!quote) return market.loading ? <LoadingState /> : <EmptyState title="Valeur introuvable" detail={`Aucune cotation pour ${ticker}.`} />;
  const description = companyProfile(ticker);
  const country = countryFromTicker(ticker);
  const capitalisation = fundamental?.sharesOutstanding ? fundamental.sharesOutstanding * quote.lastClose : null;
  const week52Share = quote.week52High > quote.week52Low
    ? Math.min(100, Math.max(0, ((quote.lastClose - quote.week52Low) / (quote.week52High - quote.week52Low)) * 100))
    : 100;
  const bpa = fundamental?.sharesOutstanding ? (fundamental.netIncomeM * 1e6) / fundamental.sharesOutstanding : null;

  const refreshAll = async () => {
    setSeriesError(false);
    setSeriesLoading(true);
    try {
      const [, nextSeries] = await Promise.all([market.refresh(), loadSeries(ticker, { force: true })]);
      setSeries(nextSeries);
    } catch {
      setSeriesError(true);
    } finally {
      setSeriesLoading(false);
    }
  };

  const retrySeries = async () => {
    setSeriesError(false);
    setSeriesLoading(true);
    try {
      setSeries(await loadSeries(ticker, { force: true }));
    } catch {
      setSeriesError(true);
    } finally {
      setSeriesLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
    <Page refreshing={market.refreshing} onRefresh={() => void refreshAll()}>
      <Stack.Screen options={{ title: ticker }} />

      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(280)} style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text numberOfLines={2} style={styles.name}>
            {quote.name} · {sectorLabel(quote.sectorCode)}{country ? ` · ${country}` : ""}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{fcfa(quote.lastClose)}</Text>
            <ChangePill value={quote.dayChangePct} label={pct(quote.dayChangePct, { signed: true, digits: 2 })} />
          </View>
          <Text style={styles.asOf}>
            {quote.quoteStatus === "delayed-live"
              ? `Cours BRVM différé de 15 min · ${quote.asOfTimestamp ? new Date(quote.asOfTimestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" }) : dateFr(quote.asOfDate)}`
              : `Clôture officielle du ${dateFr(quote.asOfDate)}`}
          </Text>
          <View style={styles.infoChips}>
            {quote.per !== null ? (
              <View style={styles.infoChip}><Text style={styles.infoChipLabel}>PER</Text><Text style={styles.infoChipValue}>{ratio(quote.per)}</Text></View>
            ) : null}
            {quote.netYieldPct !== null ? (
              <View style={styles.infoChip}><Text style={styles.infoChipLabel}>Rdt net</Text><Text style={styles.infoChipValue}>{pct(quote.netYieldPct, { signed: false, digits: 1 })}</Text></View>
            ) : null}
            {capitalisation !== null ? (
              <View style={styles.infoChip}><Text style={styles.infoChipLabel}>Capi</Text><Text style={styles.infoChipValue}>{compactFcfa(capitalisation)}</Text></View>
            ) : null}
          </View>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStatRow}><Text style={styles.heroStatLabel}>H/B jour</Text><Text style={styles.heroStatValue}>{num(quote.dayHigh)}·{num(quote.dayLow)}</Text></View>
          <View style={styles.heroStatRow}><Text style={styles.heroStatLabel}>Vol</Text><Text style={styles.heroStatValue}>{quote.quoteStatus === "delayed-live" ? "—" : compactVolume(quote.dayVolume)}</Text></View>
          <View style={styles.heroStatRow}><Text style={styles.heroStatLabel}>52 s</Text><Text style={styles.heroStatValue}>{num(quote.week52High)}·{num(quote.week52Low)}</Text></View>
        </View>
      </Animated.View>

      <SegmentedTabs tabs={STOCK_TABS} active={tab} onChange={setTab} />

      {tab === "chart" ? <Animated.View key="chart" entering={reduceMotion ? undefined : FadeIn.duration(200)} style={styles.tabContent}>
        {seriesLoading ? <LoadingState label="Chargement de la série…" /> : seriesError ? (
          <View style={styles.seriesError}>
            <EmptyState icon="cloud-offline-outline" title="Historique indisponible" detail="La série n'a pas pu être validée ou téléchargée. Les autres données restent accessibles." />
            <ActionButton label="Réessayer" icon="refresh-outline" onPress={() => void retrySeries()} />
          </View>
        ) : chartSeries.length ? (
          <AdvancedChart ticker={ticker} data={chartSeries} previousClose={quote.prevClose} week52High={quote.week52High} week52Low={quote.week52Low} events={events} />
        ) : <EmptyState icon="analytics-outline" title="Aucun historique" detail={`Aucune séance exploitable n'est disponible pour ${ticker}.`} />}

        <Section title="Résumé" detail="Séance et variations">
          <View style={styles.statsGrid}>
            <StatCell label="Ouverture" value={fcfa(quote.dayOpen)} />
            <StatCell label="+ Haut" value={fcfa(quote.dayHigh)} />
            <StatCell label="+ Bas" value={fcfa(quote.dayLow)} />
            <StatCell label="Veille" value={fcfa(quote.prevClose)} />
            <StatCell label="Volume" value={quote.quoteStatus === "delayed-live" ? "—" : compactVolume(quote.dayVolume)} tone={quote.volumeRatio >= 3 ? "warn" : undefined} />
            <StatCell label="Val. échangée" value={quote.dayValueFcfa ? compactFcfa(quote.dayValueFcfa) : "—"} />
            <StatCell label="52 s haut" value={fcfa(quote.week52High)} />
            <StatCell label="52 s bas" value={fcfa(quote.week52Low)} />
            <StatCell label="Ratio vol." value={quote.quoteStatus === "delayed-live" ? "—" : `${quote.volumeRatio.toFixed(1)}×`} tone={quote.volumeRatio >= 3 ? "warn" : undefined} />
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
              <Text style={styles.rangeLabel}>Clôtures extrêmes 52 semaines</Text>
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
      </Animated.View> : null}

      {tab === "fundamentals" ? <Animated.View key="fundamentals" entering={reduceMotion ? undefined : FadeIn.duration(200)} style={styles.tabContent}>
        {beginner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Comprendre ces chiffres — ouvrir la méthodologie"
            onPress={() => void openTrustedExternalUrl("https://wariba.app/methodologie")}
            style={({ pressed }) => [styles.beginnerBanner, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="school-outline" size={17} color={colors.accent} />
            <Text style={styles.beginnerBannerText}>
              Comprendre ces chiffres — chaque terme est expliqué dans le lexique en bas de page, la méthode complète sur le site.
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.ink3} />
          </Pressable>
        ) : null}
        <Section
          title="Fondamentaux"
          detail={fundamental ? `Exercice ${fundamental.fiscalYear} · publié le ${dateFr(fundamental.publishedOn)}` : undefined}
        >
          {latestFinancialDocument ? (
            <View style={styles.latestPublication}>
              <Row
                icon="document-text-outline"
                title={`Dernière publication · ${latestFinancialDocument.title}`}
                detail={`${dateFr(latestFinancialDocument.date)} · ${fundamental?.source === latestFinancialDocument.url ? "chiffres intégrés et recoupés avec N-1" : "document officiel disponible ; extraction automatique sous contrôle"}`}
                onPress={() => void openTrustedExternalUrl(latestFinancialDocument.url)}
              />
            </View>
          ) : null}
          <Text style={styles.metricHelp}>Touchez une carte marquée ⓘ pour afficher sa définition et sa formule.</Text>
          <View style={styles.metrics}>
            <Metric
              label="PER BRVM"
              value={quote.per !== null && (!fundamental || fundamental.netIncomeM > 0) ? ratio(quote.per) : "—"}
              detail={
                fundamental?.netIncomeM && fundamental.netIncomeM < 0
                  ? `Non significatif : résultat net ${fundamental.fiscalYear} négatif`
                  : `Bulletin BRVM du ${dateFr(quote.asOfDate)}`
              }
              explanation={GLOSSARY.per.def}
            />
            <Metric label="Rendement net" value={quote.netYieldPct !== null ? pct(quote.netYieldPct, { signed: false, digits: 2 }) : "—"} tone={quote.netYieldPct !== null && quote.netYieldPct >= 6 ? "up" : "default"} explanation={GLOSSARY["rendement-net"].def} />
            <Metric label="Vol. moyen 30 j" value={compactVolume(quote.avgVolume30d)} explanation={GLOSSARY["vol-moyen"].def} />
            <Metric label="Dernier dividende net" value={quote.lastDividendNet !== null ? fcfa(quote.lastDividendNet) : "—"} detail={quote.lastDividendDate ? `Payé le ${dateFr(quote.lastDividendDate)}` : undefined} explanation={GLOSSARY["dividende-net"].def} />
            {fundamental?.sharesOutstanding ? <>
              <Metric label="Capitalisation" value={compactFcfa(fundamental.sharesOutstanding * quote.lastClose)} detail={`${(fundamental.sharesOutstanding / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M d'actions`} explanation={GLOSSARY.capitalisation.def} />
              {bpa !== null ? <Metric label={`BPA ${fundamental.fiscalYear}`} value={fcfa(bpa)} detail="Bénéfice net par action" explanation={GLOSSARY.bpa.def} /> : null}
              {fundamental.equityM ? <Metric label="P/B" value={ratio(quote.lastClose / ((fundamental.equityM * 1e6) / fundamental.sharesOutstanding))} explanation={GLOSSARY.pb.def} /> : null}
            </> : null}
            {fundamental?.equityM ? <Metric label={`ROE ${fundamental.fiscalYear}`} value={pct((fundamental.netIncomeM / fundamental.equityM) * 100, { signed: false, digits: 1 })} explanation={GLOSSARY.roe.def} /> : null}
            {fundamental ? <>
              <Metric label={`${fundamental.revenueLabel} ${fundamental.fiscalYear}`} value={millions(fundamental.revenueM)} detail={(() => {
                const growth = growthPct(fundamental.revenueM, fundamental.revenuePrevM);
                return growth !== null ? `${pct(growth, { digits: 1 })} vs ${fundamental.fiscalYear - 1}` : undefined;
              })()} explanation={GLOSSARY[fundamental.revenueLabel === "PNB" ? "pnb" : "chiffre-affaires"].def} />
              <Metric label={`Résultat net ${fundamental.fiscalYear}`} value={millions(fundamental.netIncomeM)} tone={fundamental.netIncomeM >= 0 ? "up" : "down"} detail={(() => {
                const trend = describeNetIncomeTrend(
                  fundamental.netIncomeM,
                  fundamental.netIncomePrevM
                );
                return trend?.changePct !== null && trend?.changePct !== undefined
                  ? `${trend.label} de ${pct(Math.abs(trend.changePct), { signed: false, digits: 1 })} vs ${fundamental.fiscalYear - 1}`
                  : trend?.label;
              })()} explanation={GLOSSARY["resultat-net"].def} />
              <Metric label="Marge nette" value={pct((fundamental.netIncomeM / fundamental.revenueM) * 100, { signed: false, digits: 1 })} explanation={GLOSSARY["marge-nette"].def} />
              {fundamental.ordinaryIncomeM !== null ? <Metric label="Résultat ordinaire" value={millions(fundamental.ordinaryIncomeM)} tone={fundamental.ordinaryIncomeM < 0 ? "down" : "default"} explanation={GLOSSARY["resultat-ordinaire"].def} /> : null}
              {fundamental.cirPct !== null ? <Metric label="Coefficient d'exploitation" value={pct(fundamental.cirPct, { signed: false, digits: 1 })} detail={fundamental.cirPrevPct !== null ? `${pct(fundamental.cirPrevPct, { signed: false, digits: 1 })} en ${fundamental.fiscalYear - 1}` : undefined} explanation={GLOSSARY.cir.def} /> : null}
              {fundamental.costOfRiskM !== null ? <Metric label="Coût du risque" value={millions(fundamental.costOfRiskM)} detail={fundamental.costOfRiskM < 0 ? "Négatif = reprise nette" : undefined} explanation={GLOSSARY["cout-du-risque"].def} /> : null}
              {fundamental.depositsM !== null ? <Metric label="Dépôts clientèle" value={millions(fundamental.depositsM)} detail="L'argent que les clients confient" explanation={GLOSSARY["depots-clientele"].def} /> : null}
              {fundamental.loansM !== null ? <Metric label="Crédits clientèle" value={millions(fundamental.loansM)} detail={fundamental.depositsM ? `${pct((fundamental.loansM / fundamental.depositsM) * 100, { signed: false, digits: 0 })} des dépôts prêtés` : undefined} explanation={GLOSSARY["credits-clientele"].def} /> : null}
              {fundamental.proposedGrossDividend !== null ? <Metric label="Dividende brut proposé" value={fcfa(fundamental.proposedGrossDividend)} tone="accent" detail={`Au titre de ${fundamental.fiscalYear}, soumis à l'AG`} explanation={GLOSSARY["dividende-propose"].def} /> : null}
            </> : null}
          </View>
          {fundamental ? <>
            <View style={styles.yearBlock}>
              <Text style={styles.yearComparisonTitle}>Comparaison {fundamental.fiscalYear - 1} / {fundamental.fiscalYear}</Text>
              <Text style={styles.yearComparisonDetail}>Sélectionnez une métrique pour comparer les montants publiés et leur variation.</Text>
              <YearComparison fundamental={fundamental} />
            </View>
            <Row icon="open-outline" title="Document source BRVM" detail="États financiers officiels dont sont issus ces chiffres" onPress={() => void openTrustedExternalUrl(fundamental.source)} />
          </> : (
            <EmptyState title="Fondamentaux détaillés indisponibles" detail="Aucun état financier vérifié n'est encore curé pour cette société." />
          )}
        </Section>
        {realAnalysis ? (
          <QuantitativeAnalysis analysis={realAnalysis} sector={sectorLabel(quote.sectorCode)} />
        ) : null}
        <Section title="Historique des dividendes" detail="Montants nets par action, bulletins officiels">
          {(market.dividends[ticker] ?? []).length
            ? [...(market.dividends[ticker] ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((item, index) => (
              <Row key={`${item.date}-${index}`} icon="cash-outline" title={`Dividende net`} detail={`Payé le ${dateFr(item.date)}`} value={fcfa(item.net)} valueDetail="par action" />
            ))
            : <EmptyState icon="cash-outline" title="Aucun versement" detail={`Aucun dividende enregistré pour ${ticker} depuis 2019.`} />}
        </Section>
        {beginner ? (
          <Section title="Lexique express" detail="Explications sans jargon">
            {(["per", "rendement-net", "dividende-net", "capitalisation"] as const).map((key) => (
              <View key={key} style={styles.lexiqueRow}>
                <Text style={styles.lexiqueTerm}>{GLOSSARY[key].label}</Text>
                <Text style={styles.lexiqueDef}>{GLOSSARY[key].def}</Text>
              </View>
            ))}
          </Section>
        ) : null}
      </Animated.View> : null}

      {tab === "risk" ? <Animated.View key="risk" entering={reduceMotion ? undefined : FadeIn.duration(200)} style={styles.tabContent}>
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
            ? operations.map((item) => <Row key={item.url} icon="git-branch-outline" title={item.title} detail={`${item.type} · ${dateFr(item.date)}`} onPress={() => void openTrustedExternalUrl(item.url)} />)
            : <EmptyState icon="git-branch-outline" title="Aucune opération" detail="Aucune opération sur capital identifiée pour cette société." />}
        </Section>
      </Animated.View> : null}

      {tab === "news" ? <Animated.View key="news" entering={reduceMotion ? undefined : FadeIn.duration(200)} style={styles.tabContent}>
        <Section title="Actualités" detail={news.length ? `${news.length} articles liés` : undefined}>
          {news.length
            ? news.map((item) => <Row key={item.link} icon="newspaper-outline" title={item.title} detail={`${item.source} · ${item.publishedAt.slice(0, 10)}`} onPress={() => void openTrustedExternalUrl(item.link)} />)
            : <EmptyState icon="newspaper-outline" title="Aucun article" detail={`Aucune actualité sourcée liée à ${ticker}.`} />}
        </Section>
        <Section title="Publications officielles" detail={`${documents.length} récentes`}>
          {documents.length
            ? documents.map((document) => <Row key={document.url} icon="document-text-outline" title={document.title} detail={`${document.type} · ${dateFr(document.date)}`} onPress={() => void openTrustedExternalUrl(document.url)} />)
            : <EmptyState icon="document-text-outline" title="Aucune publication" detail={`Aucun document officiel lié à ${ticker} pour le moment.`} />}
        </Section>
      </Animated.View> : null}
      <View style={styles.footerSpacer} />
    </Page>

    <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Créer une alerte de prix pour ${ticker}`}
        onPress={() => router.push(`/alerts?ticker=${ticker}`)}
        style={({ pressed }) => [styles.footerPrimary, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="notifications-outline" size={16} color={colors.onAccent} />
        <Text style={styles.footerPrimaryText}>Créer une alerte</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={watched ? `Retirer ${ticker} de la watchlist` : `Ajouter ${ticker} à la watchlist`}
        accessibilityState={{ selected: watched }}
        onPress={() => toggle(ticker)}
        style={({ pressed }) => [styles.footerSecondary, watched && styles.footerSecondaryActive, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name={watched ? "star" : "star-outline"} size={16} color={watched ? colors.accent : colors.ink2} />
        <Text style={[styles.footerSecondaryText, watched && { color: colors.accent }]}>{watched ? "Suivie" : "Suivre"}</Text>
      </Pressable>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", rowGap: 12,
    padding: 14, marginBottom: 10,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  statCell: { width: "33.33%", gap: 3, paddingRight: 8 },
  statLabel: { ...type.label, fontSize: 9.5 },
  statValue: { color: colors.ink, fontSize: 13, fontWeight: "700", fontVariant: tabular },
  footerSpacer: { height: 58 },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 10,
    backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1,
  },
  footerPrimary: {
    flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: colors.accent, borderRadius: radius.lg,
  },
  footerPrimaryText: { color: colors.onAccent, fontSize: 14, fontWeight: "800" },
  footerSecondary: {
    flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: colors.surface2, borderColor: colors.lineStrong, borderWidth: 1, borderRadius: radius.lg,
  },
  footerSecondaryActive: { borderColor: "rgba(32,201,130,0.5)", backgroundColor: colors.accentSoft },
  footerSecondaryText: { color: colors.ink2, fontSize: 14, fontWeight: "700" },
  hero: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  tabContent: { gap: 26 },
  seriesError: { gap: 12, alignItems: "center" },
  heroStats: { gap: 6, paddingTop: 4 },
  heroStatRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  heroStatLabel: { ...type.label, fontSize: 9 },
  heroStatValue: { color: colors.ink2, fontSize: 11, fontWeight: "600", fontVariant: tabular },
  yearBlock: { marginTop: 12, marginBottom: 12 },
  yearComparisonTitle: { ...type.title, fontSize: 14, marginBottom: 3 },
  yearComparisonDetail: { ...type.caption, marginBottom: 10 },
  latestPublication: {
    marginBottom: 12, paddingHorizontal: 12, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, borderColor: "rgba(32,201,130,0.35)", borderWidth: 1,
  },
  infoChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: radius.full,
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1,
  },
  infoChipLabel: { ...type.label, fontSize: 9 },
  infoChipValue: { color: colors.ink, fontSize: 11.5, fontWeight: "700", fontVariant: tabular },
  heroCopy: { flex: 1, gap: 6 },
  name: { ...type.sub },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, fontVariant: tabular },
  asOf: { ...type.caption },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricHelp: { ...type.caption, color: colors.ink2, marginBottom: 8 },
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
  analysisHero: {
    flexDirection: "row", alignItems: "stretch", gap: 12, padding: 13,
    backgroundColor: colors.accentSoft, borderColor: "rgba(32,201,130,0.35)", borderWidth: 1, borderRadius: radius.lg,
  },
  analysisOverall: {
    width: 92, alignItems: "center", justifyContent: "center", padding: 9,
    backgroundColor: colors.surface, borderColor: "rgba(32,201,130,0.35)", borderWidth: 1, borderRadius: radius.md,
  },
  analysisOverallValue: { color: colors.accent, fontSize: 30, fontWeight: "900", letterSpacing: -0.8, fontVariant: tabular },
  analysisOverallLabel: { ...type.caption, fontSize: 9.5, textAlign: "center", marginTop: 1 },
  analysisHeroCopy: { flex: 1, justifyContent: "center", gap: 5 },
  analysisHeadline: { ...type.body, fontSize: 13.5 },
  analysisMeta: { ...type.caption, lineHeight: 16 },
  analysisScores: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  analysisScore: {
    flexGrow: 1, flexBasis: "44%", gap: 5, padding: 11,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md,
  },
  analysisScoreLabel: { ...type.label, fontSize: 9.5 },
  analysisScoreValue: { fontSize: 20, fontWeight: "800", fontVariant: tabular },
  analysisScoreTrack: { height: 4, overflow: "hidden", backgroundColor: colors.surface2, borderRadius: radius.full },
  analysisScoreFill: { height: 4, borderRadius: radius.full },
  analysisSummary: { ...type.sub, marginTop: 10, lineHeight: 19 },
  analysisSignals: { gap: 10, marginTop: 10, padding: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg },
  analysisBlockTitle: { ...type.label, color: colors.ink2 },
  analysisSignal: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  analysisSignalDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  analysisSignalCopy: { flex: 1, gap: 2 },
  analysisSignalTitle: { fontSize: 12, fontWeight: "700" },
  analysisSignalDetail: { ...type.caption, lineHeight: 16 },
  analysisComparisons: { gap: 9, marginTop: 10 },
  analysisComparison: { padding: 11, gap: 8, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md },
  analysisComparisonHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  analysisComparisonCopy: { flex: 1 },
  analysisComparisonLabel: { color: colors.ink, fontSize: 12.5, fontWeight: "700" },
  analysisComparisonSample: { ...type.caption, fontSize: 10, marginTop: 2 },
  analysisComparisonValues: { alignItems: "flex-end" },
  analysisComparisonValue: { fontSize: 13, fontWeight: "800", fontVariant: tabular },
  analysisComparisonMedian: { ...type.caption, fontSize: 10, fontVariant: tabular },
  analysisComparisonTrack: { height: 4, overflow: "hidden", backgroundColor: colors.surface2, borderRadius: radius.full },
  analysisComparisonFill: { height: 4, borderRadius: radius.full },
  analysisConfidence: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 10, padding: 12,
    backgroundColor: colors.surface2, borderRadius: radius.lg,
  },
  analysisConfidenceCopy: { flex: 1, gap: 3 },
  analysisConfidenceTitle: { color: colors.ink, fontSize: 12.5, fontWeight: "700" },
  analysisConfidenceText: { ...type.caption, lineHeight: 16 },
  analysisMethodLink: {
    minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8, paddingHorizontal: 12,
    borderColor: colors.lineStrong, borderWidth: 1, borderRadius: radius.lg,
  },
  analysisMethodText: { flex: 1, color: colors.accent, fontSize: 12.5, fontWeight: "700" },
  beginnerBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 13,
    backgroundColor: colors.accentSoft, borderColor: "rgba(32,201,130,0.35)", borderWidth: 1, borderRadius: radius.lg,
  },
  beginnerBannerText: { flex: 1, ...type.caption, color: colors.ink2, lineHeight: 16 },
  lexiqueRow: { paddingVertical: 11, gap: 4, borderBottomColor: colors.line, borderBottomWidth: 1 },
  lexiqueTerm: { ...type.body, fontWeight: "700", fontSize: 13 },
  lexiqueDef: { ...type.caption, lineHeight: 17 },
});
