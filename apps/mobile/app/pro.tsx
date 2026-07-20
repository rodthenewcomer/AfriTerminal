import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  analyzeRealEquity,
  REAL_ANALYSIS_VERSION,
  type RealEquityAnalysis,
} from "@wariba/core/real-analysis";
import { dateFr, fcfa, pct } from "@wariba/core/format";
import type { RealQuote } from "@wariba/core/types";
import { ActionButton, EmptyState, LoadingState, Page, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { useMobileAuth } from "../src/providers/AuthProvider";
import { openTrustedExternalUrl } from "../src/lib/external-links";
import { sectorLabel } from "../src/lib/sectors";
import { colors, radius, tabular, type } from "../src/theme";

type SortKey = "overall" | "quality" | "valuation" | "momentum" | "dividend" | "liquidity" | "protection";

interface ResearchRow {
  quote: RealQuote;
  analysis: RealEquityAnalysis;
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: "overall", label: "Global" },
  { id: "quality", label: "Qualité" },
  { id: "valuation", label: "Valorisation" },
  { id: "momentum", label: "Momentum" },
  { id: "dividend", label: "Dividende" },
  { id: "liquidity", label: "Liquidité" },
  { id: "protection", label: "Protection" },
];

const FACTORS = [
  { key: "quality", label: "Qualité", inverse: false },
  { key: "valuation", label: "Valorisation", inverse: false },
  { key: "momentum", label: "Momentum", inverse: false },
  { key: "risk", label: "Risque", inverse: true },
  { key: "dividend", label: "Dividende", inverse: false },
  { key: "liquidity", label: "Liquidité", inverse: false },
] as const;

function scoreColor(value: number): string {
  if (value >= 65) return colors.up;
  if (value >= 40) return colors.warn;
  return colors.down;
}

function Factor({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const favorable = inverse ? 100 - value : value;
  return (
    <View style={styles.factor}>
      <View style={styles.factorHeader}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={styles.factorValue}>{value}</Text>
      </View>
      <View style={styles.factorTrack}>
        <View
          style={[
            styles.factorFill,
            { width: `${Math.max(3, value)}%`, backgroundColor: scoreColor(favorable) },
          ]}
        />
      </View>
    </View>
  );
}

function ResearchCard({
  row,
  rank,
  selected,
  onCompare,
  onOpen,
}: {
  row: ResearchRow;
  rank: number;
  selected: boolean;
  onCompare: () => void;
  onOpen: () => void;
}) {
  const { quote, analysis } = row;
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir la fiche ${quote.ticker}`}
          onPress={onOpen}
          style={({ pressed }) => [styles.company, pressed && styles.pressed]}
        >
          <Text style={styles.rank}>{rank}</Text>
          <View style={styles.companyCopy}>
            <Text style={styles.ticker}>{quote.ticker} <Text style={styles.name}>· {quote.name}</Text></Text>
            <Text style={styles.meta}>{sectorLabel(quote.sectorCode)} · comptes {analysis.fiscalYear}</Text>
          </View>
        </Pressable>
        <View style={styles.score}>
          <Text style={styles.scoreValue}>{analysis.overallScore}</Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
      </View>

      <View style={styles.factorGrid}>
        {FACTORS.map((factor) => (
          <Factor key={factor.key} label={factor.label} value={analysis.scores[factor.key]} inverse={factor.inverse} />
        ))}
      </View>

      <View style={styles.signalRow}>
        {analysis.signals.slice(0, 3).map((signal) => (
          <View
            key={signal.id}
            style={[
              styles.signal,
              {
                borderColor: signal.tone === "positive"
                  ? colors.up
                  : signal.tone === "negative"
                    ? colors.down
                    : signal.tone === "warning"
                      ? colors.warn
                      : colors.line,
              },
            ]}
          >
            <Text numberOfLines={1} style={styles.signalText}>{signal.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.marketFacts}>
          <Text style={styles.fact}>{fcfa(quote.lastClose)}</Text>
          <Text style={[styles.fact, { color: quote.ytdChangePct >= 0 ? colors.up : colors.down }]}>YTD {pct(quote.ytdChangePct, { signed: true, digits: 1 })}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${selected ? "Retirer" : "Ajouter"} ${quote.ticker} ${selected ? "de" : "à"} la comparaison`}
          onPress={onCompare}
          style={({ pressed }) => [styles.compare, selected && styles.compareActive, pressed && styles.pressed]}
        >
          <Ionicons name={selected ? "checkmark" : "git-compare-outline"} size={15} color={selected ? colors.onAccent : colors.accent} />
          <Text style={[styles.compareText, selected && styles.compareTextActive]}>{selected ? "Ajouté" : "Comparer"}</Text>
        </Pressable>
      </View>
      <Text style={styles.sourceLine}>Publié le {dateFr(analysis.publishedOn)} · confiance {analysis.confidence.label.toLowerCase()} · couverture {analysis.confidence.coveragePct} %</Text>
    </View>
  );
}

