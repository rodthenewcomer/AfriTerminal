import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { dateFr, fcfa } from "@afriterminal/core/format";
import { ActionButton, EmptyState, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { allDividendEvents, dividendsByMonth, isRecurring } from "../src/lib/dividend-calendar";
import { colors, radius, tabular, type } from "../src/theme";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

export default function DividendsScreen() {
  const market = useMarketData();
  const router = useRouter();
  const [journalLimit, setJournalLimit] = useState(40);
  const byMonth = useMemo(() => dividendsByMonth(market.dividends), [market.dividends]);
  const events = useMemo(() => allDividendEvents(market.dividends), [market.dividends]);

  const currentMonth = new Date().getMonth() + 1;
  const upNext = Array.from({ length: 3 }, (_, index) => ((currentMonth - 1 + index) % 12) + 1);

  if (!events.length) {
    return (
      <Page subtitle="Saisonnalité des versements passés — la BRVM ne publie pas de dates d'ex-dividende à l'avance">
        <EmptyState icon="cash-outline" title="Aucun versement" detail="L'historique des dividendes n'est pas encore chargé." />
      </Page>
    );
  }

  return (
    <Page subtitle="Saisonnalité réelle : les mois où chaque société a versé par le passé. Récurrence ≠ garantie — chaque montant vient du dernier versement réel, pas d'une prévision.">
      <Section title="Les 3 prochains mois" detail="Sociétés récurrentes (≥ 2 années)">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthCards}>
          {upNext.map((month) => {
            const entries = byMonth[month].filter(isRecurring);
            return (
              <View key={month} style={styles.monthCard}>
                <Text style={styles.monthTitle}>{MONTH_NAMES[month - 1]}</Text>
                <Text style={styles.monthDetail}>
                  {entries.length ? `${entries.length} société${entries.length > 1 ? "s" : ""} récurrente${entries.length > 1 ? "s" : ""}` : "Aucun historique récurrent"}
                </Text>
                {entries.length ? entries.slice(0, 5).map((entry) => (
                  <Pressable key={entry.ticker} onPress={() => router.push(`/stocks/${entry.ticker}`)} style={({ pressed }) => [styles.monthRow, pressed && { opacity: 0.6 }]}>
                    <Text style={styles.monthTicker}>{entry.ticker} <Text style={styles.monthYears}>· {entry.years.length} ans</Text></Text>
                    <Text style={styles.monthNet}>{fcfa(entry.lastNet)}</Text>
                  </Pressable>
                )) : (
                  <Text style={styles.monthEmpty}>Pas de versement observé au moins deux années sur ce mois.</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="Les 12 mois de l'année" detail="Badge doré = récurrent (≥ 2 années)">
        <View style={styles.year}>
          {MONTH_NAMES.map((label, index) => {
            const entries = byMonth[index + 1];
            if (!entries.length) return null;
            return (
              <View key={label} style={styles.yearMonth}>
                <Text style={styles.yearMonthTitle}>{label}</Text>
                <View style={styles.badges}>
                  {entries.map((entry) => (
                    <Pressable
                      key={entry.ticker}
                      onPress={() => router.push(`/stocks/${entry.ticker}`)}
                      style={[styles.badge, isRecurring(entry) ? styles.badgeGold : null]}
                    >
                      <Text style={[styles.badgeText, isRecurring(entry) ? styles.badgeTextGold : null]}>{entry.ticker}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Journal des versements" detail={`${events.length} versements réels, du plus récent au plus ancien`}>
        {events.slice(0, journalLimit).map((event, index) => (
          <Row
            key={`${event.ticker}-${event.date}-${index}`}
            icon="cash-outline"
            title={event.ticker}
            detail={`Payé le ${dateFr(event.date)}`}
            value={fcfa(event.net)}
            valueDetail="net / action"
            onPress={() => router.push(`/stocks/${event.ticker}`)}
          />
        ))}
        {journalLimit < events.length ? (
          <View style={styles.moreRow}>
            <ActionButton label="Afficher 40 de plus" icon="chevron-down" onPress={() => setJournalLimit((value) => value + 40)} />
          </View>
        ) : null}
      </Section>

      <Text style={styles.footnote}>
        Montants nets par action, après IRVM 10 % — issus des bulletins officiels BRVM.
        Pour vos titres détenus, voir la projection de revenu dans Portefeuille.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  monthCards: { gap: 12 },
  monthCard: {
    width: 216, padding: 14, gap: 7,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  monthTitle: { ...type.title, fontSize: 15 },
  monthDetail: { ...type.caption },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 3 },
  monthTicker: { color: colors.ink, fontSize: 12.5, fontWeight: "700" },
  monthYears: { ...type.caption, fontWeight: "400" },
  monthNet: { color: colors.ink, fontSize: 12, fontWeight: "600", fontVariant: tabular },
  monthEmpty: { ...type.caption, lineHeight: 16 },
  year: { gap: 14 },
  yearMonth: { gap: 7 },
  yearMonthTitle: { ...type.body, fontSize: 13 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1,
  },
  badgeGold: { backgroundColor: colors.accentSoft, borderColor: "rgba(226,166,61,0.4)" },
  badgeText: { color: colors.ink2, fontSize: 10.5, fontWeight: "700", letterSpacing: 0.3 },
  badgeTextGold: { color: colors.gold },
  moreRow: { alignSelf: "center", marginTop: 12 },
  footnote: { ...type.caption, textAlign: "center", paddingHorizontal: 10 },
});
