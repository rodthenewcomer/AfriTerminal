import type { AIInsight, Derived, Signal, Stock } from "@wariba/core/types";

const CUSTOM: Record<string, AIInsight> = {
  UNXC: {
    headline: "Un bénéfice record… qui n'en est pas un",
    summary:
      "Uniwax affiche 8,2 Mds FCFA de résultat net, mais le résultat des activités ordinaires est négatif (-330 M). Le bénéfice provient d'éléments exceptionnels, pendant que l'activité textile recule face aux imports asiatiques.",
    positives: [
      "Trésorerie renforcée par l'élément exceptionnel",
      "Valorisation sous les fonds propres (P/B 0,9)",
    ],
    risks: [
      "Résultat ordinaire négatif : le cœur d'activité perd de l'argent",
      "Chiffre d'affaires en baisse de 5,7 %",
      "Dividende réduit et non garanti",
    ],
    watchNext: [
      "Le résultat ordinaire au prochain semestre : positif ou toujours négatif ?",
      "L'évolution des volumes de pagne face à la concurrence",
    ],
  },
  NSBC: {
    headline: "La dynamique bancaire la plus forte de la cote",
    summary:
      "NSIA Banque CI combine un PNB en hausse de 28 %, un résultat net +53 % et un coefficient d'exploitation en amélioration (58 % → 52 %). La croissance est portée par le cœur d'activité, pas par des éléments exceptionnels.",
    positives: [
      "Levier opérationnel positif : les revenus croissent plus vite que les coûts",
      "Dividende en progression avec un payout raisonnable (56 %)",
    ],
    risks: [
      "Le titre a déjà fortement monté : une partie de la bonne nouvelle est dans le prix",
      "Croissance des crédits à suivre côté qualité d'actifs",
    ],
    watchNext: [
      "Le coût du risque au prochain trimestre",
      "La confirmation du rythme de croissance du PNB",
    ],
  },
  SNTS: {
    headline: "Le pilier dividende de la BRVM",
    summary:
      "Sonatel reste la valeur de fond de portefeuille : croissance régulière portée par le mobile money et la data, marges solides, dividende de 1 500 FCFA brut (6,1 % brut) avec un payout de seulement 41 %.",
    positives: [
      "ROE supérieur à 30 % et génération de cash régulière",
      "Dividende couvert plus de deux fois par le bénéfice",
      "Diversification géographique (5 pays)",
    ],
    risks: [
      "Pression fiscale et réglementaire récurrente au Sénégal et au Mali",
      "Intensité concurrentielle sur le mobile money",
    ],
    watchNext: [
      "La croissance d'Orange Money dans les résultats semestriels",
      "Toute annonce fiscale au Sénégal",
    ],
  },
  PALC: {
    headline: "Momentum fort, volume inhabituel aujourd'hui",
    summary:
      "Palm CI profite à plein de la hausse des cours de l'huile de palme : résultat net +45 %. La séance du jour montre un volume à 3,4× la moyenne — un signal d'accumulation ou de prise de profit à surveiller.",
    positives: [
      "Effet prix favorable sur les oléagineux",
      "Payout modéré (41 %) laissant de la place à la hausse du dividende",
    ],
    risks: [
      "Résultats très sensibles au cours mondial de l'huile de palme",
      "+55 % environ sur un an : risque de correction si les cours se retournent",
    ],
    watchNext: [
      "Le cours international de l'huile de palme",
      "Le volume des prochaines séances après le pic du jour",
    ],
  },
  ETIT: {
    headline: "La décote panafricaine",
    summary:
      "Ecobank se paie 0,5× ses fonds propres pour un ROE de 15 % : la décote reflète le risque de change (naira, cedi) et la complexité du groupe, mais la dynamique bénéficiaire s'améliore.",
    positives: [
      "Valorisation très basse (P/B 0,5, PER < 4)",
      "Liquidité la plus élevée de la BRVM",
      "Rendement attractif malgré un payout de 29 % seulement",
    ],
    risks: [
      "Exposition aux dévaluations (Nigeria, Ghana)",
      "Résultats en devises volatiles, dividende en FCFA variable",
    ],
    watchNext: [
      "L'évolution du naira et du cedi",
      "Le coût du risque consolidé au prochain trimestre",
    ],
  },
  BOAB: {
    headline: "Gros rendement, petite marge de sécurité",
    summary:
      "BOA Burkina offre l'un des rendements les plus élevés de la cote (~9 % brut), mais distribue 92 % de son bénéfice : le dividende dépend entièrement de la stabilité des résultats, dans un contexte pays exigeant.",
    positives: [
      "Rendement net parmi les plus élevés de la BRVM",
      "Historique de distribution régulier",
    ],
    risks: [
      "Payout de 92 % : toute baisse du bénéfice se répercutera sur le dividende",
      "Contexte sécuritaire et économique burkinabè",
    ],
    watchNext: [
      "Le coût du risque dans les prochains états financiers",
      "Le maintien (ou non) du niveau de dividende en 2027",
    ],
  },
  CBIBF: {
    headline: "Croissance rapide, risque qui monte",
    summary:
      "Coris Bank croît vite (PNB +16 %, crédits +26 %) mais le coût du risque bondit de 42 % : classique d'une banque en expansion agressive. La rentabilité reste excellente, la vigilance s'impose.",
    positives: [
      "ROE de 24 %, parmi les meilleurs du secteur",
      "Coefficient d'exploitation très bas (45 %)",
    ],
    risks: [
      "Coût du risque +42 % : la qualité des nouveaux crédits est la question clé",
      "Concentration géographique au Burkina et dans le Sahel",
    ],
    watchNext: [
      "Le taux de créances douteuses au prochain arrêté",
      "Le rythme de croissance des encours",
    ],
  },
  SPHC: {
    headline: "Le turnaround du caoutchouc",
    summary:
      "SAPH revient dans le vert (6,5 Mds FCFA de bénéfice après -12 Mds) grâce au redressement des cours de l'hévéa. Le retournement est réel mais récent : pas encore de dividende, et une rentabilité à reconstruire.",
    positives: [
      "Retour aux bénéfices après deux exercices difficiles",
      "Effet prix favorable sur le caoutchouc naturel",
    ],
    risks: [
      "ROE encore faible (8 %)",
      "Pas de dividende : le rendement repose uniquement sur le cours",
    ],
    watchNext: [
      "La confirmation du redressement au S1 2026",
      "Une éventuelle reprise du dividende",
    ],
  },
};

