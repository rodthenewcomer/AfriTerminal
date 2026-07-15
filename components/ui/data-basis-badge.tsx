import type { ContentBasis } from "@wariba/core/types";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/ui/info-hint";

/**
 * Le distinguo réel/illustratif est LE signal de confiance du site — il
 * doit être aussi lisible au tap (mobile) qu'au survol (desktop), pas
 * caché derrière un `title=` natif. Utilisé sur alertes et documents.
 */
export function DataBasisBadge({ basis }: { basis: ContentBasis }) {
  return basis === "réel" ? (
    <InfoHint label="Données réelles" text="Chiffres vérifiés contre les données réelles BRVM.">
      <Badge tone="positive">Données réelles</Badge>
    </InfoHint>
  ) : (
    <InfoHint
      label="Scénario illustratif"
      text="Scénario illustratif — repose sur des fondamentaux non collectés (résultat net, ROE, PNB...)."
    >
      <Badge tone="gold">Scénario illustratif</Badge>
    </InfoHint>
  );
}
