import type { Metadata } from "next";
import { MarketMap } from "@/components/markets/market-map";
import { LATEST_TRADING_DATE } from "@/lib/real-data";
import { dateFr } from "@wariba/core/format";

export const metadata: Metadata = {
  title: "Carte du marché",
  description:
    "Carte de la BRVM en un coup d'œil : les 48 sociétés cotées groupées par secteur, taille selon la liquidité, couleur selon la variation du jour. Données officielles.",
};

export default function MapPage() {
  return (
    <div className="space-y-4 stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Carte du marché
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            La cote BRVM en un coup d&apos;œil · séance du{" "}
            {dateFr(LATEST_TRADING_DATE)}. Chaque tuile est une société :
            sa taille reflète l&apos;activité du titre (liquidité), sa
            couleur la variation sur l&apos;horizon choisi. Cliquez une
            tuile pour ouvrir la fiche.
          </p>
        </div>
      </div>

      <MarketMap />

      <p className="text-[11px] text-ink-3">
        Taille des tuiles = <strong>liquidité</strong> (volume moyen 30 jours ×
        cours), pas la capitalisation boursière — la BRVM ne publie pas le
        nombre d&apos;actions en circulation dans le bulletin quotidien.
        Couleur = variation de la dernière séance. Cliquez une tuile pour
        ouvrir la fiche complète.
      </p>
    </div>
  );
}