export function generateInsight(
  stock: Stock,
  d: Derived,
  signals: Signal[]
): AIInsight {
  const custom = CUSTOM[stock.ticker];
  if (custom) return custom;

  const f = stock.fundamentals;
  const positives = signals
    .filter((s) => s.tone === "positive")
    .map((s) => s.detail);
  const risks = signals
    .filter((s) => s.tone === "negative" || s.tone === "warning")
    .map((s) => s.detail);

  if (positives.length === 0) {
    positives.push(
      `Rendement net du dividende de ${d.yieldNet.toFixed(1)} % au cours actuel.`
    );
  }
  if (risks.length === 0) {
    risks.push(
      "Liquidité limitée : des ordres importants peuvent faire bouger le cours."
    );
  }

  const trend =
    d.yearChange > 5
      ? `Le titre progresse de ${d.yearChange.toFixed(0)} % sur un an`
      : d.yearChange < -5
        ? `Le titre recule de ${Math.abs(d.yearChange).toFixed(0)} % sur un an`
        : "Le titre évolue sans tendance marquée sur un an";

  return {
    headline: `${stock.name} en résumé`,
    summary: `${trend}. ${f.revenueLabel} ${
      d.revenueGrowth >= 0 ? "en hausse" : "en baisse"
    } de ${Math.abs(d.revenueGrowth).toFixed(1)} %, résultat net ${
      d.netIncomeGrowth >= 0 ? "+" : ""
    }${d.netIncomeGrowth.toFixed(1)} %. PER de ${d.per.toFixed(1)}, rendement net de ${d.yieldNet.toFixed(1)} %.`,
    positives,
    risks,
    watchNext: [
      "La prochaine publication de résultats",
      "L'annonce du dividende et sa date de détachement",
    ],
  };
}
