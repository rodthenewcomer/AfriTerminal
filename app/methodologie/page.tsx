import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BookOpenCheck,
  Calculator,
  Database,
  FileSearch,
  ScanLine,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Méthodologie & sources",
  description:
    "Comment WARIBA collecte, vérifie et affiche les données BRVM : sources primaires, règles de double vérification, calculs, et limites assumées.",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Database;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-accent" /> {title}
          </span>
        }
      />
      <CardBody className="space-y-2 text-xs leading-relaxed text-ink-2">
        {children}
      </CardBody>
    </Card>
  );
}

/**
 * La page de confiance : tout ce que le site affiche doit être
 * retraçable jusqu'à un document officiel ou une formule expliquée ici.
 */
export default function MethodologiePage() {
  return (
    <div className="stagger max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Méthodologie & sources
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          La règle qui gouverne tout le site : <strong className="text-ink-2">
          l&apos;absence de donnée vaut mieux qu&apos;une donnée fausse</strong>.
          Chaque chiffre affiché est soit lu dans un document officiel (lié),
          soit calculé par une formule décrite ici — jamais estimé.
        </p>
      </div>

      <Section icon={Database} title="Sources primaires — et rien d'autre">
        <p>
          <strong className="text-ink">Cours, volumes, PER, dividendes,
          indices</strong> : les Bulletins Officiels de la Cote (BOC), les PDF
          quotidiens publiés par la BRVM elle-même — parsés chaque soir de
          bourse, historique reconstruit depuis janvier 2019 (~1 750
          bulletins).{" "}
          <strong className="text-ink">États financiers</strong> : les PDF
          déposés par les sociétés sur leur fiche brvm.org.{" "}
          <strong className="text-ink">Avis et opérations sur capital</strong> :
          les pages officielles d&apos;avis et d&apos;événements sur valeurs de
          la BRVM. <strong className="text-ink">Actualités</strong> : flux RSS
          de Sika Finance et Financial Afrik — agrégation avec lien vers
          l&apos;article original, jamais de republication. Aucun chiffre ne
          provient d&apos;articles de presse, de réseaux sociaux ou
          d&apos;estimations tierces.
        </p>
      </Section>

      <Section icon={Timer} title="Fraîcheur — ce que « à jour » veut dire ici">
        <p>
          La BRVM publie le bulletin le soir de chaque séance : les cours du
          site sont ceux de la <strong className="text-ink">dernière séance
          officielle</strong>, pas du temps réel. Pendant la séance, les plus
          hauts/plus bas sont affinés par une collecte des cours différés de
          15 minutes (toutes les 15 min). Les actualités sont rafraîchies
          toutes les 15 min en journée, les documents toutes les 15 min, les
          opérations à chaque bulletin. Un chien de garde vérifie chaque matin
          qu&apos;aucun bulletin publié ne manque à nos données ; des
          garde-fous refusent tout bulletin aux valeurs aberrantes (variation
          au-delà du plafond BRVM, volume négatif, incohérence
          cours/variation). Détail par source :{" "}
          <Link href="/status" className="text-accent underline hover:no-underline">
            statut des données
          </Link>.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="Fondamentaux — la règle des deux sources">
        <p>
          Les états financiers sont extraits société par société et vérifiés à
          la main — jamais en lot aveugle. Un chiffre n&apos;entre en base que
          s&apos;il est recoupé : le résultat net doit apparaître identique sur
          plusieurs tableaux du même document ; le{" "}
          <strong className="text-ink">nombre d&apos;actions</strong>{" "}
          n&apos;est inscrit que si deux sources indépendantes convergent (PER
          officiel × résultat ÷ cours, contre capital social ÷ valeur
          nominale) ; les <strong className="text-ink">capitaux
          propres</strong> sont validés par l&apos;identité comptable
          P/B = PER × ROE. Quand les sources ne convergent pas, on
          n&apos;affiche rien et la fiche le dit. Les unités (FCFA, milliers,
          millions, milliards — rarement libellées dans les documents) sont
          inférées puis contrôlées par plausibilité.
        </p>
      </Section>

      <Section icon={ScanLine} title="Documents difficiles — OCR contrôlé">
        <p>
          Certaines sociétés publient des scans sans couche texte ou des PDF à
          police corrompue. Ils passent par reconnaissance optique, avec la
          même exigence : une valeur n&apos;est retenue que si deux lectures
          indépendantes (deux tableaux, deux passes) donnent exactement le
          même chiffre. Quand l&apos;OCR diverge, la société reste non
          couverte plutôt que approximée.
        </p>
      </Section>

      <Section icon={Calculator} title="Ce qui est calculé — les formules">
        <p>
          <strong className="text-ink">Volatilité</strong> : écart-type des
          rendements quotidiens × √252, sur 1 an.{" "}
          <strong className="text-ink">Bêta</strong> : covariance des
          rendements du titre et du BRVM Composite ÷ variance de l&apos;indice,
          séances communes de la dernière année (nul si moins de 30 points —
          pas de fausse précision).{" "}
          <strong className="text-ink">Perte maximale</strong> : pire baisse
          depuis un sommet de clôture, tout l&apos;historique.{" "}
          <strong className="text-ink">Capitalisation, BPA, P/B, ROE</strong> :
          calculés au cours du jour uniquement quand actions et capitaux
          propres sont vérifiés. <strong className="text-ink">
          Portefeuille</strong> : coût moyen (PRU) frais inclus, dividendes
          crédités sur les titres détenus avant chaque date de paiement
          publiée. <strong className="text-ink">Projections de revenu</strong> :
          hypothèse explicite de reconduction du dernier dividende — une
          projection, jamais une prévision.
        </p>
      </Section>

      <Section icon={FileSearch} title="Alertes — factuelles, jamais prescriptives">
        <p>
          Les alertes du marché sont générées par des règles déterministes sur
          les bulletins (variation ≥ 5 %, extrême 52 semaines strict, volume
          ≥ 3× la moyenne avec plancher, dividende payé, publication récente).
          Chacune énonce un fait daté et sourcé — aucune ne recommande
          d&apos;acheter ou de vendre. Vos alertes de prix personnelles sont
          évaluées à l&apos;ouverture de l&apos;application contre le dernier
          cours officiel, dans votre navigateur.
        </p>
      </Section>

      <Section icon={Activity} title="Limites assumées">
        <p>
          Pas de temps réel (bulletin quotidien + différé 15 min en séance) ;
          pas de carnet d&apos;ordres ni bid/ask (non publics) ; fondamentaux
          couverts société par société, pas encore toute la cote ; certains
          PER officiels sont calculés par la BRVM sur un référentiel différent
          des comptes déposés (consolidé vs individuel) — signalé sur les
          fiches concernées ; les scénarios de l&apos;onglet « Apprendre »
          (IPO) sont pédagogiques et étiquetés comme tels. Les données restent
          dans votre navigateur : rien n&apos;est envoyé à un serveur.
        </p>
      </Section>

      <Section icon={BookOpenCheck} title="Le code est public">
        <p>
          Pipeline, règles de vérification et interface sont auditables :{" "}
          <a
            href="https://github.com/rodthenewcomer/WARIBA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:no-underline"
          >
            github.com/rodthenewcomer/WARIBA
          </a>
          . Chaque valeur saisie manuellement porte en commentaire sa méthode
          de vérification.
        </p>
      </Section>

      <p className="text-[10px] text-ink-3">
        Ceci n&apos;est pas un conseil en investissement. WARIBA
        n&apos;est pas affilié à la BRVM.
      </p>
    </div>
  );
}
