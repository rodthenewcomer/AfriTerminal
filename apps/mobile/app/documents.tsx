import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActionButton, EmptyState, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { openTrustedExternalUrl } from "../src/lib/external-links";

export default function DocumentsScreen() {
  const market = useMarketData();
  const [limit, setLimit] = useState(60);
  const latestDate = market.documents[0]?.date ?? "1970-01-01";
  return (
    <Page subtitle="Publications officielles BRVM — chaque ligne renvoie à sa source">
      <Section title="Publications" detail={`${Math.min(limit, market.documents.length)} sur ${market.documents.length}`}>
        {market.documents.length ? <>
          {market.documents.slice(0, limit).map((item) => (
            <Row
              key={item.url}
              icon="document-text-outline"
              title={`${item.ticker} · ${item.title}`}
              detail={`${(item.type === "Résultats" || item.type === "États financiers") && Date.parse(latestDate) - Date.parse(item.date) <= 7 * 86400000 ? "CAPITAL · " : ""}${item.type} · ${item.date}`}
              onPress={() => void openTrustedExternalUrl(item.url)}
            />
          ))}
          {limit < market.documents.length ? (
            <View style={styles.moreRow}>
              <ActionButton label="Afficher 60 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 60)} />
            </View>
          ) : null}
        </> : <EmptyState icon="document-text-outline" title="Aucune publication" detail="Les documents officiels apparaîtront ici." />}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({ moreRow: { alignSelf: "center", marginTop: 12 } });