export default function ProScreen() {
  const router = useRouter();
  const market = useMarketData();
  const auth = useMobileAuth();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("overall");
  const [selected, setSelected] = useState<string[]>([]);
  const [access, setAccess] = useState<"checking" | "guest" | "free" | "pro" | "error">("checking");

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session?.access_token) {
      setAccess("guest");
      return;
    }
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!baseUrl) {
      setAccess("error");
      return;
    }
    let active = true;
    setAccess("checking");
    void fetch(`${baseUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("entitlement");
        const account = await response.json() as {
          subscription?: { plan?: string; status?: string };
          entitlements?: { key: string; enabled: boolean }[];
        };
        const pro =
          (account.subscription?.plan === "pro" &&
            ["active", "trialing"].includes(account.subscription?.status ?? "")) ||
          account.entitlements?.some((item) => item.key === "research_exports" && item.enabled) === true;
        if (active) setAccess(pro ? "pro" : "free");
      })
      .catch(() => { if (active) setAccess("error"); });
    return () => { active = false; };
  }, [auth.loading, auth.session?.access_token]);

  const allRows = useMemo<ResearchRow[]>(
    () => Object.values(market.quotes).flatMap((quote) => {
      const analysis = analyzeRealEquity({
        ticker: quote.ticker,
        quotes: market.quotes,
        fundamentals: market.fundamentals,
      });
      return analysis ? [{ quote, analysis }] : [];
    }),
    [market.fundamentals, market.quotes]
  );

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return allRows
      .filter(({ quote }) => !normalized || `${quote.ticker} ${quote.name}`.toLocaleLowerCase("fr").includes(normalized))
      .sort((a, b) => {
        if (sort === "quality") return b.analysis.scores.quality - a.analysis.scores.quality;
        if (sort === "valuation") return b.analysis.scores.valuation - a.analysis.scores.valuation;
        if (sort === "momentum") return b.analysis.scores.momentum - a.analysis.scores.momentum;
        if (sort === "dividend") return b.analysis.scores.dividend - a.analysis.scores.dividend;
        if (sort === "liquidity") return b.analysis.scores.liquidity - a.analysis.scores.liquidity;
        if (sort === "protection") return a.analysis.scores.risk - b.analysis.scores.risk;
        return b.analysis.overallScore - a.analysis.overallScore || a.quote.ticker.localeCompare(b.quote.ticker);
      });
  }, [allRows, query, sort]);

  const compared = useMemo(
    () => selected.flatMap((ticker) => allRows.find((row) => row.quote.ticker === ticker) ?? []),
    [allRows, selected]
  );
  const accounts2025 = allRows.filter((row) => row.analysis.fiscalYear === 2025).length;
  const averageCoverage = Math.round(
    allRows.reduce((sum, row) => sum + row.analysis.confidence.coveragePct, 0) / Math.max(1, allRows.length)
  );

  const toggleCompare = (ticker: string) => setSelected((current) => {
    if (current.includes(ticker)) return current.filter((item) => item !== ticker);
    return current.length >= 2 ? [current[1], ticker] : [...current, ticker];
  });

  if (access === "checking") {
    return <Page><LoadingState label="Vérification de l’accès Pro…" /></Page>;
  }

  if (access !== "pro") {
    const guest = access === "guest";
    return (
      <Page>
        <View style={styles.gate}>
          <View style={styles.proBadge}>
            <Ionicons name="lock-closed" size={13} color={colors.accent} />
            <Text style={styles.proBadgeText}>WARIBA PRO · ACCÈS PROTÉGÉ</Text>
          </View>
          <Text style={styles.heroTitle}>Les faits restent publics. La recherche avancée devient Pro.</Text>
          <Text style={styles.heroDetail}>
            Cours, fondamentaux, documents, actualités et graphiques essentiels restent accessibles. Laboratoire 48, comparaisons et alertes avancées nécessitent un compte Pro.
          </Text>
          <View style={styles.gateFeatures}>
            {["Laboratoire 48", "Comparaison multi-facteurs", "Exports et filtres illimités", "Alertes avancées"].map((feature) => (
              <View key={feature} style={styles.gateFeature}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={styles.gateFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.gatePrice}>3 000 FCFA / mois</Text>
          <Text style={styles.sourceLine}>Un même droit sur le web, iOS et Android.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(guest ? "/(auth)/sign-in" : "/account")}
            style={styles.gatePrimary}
          >
            <Text style={styles.gatePrimaryText}>
              {guest ? "Se connecter" : access === "error" ? "Vérifier mon compte" : "Activer Pro"}
            </Text>
          </Pressable>
          {guest ? (
            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/sign-up")} style={styles.gateSecondary}>
              <Text style={styles.gateSecondaryText}>Créer un compte</Text>
            </Pressable>
          ) : null}
        </View>
      </Page>
    );
  }

  return (
    <Page refreshing={market.refreshing} onRefresh={() => void market.refresh()}>
      <View style={styles.hero}>
        <View style={styles.proBadge}>
          <Ionicons name="sparkles" size={13} color={colors.accent} />
          <Text style={styles.proBadgeText}>WARIBA PRO · COMPTE ACTIF</Text>
        </View>
        <Text style={styles.heroTitle}>Laboratoire 48</Text>
        <Text style={styles.heroDetail}>Même méthode pour toute la cote : quatre piliers, scores complémentaires Dividende/Liquidité, signaux, confiance et fraîcheur. Aucun verdict d’achat ou de vente.</Text>
        <View style={styles.summary}>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{allRows.length}/48</Text><Text style={styles.summaryLabel}>analysées</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{accounts2025}</Text><Text style={styles.summaryLabel}>comptes 2025</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{averageCoverage} %</Text><Text style={styles.summaryLabel}>couverture</Text></View>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.ink3} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Ticker ou société" placeholderTextColor={colors.ink3} autoCapitalize="characters" style={styles.searchInput} />
        {query ? <Pressable hitSlop={8} onPress={() => setQuery("")}><Ionicons name="close-circle" size={17} color={colors.ink3} /></Pressable> : null}
      </View>

      <Section title="Classer par" detail={REAL_ANALYSIS_VERSION}>
        <View style={styles.chips}>
          {SORTS.map((item) => <ActionButton key={item.id} label={item.label} active={sort === item.id} onPress={() => setSort(item.id)} />)}
        </View>
      </Section>

      {compared.length ? (
        <Section title="Comparaison" detail={compared.length === 1 ? "Ajoutez un deuxième titre" : "2 titres · mêmes facteurs"}>
          <View style={styles.comparePanel}>
            {compared.map(({ quote, analysis }) => (
              <View key={quote.ticker} style={styles.compareCompany}>
                <View style={styles.compareHeader}><Text style={styles.compareTicker}>{quote.ticker}</Text><Text style={styles.compareScore}>{analysis.overallScore}</Text></View>
                {FACTORS.map((factor) => <Factor key={factor.key} label={factor.label} value={analysis.scores[factor.key]} inverse={factor.inverse} />)}
                <Text style={styles.compareMeta}>Comptes {analysis.fiscalYear} · {analysis.confidence.coveragePct} % couverts</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Les 48 actions" detail={`${rows.length} résultat${rows.length > 1 ? "s" : ""}`}>
        {rows.length
          ? rows.map((row, index) => (
              <ResearchCard
                key={row.quote.ticker}
                row={row}
                rank={index + 1}
                selected={selected.includes(row.quote.ticker)}
                onCompare={() => toggleCompare(row.quote.ticker)}
                onOpen={() => router.push(`/stocks/${row.quote.ticker}`)}
              />
            ))
          : <EmptyState icon="search-outline" title="Aucun résultat" detail="Changez la recherche." />}
      </Section>

      <Pressable
        accessibilityRole="link"
        onPress={() => void openTrustedExternalUrl("https://wariba.app/methodologie#score-factuel")}
        style={({ pressed }) => [styles.method, pressed && styles.pressed]}
      >
        <Ionicons name="calculator-outline" size={17} color={colors.accent} />
        <View style={styles.methodCopy}>
          <Text style={styles.methodTitle}>Formule et limites publiées</Text>
          <Text style={styles.methodDetail}>Score central : Qualité 35 % · Valorisation 20 % · Momentum 25 % · Protection 20 %. Dividende et Liquidité restent complémentaires.</Text>
        </View>
        <Ionicons name="open-outline" size={14} color={colors.ink3} />
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  gate: { gap: 14, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "rgba(32,201,130,0.30)", backgroundColor: colors.surface },
  gateFeatures: { gap: 9, paddingVertical: 4 },
  gateFeature: { flexDirection: "row", alignItems: "center", gap: 9 },
  gateFeatureText: { ...type.body, color: colors.ink2 },
  gatePrice: { color: colors.ink, fontSize: 24, fontWeight: "900", fontVariant: tabular },
  gatePrimary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.accent },
  gatePrimaryText: { color: colors.onAccent, fontSize: 14, fontWeight: "800" },
  gateSecondary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  gateSecondaryText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  hero: { gap: 10, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: "rgba(32,201,130,0.30)", backgroundColor: colors.surface },
  proBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.accentSoft },
  proBadgeText: { ...type.label, color: colors.accent, fontSize: 9.5 },
  heroTitle: { ...type.display, fontSize: 30 },
  heroDetail: { ...type.sub, lineHeight: 19 },
  summary: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, marginTop: 2 },
  summaryItem: { flex: 1 },
  summaryValue: { color: colors.ink, fontSize: 18, fontWeight: "900", fontVariant: tabular },
  summaryLabel: { ...type.caption, fontSize: 10.5 },
  searchBox: { height: 48, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  card: { gap: 13, padding: 15, marginBottom: 10, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  company: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  rank: { width: 26, height: 26, textAlign: "center", textAlignVertical: "center", borderRadius: 8, overflow: "hidden", backgroundColor: colors.surface2, color: colors.ink3, fontSize: 10, fontWeight: "800", fontVariant: tabular },
  companyCopy: { flex: 1 },
  ticker: { color: colors.ink, fontSize: 14.5, fontWeight: "900" },
  name: { color: colors.ink2, fontWeight: "500" },
  meta: { ...type.caption, marginTop: 2, fontSize: 10.5 },
  score: { alignItems: "flex-end" },
  scoreValue: { color: colors.ink, fontSize: 23, lineHeight: 25, fontWeight: "900", fontVariant: tabular },
  scoreLabel: { color: colors.ink3, fontSize: 9 },
  factorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  factor: { width: "47%", flexGrow: 1 },
  factorHeader: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  factorLabel: { color: colors.ink3, fontSize: 9.5 },
  factorValue: { color: colors.ink, fontSize: 10, fontWeight: "800", fontVariant: tabular },
  factorTrack: { height: 4, marginTop: 4, overflow: "hidden", borderRadius: 99, backgroundColor: colors.surface2 },
  factorFill: { height: 4, borderRadius: 99 },
  signalRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  signal: { maxWidth: "100%", borderWidth: 1, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: colors.surface },
  signalText: { color: colors.ink2, fontSize: 9.5, fontWeight: "700" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11 },
  marketFacts: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  fact: { color: colors.ink, fontSize: 11, fontWeight: "700", fontVariant: tabular },
  compare: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(32,201,130,0.38)", backgroundColor: colors.surface },
  compareActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  compareText: { color: colors.accent, fontSize: 10.5, fontWeight: "800" },
  compareTextActive: { color: colors.onAccent },
  sourceLine: { ...type.caption, fontSize: 9.5, lineHeight: 14 },
  comparePanel: { gap: 9 },
  compareCompany: { gap: 9, padding: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  compareHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  compareTicker: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  compareScore: { color: colors.accent, fontSize: 22, fontWeight: "900", fontVariant: tabular },
  compareMeta: { ...type.caption, marginTop: 2 },
  method: { flexDirection: "row", alignItems: "center", gap: 10, padding: 15, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  methodCopy: { flex: 1 },
  methodTitle: { ...type.body, fontSize: 13 },
  methodDetail: { ...type.caption, marginTop: 2 },
  pressed: { opacity: 0.7 },
});
