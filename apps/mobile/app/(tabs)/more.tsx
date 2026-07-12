import { useRouter } from "expo-router";
import { Page, Row, Section } from "../../src/components/ui";

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Page title="Plus" subtitle="Toutes les sections du poste de travail">
      <Section title="Suivi">
        <Row icon="pie-chart-outline" title="Portefeuille" detail="PRU, P&L et allocation calculés localement" onPress={() => router.push("/portfolio")} />
        <Row icon="notifications-outline" title="Alertes" detail="Alertes factuelles et seuils de prix locaux" onPress={() => router.push("/alerts")} />
        <Row icon="cash-outline" title="Dividendes" detail="Saisonnalité et journal des versements nets" onPress={() => router.push("/dividends")} />
      </Section>
      <Section title="Marché">
        <Row icon="grid-outline" title="Carte du marché" detail="Treemap par liquidité, 8 horizons de performance" onPress={() => router.push("/map")} />
        <Row icon="rocket-outline" title="IPO & opérations" detail="Avis réels et pédagogie clairement séparés" onPress={() => router.push("/ipo")} />
      </Section>
      <Section title="Information">
        <Row icon="newspaper-outline" title="Actualités" detail="Articles sourcés liés aux valeurs de la cote" onPress={() => router.push("/news")} />
        <Row icon="document-text-outline" title="Documents" detail="Publications officielles BRVM" onPress={() => router.push("/documents")} />
      </Section>
      <Section title="Application">
        <Row icon="settings-outline" title="Réglages" onPress={() => router.push("/settings")} />
        <Row icon="pulse-outline" title="État des données" onPress={() => router.push("/status")} />
      </Section>
    </Page>
  );
}
