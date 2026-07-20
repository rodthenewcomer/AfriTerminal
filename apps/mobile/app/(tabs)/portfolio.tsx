import { useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { computePositions, dividendIncome, valuePortfolio } from "@wariba/core/portfolio";
import { fcfa, pct } from "@wariba/core/format";
import { ActionButton, ChangePill, EmptyState, Metric, Page, Row, Section } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { usePortfolioStore, useSettingsStore } from "../../src/stores";
import { AllocationDonut } from "../../src/components/AllocationDonut";
import { parseAmount, parseDateInput, parseFees, parseQuantity, todayIso } from "../../src/lib/forms";
import * as Haptics from "expo-haptics";
import { colors, radius, tabular, type } from "../../src/theme";
import { useMobileAuth } from "../../src/providers/AuthProvider";
import { AccountGate } from "../../src/components/AccountGate";

const SECTOR_LABELS: Record<string, string> = {
  AGR: "Agriculture",
  BAN: "Banques",
  DIS: "Distribution",
  FIN: "Finance",
  IND: "Industrie",
  OIL: "Énergie",
  SPU: "Services publics",
  TRA: "Transport",
  TEL: "Télécommunications",
};

export default function PortfolioScreen() {
  const market = useMarketData();
  const { loading: authLoading, user } = useMobileAuth();
  const transactions = usePortfolioStore((state) => state.transactions);
  const beginner = useSettingsStore((state) => state.experienceLevel === "debutant");
  const add = usePortfolioStore((state) => state.add);
  const removeTransaction = usePortfolioStore((state) => state.remove);
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("SNTS");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [date, setDate] = useState(todayIso());
  const [side, setSide] = useState<"achat" | "vente">("achat");
  const [formError, setFormError] = useState<string | null>(null);
  const tickerInputRef = useRef<TextInput>(null);
  const summary = useMemo(
    () => valuePortfolio(computePositions(transactions), (symbol) => market.quotes[symbol]?.lastClose),
    [transactions, market.quotes]
  );
  const income = useMemo(
    () => dividendIncome(transactions, (symbol) => market.dividends[symbol] ?? []),
    [transactions, market.dividends]
  );
  const health = useMemo(() => {
    const positions = summary.positions;
    const ordered = [...positions].sort((a, b) => b.marketValue - a.marketValue);
    const topPosition = ordered[0];
    const topPositionWeight = topPosition && summary.totalValue > 0 ? topPosition.marketValue / summary.totalValue : 0;
    const sectorValues = new Map<string, number>();
    for (const position of positions) {
      const code = market.quotes[position.ticker]?.sectorCode ?? "Autre";
      sectorValues.set(code, (sectorValues.get(code) ?? 0) + position.marketValue);
    }
    const topSector = [...sectorValues.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSectorWeight = topSector && summary.totalValue > 0 ? topSector[1] / summary.totalValue : 0;
    const today = new Date().toISOString().slice(0, 10);
    const futureIncome = positions.reduce((total, position) => {
      const announced = (market.dividends[position.ticker] ?? []).filter((event) => event.date > today);
      return total + announced.reduce((sum, event) => sum + event.net * position.quantity, 0);
    }, 0);
    const risks = [
      ...(topPositionWeight > 0.4 ? [`${topPosition?.ticker} représente ${pct(topPositionWeight * 100, { digits: 0 })} du portefeuille.`] : []),
      ...(topSectorWeight > 0.55 && topSector ? [`Le secteur ${SECTOR_LABELS[topSector[0]] ?? topSector[0]} pèse ${pct(topSectorWeight * 100, { digits: 0 })}.`] : []),
      ...(positions.length > 0 && positions.length < 3 ? ["Moins de trois lignes : diversification limitée."] : []),
    ];
    return {
      topPosition,
      topPositionWeight,
      topSector,
      topSectorWeight,
      futureIncome,
      risks,
      totalPerformance: summary.totalUnrealizedPnl + summary.totalRealizedPnl + income.total,
    };
  }, [income.total, market.dividends, market.quotes, summary]);
  const formComplete = Boolean(ticker.trim() && quantity.trim() && price.trim() && date.trim());

  const submit = () => {
    const symbol = ticker.trim().toUpperCase();
    const fail = (message: string) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFormError(message);
    };
    if (!market.quotes[symbol]) return fail(`Ticker inconnu : ${symbol || "—"} n'est pas coté à la BRVM.`);
    const parsedQuantity = parseQuantity(quantity);
    if (parsedQuantity === null) return fail("Quantité invalide — nombre entier de titres, supérieur à zéro.");
    const parsedPrice = parseAmount(price);
    if (parsedPrice === null) return fail("Prix invalide — montant en FCFA supérieur à zéro.");
    const parsedFees = parseFees(fees);
    if (parsedFees === null) return fail("Frais invalides — montant positif, ou laissez vide.");
    const parsedDate = parseDateInput(date);
    if (parsedDate === null) return fail("Date invalide — JJ/MM/AAAA, ni future ni antérieure à 1998.");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    add({ id: `${Date.now()}`, ticker: symbol, side, date: parsedDate, quantity: parsedQuantity, price: parsedPrice, fees: parsedFees });
    setQuantity(""); setPrice(""); setFees("0"); setDate(todayIso()); setFormError(null); setOpen(false);
  };

  const confirmRemove = (id: string, label: string) => {
    Alert.alert("Supprimer la transaction ?", label, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => removeTransaction(id) },
    ]);
  };

  if (!authLoading && !user) {
    return (
      <Page title="Portefeuille" subtitle="Votre patrimoine BRVM, protégé et synchronisé">
        <AccountGate
          title="Transformez vos transactions en décisions utiles."
          detail="Le compte gratuit conserve vos achats, frais et dividendes et relie chaque position aux alertes de l’entreprise."
          benefits={[
            "PRU, performance totale et revenus calculés avec vos frais",
            "Concentration, secteurs et risques visibles en un coup d’œil",
            "Portefeuille disponible sur web, iPhone et Android",
          ]}
        />
      </Page>
    );
  }

  return (
    <Page
      title="Portefeuille"
      subtitle="PRU, revenus et risques synchronisés avec votre compte"
      action={<ActionButton label="Ajouter" icon="add" onPress={() => setOpen(true)} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Valeur totale</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.heroValue}>
          {fcfa(summary.totalValue)}
        </Text>
        <View style={styles.heroRow}>
          <ChangePill value={summary.totalUnrealizedPnl} label={`${fcfa(summary.totalUnrealizedPnl)} · ${pct(summary.totalUnrealizedPnlPct, { signed: true, digits: 2 })}`} />
        </View>
        <View style={styles.heroFacts}>
          <View style={styles.heroFact}>
            <Text style={styles.heroFactLabel}>Investi</Text>
            <Text style={styles.heroFactValue}>{fcfa(summary.totalInvested)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroFact}>
            <Text style={styles.heroFactLabel}>P&L réalisé</Text>
            <Text style={[styles.heroFactValue, { color: summary.totalRealizedPnl >= 0 ? colors.up : colors.down }]}>
              {fcfa(summary.totalRealizedPnl)}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroFact}>
            <Text style={styles.heroFactLabel}>Lignes</Text>
            <Text style={styles.heroFactValue}>{summary.positions.length}</Text>
          </View>
        </View>
        {beginner ? (
          <Text style={styles.beginnerHint}>
            PRU = prix moyen payé par action, frais inclus. P&L latent = la différence
            entre le dernier cours officiel et ce PRU, si vous vendiez aujourd'hui.
          </Text>
        ) : null}
      </View>

      {summary.positions.length ? (
        <Section title="Santé du portefeuille" detail="Performance, revenus et concentration">
          <View style={styles.metrics}>
            <Metric label="Performance totale" value={fcfa(health.totalPerformance)} tone={health.totalPerformance >= 0 ? "up" : "down"} detail="Réalisé + latent + dividendes reçus" />
            <Metric label="Revenus reçus" value={fcfa(income.total)} tone="accent" detail="Dividendes nets estimés selon vos dates de détention" />
            <Metric label="Revenus futurs" value={fcfa(health.futureIncome)} tone="accent" detail={health.futureIncome > 0 ? "Paiements annoncés dont la date est à venir" : "Aucun paiement futur présent dans les données officielles"} />
            <Metric
              label="Plus forte position"
              value={health.topPosition?.ticker ?? "—"}
              detail={pct(health.topPositionWeight * 100, { digits: 1 })}
            />
            <Metric
              label="Premier secteur"
              value={health.topSector ? SECTOR_LABELS[health.topSector[0]] ?? health.topSector[0] : "—"}
              detail={pct(health.topSectorWeight * 100, { digits: 1 })}
            />
          </View>
          {health.risks.length ? health.risks.map((risk) => (
            <Row key={risk} icon="warning-outline" title="Point de vigilance" detail={risk} />
          )) : <Row icon="shield-checkmark-outline" title="Diversification correcte" detail="Aucun seuil simple de concentration n’est dépassé. Cela ne constitue pas un conseil d’investissement." />}
        </Section>
      ) : null}

      <Section title="Positions" detail="Cours de la dernière clôture">
        {summary.positions.length > 1 ? (
          <View style={styles.donutCard}>
            <AllocationDonut
              slices={(() => {
                const ordered = [...summary.positions].sort((a, b) => b.marketValue - a.marketValue);
                const top = ordered.slice(0, 5).map((position) => ({ label: position.ticker, value: position.marketValue }));
                const rest = ordered.slice(5).reduce((sum, position) => sum + position.marketValue, 0);
                return rest > 0 ? [...top, { label: "Autres", value: rest }] : top;
              })()}
            />
          </View>
        ) : null}
        {summary.positions.length ? summary.positions.map((position) => {
          const weight = summary.totalValue > 0 ? position.marketValue / summary.totalValue : 0;
          return (
            <View key={position.ticker} style={styles.position}>
              <View style={styles.positionRow}>
                <View style={styles.positionCopy}>
                  <Text style={styles.positionTicker}>{position.ticker}</Text>
                  <Text style={styles.positionDetail}>
                    {position.quantity.toLocaleString("fr-FR")} titres · PRU {fcfa(position.averageCost)}
                  </Text>
                </View>
                <View style={styles.positionRight}>
                  <Text style={styles.positionValue}>{fcfa(position.marketValue)}</Text>
                  <Text style={[styles.positionPnl, { color: position.unrealizedPnl >= 0 ? colors.up : colors.down }]}>
                    {pct(position.unrealizedPnlPct, { signed: true, digits: 2 })}
                  </Text>
                </View>
              </View>
              <View style={styles.weightTrack}>
                <View style={[styles.weightFill, { width: `${Math.max(2, weight * 100)}%` }]} />
              </View>
            </View>
          );
        }) : <>
          <EmptyState icon="pie-chart-outline" title="Portefeuille vide" detail="Ajoutez un achat ou une vente : les calculs seront synchronisés avec votre compte." />
          <View style={styles.emptyCta}>
            <ActionButton label="Ajouter ma première transaction" icon="add" onPress={() => setOpen(true)} />
          </View>
        </>}
      </Section>

      {income.events.length ? (
        <Section title="Dividendes perçus" detail="Estimation — quantité détenue avant chaque paiement">
          <View style={styles.metrics}>
            <Metric label="Total net estimé" value={fcfa(income.total)} tone="accent" detail={`${income.events.length} versement${income.events.length > 1 ? "s" : ""} sur vos titres`} />
          </View>
          {[...income.events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((event, index) => (
            <Row
              key={`${event.ticker}-${event.date}-${index}`}
              icon="cash-outline"
              title={event.ticker}
              detail={`${event.date} · ${event.quantityHeld.toLocaleString("fr-FR")} titres × ${fcfa(event.netPerShare)}`}
              value={fcfa(event.quantityHeld * event.netPerShare)}
              valueDetail="net estimé"
            />
          ))}
        </Section>
      ) : null}

      {transactions.length ? (
        <Section title="Transactions" detail={`${transactions.length} enregistrées`}>
          {[...transactions].reverse().slice(0, 8).map((transaction) => (
            <Row
              key={transaction.id}
              icon={transaction.side === "achat" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
              title={`${transaction.side === "achat" ? "Achat" : "Vente"} ${transaction.ticker}`}
              detail={`${transaction.date} · ${transaction.quantity.toLocaleString("fr-FR")} × ${fcfa(transaction.price)}`}
              value="Supprimer"
              onPress={() => confirmRemove(transaction.id, `${transaction.side} ${transaction.ticker} du ${transaction.date}`)}
            />
          ))}
        </Section>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onShow={() => tickerInputRef.current?.focus()} onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouvelle transaction</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer la saisie" onPress={() => setOpen(false)} hitSlop={8}><Text style={styles.close}>Fermer</Text></Pressable>
            </View>
            <View style={styles.sideRow}>
              <ActionButton label="Achat" active={side === "achat"} onPress={() => setSide("achat")} />
              <ActionButton label="Vente" active={side === "vente"} onPress={() => setSide("vente")} />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Ticker</Text>
              <TextInput ref={tickerInputRef} accessibilityLabel="Ticker de la transaction" value={ticker} onChangeText={(value) => { setTicker(value); setFormError(null); }} autoCapitalize="characters" placeholder="Ex. SNTS" placeholderTextColor={colors.ink3} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Quantité</Text>
              <TextInput accessibilityLabel="Quantité de titres" value={quantity} onChangeText={(value) => { setQuantity(value); setFormError(null); }} keyboardType="decimal-pad" placeholder="Ex. 10" placeholderTextColor={colors.ink3} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Prix par action (FCFA)</Text>
              <TextInput accessibilityLabel="Prix par action en FCFA" value={price} onChangeText={(value) => { setPrice(value); setFormError(null); }} keyboardType="decimal-pad" placeholder="Ex. 31 000" placeholderTextColor={colors.ink3} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Frais (FCFA)</Text>
              <TextInput accessibilityLabel="Frais de transaction en FCFA" value={fees} onChangeText={(value) => { setFees(value); setFormError(null); }} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.ink3} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Date d'exécution</Text>
            <TextInput
              value={date}
              onChangeText={(value) => { setDate(value); setFormError(null); }}
              keyboardType="numbers-and-punctuation"
              placeholder="Date d'exécution (JJ/MM/AAAA)"
              placeholderTextColor={colors.ink3}
              accessibilityLabel="Date d'exécution de la transaction"
              style={styles.input}
            />
            </View>
            {formError ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.formError}>{formError}</Text> : null}
            <Pressable disabled={!formComplete} accessibilityRole="button" accessibilityLabel="Enregistrer la transaction" accessibilityState={{ disabled: !formComplete }} onPress={submit} style={({ pressed }) => [styles.submit, !formComplete && styles.submitDisabled, pressed && { opacity: 0.75 }]}>
              <Text style={styles.submitText}>Enregistrer</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emptyCta: { alignSelf: "center", marginTop: 14 },
  donutCard: {
    padding: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  hero: {
    padding: 18, gap: 8,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  heroLabel: { ...type.label },
  heroValue: { color: colors.ink, fontSize: 32, fontWeight: "800", letterSpacing: -0.8, fontVariant: tabular },
  heroRow: { flexDirection: "row" },
  heroFacts: { flexDirection: "row", alignItems: "center", marginTop: 8, paddingTop: 12, borderTopColor: colors.line, borderTopWidth: 1 },
  heroFact: { flex: 1, gap: 3 },
  heroFactLabel: { ...type.label, fontSize: 9.5 },
  heroFactValue: { color: colors.ink, fontSize: 13, fontWeight: "700", fontVariant: tabular },
  heroDivider: { width: 1, height: 26, backgroundColor: colors.line, marginHorizontal: 10 },
  beginnerHint: { ...type.caption, lineHeight: 16, marginTop: 10, paddingTop: 10, borderTopColor: colors.line, borderTopWidth: 1 },
  position: { paddingVertical: 12, gap: 9, borderBottomColor: colors.line, borderBottomWidth: 1 },
  positionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  positionCopy: { flex: 1 },
  positionTicker: { color: colors.ink, fontSize: 14.5, fontWeight: "800", letterSpacing: 0.2 },
  positionDetail: { ...type.caption, marginTop: 3 },
  positionRight: { alignItems: "flex-end" },
  positionValue: { color: colors.ink, fontSize: 14, fontWeight: "700", fontVariant: tabular },
  positionPnl: { fontSize: 11.5, fontWeight: "700", marginTop: 2, fontVariant: tabular },
  weightTrack: { height: 3, borderRadius: 2, backgroundColor: colors.surface2, overflow: "hidden" },
  weightFill: { height: 3, borderRadius: 2, backgroundColor: colors.accent },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderColor: colors.lineStrong, borderWidth: 1, padding: 18, paddingBottom: 36, gap: 12,
  },
  sheetHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: 2 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { ...type.title, fontSize: 17 },
  close: { ...type.caption, color: colors.ink2 },
  sideRow: { flexDirection: "row", gap: 8 },
  field: { gap: 6 },
  inputLabel: { ...type.label, color: colors.ink2 },
  input: {
    height: 46, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface2, color: colors.ink, paddingHorizontal: 14, fontSize: 13.5, fontVariant: tabular,
  },
  formError: { color: colors.down, fontSize: 12, lineHeight: 16 },
  submit: { height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: colors.accent },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: "800" },
});
