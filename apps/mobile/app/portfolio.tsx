import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { computePositions, valuePortfolio } from "@afriterminal/core/portfolio";
import { fcfa, pct } from "@afriterminal/core/format";
import { ActionButton, ChangePill, EmptyState, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { usePortfolioStore } from "../src/stores";
import { colors, radius, tabular, type } from "../src/theme";

export default function PortfolioScreen() {
  const market = useMarketData();
  const transactions = usePortfolioStore((state) => state.transactions);
  const add = usePortfolioStore((state) => state.add);
  const removeTransaction = usePortfolioStore((state) => state.remove);
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("SNTS");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [side, setSide] = useState<"achat" | "vente">("achat");
  const summary = useMemo(
    () => valuePortfolio(computePositions(transactions), (symbol) => market.quotes[symbol]?.lastClose),
    [transactions, market.quotes]
  );
  const pnlUp = summary.totalUnrealizedPnl >= 0;

  const submit = () => {
    const parsedQuantity = Number(quantity.replace(",", "."));
    const parsedPrice = Number(price.replace(/\s/g, "").replace(",", "."));
    const parsedFees = Number(fees.replace(/\s/g, "").replace(",", ".")) || 0;
    if (!market.quotes[ticker.toUpperCase()] || parsedQuantity <= 0 || parsedPrice <= 0) return;
    add({ id: `${Date.now()}`, ticker: ticker.toUpperCase(), side, date: new Date().toISOString().slice(0, 10), quantity: parsedQuantity, price: parsedPrice, fees: parsedFees });
    setQuantity(""); setPrice(""); setFees("0"); setOpen(false);
  };

  const confirmRemove = (id: string, label: string) => {
    Alert.alert("Supprimer la transaction ?", label, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => removeTransaction(id) },
    ]);
  };

  return (
    <Page
      subtitle="PRU et performance calculés localement — les données restent sur cet appareil"
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
      </View>

      <Section title="Positions" detail="Cours de la dernière clôture">
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
        }) : <EmptyState icon="pie-chart-outline" title="Portefeuille vide" detail="Ajoutez un achat ou une vente — tout est calculé et stocké localement." />}
      </Section>

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

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouvelle transaction</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}><Text style={styles.close}>Fermer</Text></Pressable>
            </View>
            <View style={styles.sideRow}>
              <ActionButton label="Achat" active={side === "achat"} onPress={() => setSide("achat")} />
              <ActionButton label="Vente" active={side === "vente"} onPress={() => setSide("vente")} />
            </View>
            <TextInput value={ticker} onChangeText={setTicker} autoCapitalize="characters" placeholder="Ticker (ex. SNTS)" placeholderTextColor={colors.ink3} style={styles.input} />
            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Quantité" placeholderTextColor={colors.ink3} style={styles.input} />
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Prix par action (FCFA)" placeholderTextColor={colors.ink3} style={styles.input} />
            <TextInput value={fees} onChangeText={setFees} keyboardType="decimal-pad" placeholder="Frais (FCFA)" placeholderTextColor={colors.ink3} style={styles.input} />
            <Pressable onPress={submit} style={({ pressed }) => [styles.submit, pressed && { opacity: 0.75 }]}>
              <Text style={styles.submitText}>Enregistrer</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
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
  input: {
    height: 46, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface2, color: colors.ink, paddingHorizontal: 14, fontSize: 13.5, fontVariant: tabular,
  },
  submit: { height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: colors.accent },
  submitText: { color: colors.background, fontSize: 14, fontWeight: "800" },
});
