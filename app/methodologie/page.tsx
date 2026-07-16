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
          15 minutes (sondage toutes les 5 min). Les actualités sont rafraîchies
          toutes les 5 min en journée, les documents des 48 actions toutes les 5 min, les
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
          Les états financiers des <strong className="text-ink">48 actions de la
          cote</strong> sont recherchés automatiquement société par société. Le
          pipeline refuse une publication qui ne passe pas ses contrôles de
          structure, d&apos;unité et de cohérence ; les documents difficiles sont
          placés en contrôle humain, jamais acceptés en lot aveugle. Un chiffre
          n&apos;entre en base que s&apos;il est recoupé : le résultat net doit apparaître identique sur
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

      <div id="score-factuel" className="scroll-mt-20">
        <Section icon={Activity} title="Score factuel — formule publiée">
          <p>
            L&apos;ancienne analyse était masquée sur les valeurs réelles parce
            que ses scores provenaient encore d&apos;un petit jeu pédagogique. Les
            afficher aurait mélangé cotations officielles et fondamentaux
            fictifs. <strong className="text-ink">WARIBA Factuel v1.0</strong>
            remplace ce blocage par un calcul déterministe commun au web et au
            mobile, exécuté à nouveau dès que la cotation ou le registre des
            fondamentaux est actualisé.
          </p>
          <p>
            Chaque métrique est convertie en <strong className="text-ink">rang
            centile dans son secteur</strong>. CD et ENE sont réunis dans
            Distribution. Si une société est seule dans son secteur, le modèle
            se replie explicitement sur le marché BRVM et baisse sa confiance.
            Les comparaisons affichent la médiane — moins sensible aux valeurs
            extrêmes que la moyenne. Une donnée absente est omise et les poids
            disponibles sont renormalisés ; elle n&apos;est jamais remplacée par
            zéro ou par une estimation.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong className="text-ink">Qualité</strong> : ROE 25, marge
              nette 20, croissance du résultat net 20, croissance CA/PNB 15,
              marge ordinaire 10, croissance des capitaux propres 10 et, pour
              les banques, amélioration du coefficient d&apos;exploitation 10.
            </li>
            <li>
              <strong className="text-ink">Valorisation</strong> : PER inversé
              50, P/B inversé 20 et rendement net 30. « Inversé » signifie
              qu&apos;une valeur plus basse reçoit un meilleur rang ; aucun PER
              négatif n&apos;est comparé.
            </li>
            <li>
              <strong className="text-ink">Momentum</strong> : variations de
              clôture réelles à 1 mois 20, 6 mois 35, 1 an 30 et 5 ans 15.
            </li>
            <li>
              <strong className="text-ink">Risque</strong> — élevé = moins
              favorable : illiquidité 35, amplitude 52 semaines 20, recul du
              bénéfice 20, pertes/capitaux propres négatifs 15 et ancienneté
              des comptes 10.
            </li>
          </ul>
          <p>
            Le score central vaut <strong className="text-ink">35 % Qualité +
            20 % Valorisation + 25 % Momentum + 20 % (100 − Risque)</strong>.
            Il décrit la position relative des données observées ; ce n&apos;est
            ni une probabilité de hausse, ni une recommandation d&apos;achat ou de
            vente. Les signaux sont eux aussi des règles publiées : croissance
            ou baisse annuelle, retour aux bénéfices, résultat ordinaire
            négatif, efficacité bancaire, volume ≥ 3×, proximité du plus haut
            52 semaines, PER/ROE extrême dans le secteur et comptes anciens.
          </p>
          <p>
            <strong className="text-ink">Confiance</strong> : la fiche expose
            le pourcentage réel de pondérations renseignées, la taille de
            l&apos;échantillon, l&apos;exercice et la date source. Le registre
            actuel normalise N et N-1 : la confiance est donc volontairement
            plafonnée à « moyenne ». Elle ne pourra devenir « élevée » qu&apos;avec
            au moins trois exercices comparables. Les petites cohortes, les
            données anciennes ou une couverture inférieure à 55 % passent en
            confiance « limitée ».
          </p>
        </Section>
      </div>

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
          pas de carnet d&apos;ordres ni bid/ask (non publics) ; les 48 sociétés ont
          un registre fondamental, mais toutes les métriques ne sont pas
          lisibles dans chaque publication et les historiques financiers sont
          encore limités à N/N-1 ; certains
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
