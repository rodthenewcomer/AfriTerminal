import type { DocItem } from "@wariba/core/types";

// basis: "réel" = chiffres cohérents avec data/real/snapshot.json (vérifié
// 2026-07-08). basis: "illustratif" = scénario construit sur des
// fondamentaux (résultat net, PNB, ROE, coût du risque, propositions
// d'AGO à venir...) qu'aucun pipeline ne collecte réellement.
//
// Les documents de dividende (ORAC, BOAB, TTLC) ont été corrigés le
// 2026-07-08 : les montants/dates inventés ne correspondaient pas aux
// vrais dividendes versés (ex. ORAC : 950 FCFA inventé vs 704 FCFA réel).
export const DOCUMENTS: DocItem[] = [
  {
    id: "unxc-fy2025",
    ticker: "UNXC",
    title: "Uniwax — États financiers annuels 2025",
    type: "États financiers",
    date: "2026-06-30",
    importance: 3,
    summary:
      "Résultat net de 8,2 Mds FCFA en très forte hausse, mais porté par un produit exceptionnel. Le résultat des activités ordinaires ressort à -330 M FCFA : le cœur d'activité reste déficitaire.",
    keyPoints: [
      "Résultat net : 8,2 Mds FCFA (contre 1,2 Md en 2024)",
      "Résultat des activités ordinaires : -330 M FCFA",
      "Chiffre d'affaires : 58,0 Mds FCFA (-5,7 %)",
    ],
    figures: [
      { label: "Résultat net", value: "8,2 Mds FCFA" },
      { label: "Résultat ordinaire", value: "-330 M FCFA" },
      { label: "CA", value: "58,0 Mds FCFA" },
    ],
    redFlags: [
      "Bénéfice issu d'éléments HAO non récurrents",
      "Activité ordinaire déficitaire",
      "CA en recul pour la 2e année consécutive",
    ],
    greenFlags: ["Trésorerie renforcée"],
    basis: "illustratif",
  },
  {
    id: "nsbc-s1-2026",
    ticker: "NSBC",
    title: "NSIA Banque CI — Résultats du 1er semestre 2026",
    type: "Résultats",
    date: "2026-07-03",
    importance: 3,
    summary:
      "PNB en hausse de 28 % et résultat net +53 %. Le coefficient d'exploitation passe de 58 % à 52 % : les revenus croissent nettement plus vite que les charges.",
    keyPoints: [
      "PNB : 145 Mds FCFA (+28 %)",
      "Résultat net : 42 Mds FCFA (+53 %)",
      "Coefficient d'exploitation : 52 % (vs 58 %)",
    ],
    figures: [
      { label: "PNB", value: "145 Mds FCFA" },
      { label: "Résultat net", value: "42 Mds FCFA" },
      { label: "Coef. d'exploitation", value: "52 %" },
    ],
    redFlags: [],
    greenFlags: [
      "Levier opérationnel positif",
      "Croissance portée par l'activité cœur",
    ],
    basis: "illustratif",
  },
  {
    id: "orac-div-2026",
    ticker: "ORAC",
    title: "Orange CI — Dividende versé au titre de 2025",
    type: "Dividende",
    date: "2026-06-08",
    importance: 2,
    summary:
      "Dividende net de 704 FCFA par action (rendement net 4,32 % au cours du 8 juillet 2026), détaché le 8 juin 2026.",
    keyPoints: [
      "Dividende net : 704 FCFA / action",
      "Date de détachement : 8 juin 2026",
      "Rendement net au cours actuel : 4,32 %",
    ],
    figures: [
      { label: "Dividende net", value: "704 FCFA" },
      { label: "Rendement net", value: "4,32 %" },
    ],
    redFlags: [],
    greenFlags: ["Dividende confirmé et versé"],
    basis: "réel",
  },
  {
    id: "cbibf-t1-2026",
    ticker: "CBIBF",
    title: "Coris Bank — Rapport d'activité T1 2026",
    type: "Résultats",
    date: "2026-06-24",
    importance: 2,
    summary:
      "Croissance toujours soutenue (PNB +16 %) mais le coût du risque bondit de 42 % sur un an, en lien avec l'expansion rapide des encours de crédit (+26 %).",
    keyPoints: [
      "PNB trimestriel : +16 %",
      "Encours de crédits : +26 % sur un an",
      "Coût du risque : +42 %",
    ],
    figures: [
      { label: "PNB T1", value: "34 Mds FCFA" },
      { label: "Crédits", value: "+26 %" },
      { label: "Coût du risque", value: "+42 %" },
    ],
    redFlags: ["Coût du risque en forte hausse"],
    greenFlags: ["Rentabilité maintenue (ROE 24 %)"],
    basis: "illustratif",
  },
  {
    id: "snts-s1-2026",
    ticker: "SNTS",
    title: "Sonatel — Communiqué résultats S1 2026",
    type: "Résultats",
    date: "2026-07-06",
    importance: 3,
    summary:
      "Chiffre d'affaires +6,9 % porté par Orange Money et la data. Marge d'EBITDA stable au-dessus de 45 %. Le groupe confirme ses objectifs annuels.",
    keyPoints: [
      "CA S1 : +6,9 %",
      "Orange Money : +18 % de revenus",
      "Objectifs 2026 confirmés",
    ],
    figures: [
      { label: "CA S1", value: "905 Mds FCFA" },
      { label: "Marge EBITDA", value: "45,3 %" },
    ],
    redFlags: [],
    greenFlags: ["Croissance régulière", "Guidance confirmée"],
    basis: "illustratif",
  },
  {
    id: "sgbc-ago-2026",
    ticker: "SGBC",
    title: "SGCI — Convocation à l'Assemblée Générale Ordinaire",
    type: "AGO",
    date: "2026-06-15",
    importance: 1,
    summary:
      "AGO convoquée le 28 juillet 2026 à Abidjan. À l'ordre du jour : approbation des comptes 2025 et proposition de dividende. Pour mémoire, le dernier dividende versé (exercice précédent) était de 1 645,78 FCFA net, détaché le 5 août 2025.",
    keyPoints: [
      "AGO le 28 juillet 2026",
      "Dernier dividende versé (référence) : 1 645,78 FCFA net",
      "Renouvellement de deux administrateurs",
    ],
    figures: [{ label: "Dernier dividende net versé", value: "1 645,78 FCFA" }],
    redFlags: [],
    greenFlags: [],
    basis: "illustratif",
  },
  {
    id: "sphc-fy2025",
    ticker: "SPHC",
    title: "SAPH — États financiers 2025 : retour aux bénéfices",
    type: "États financiers",
    date: "2026-06-20",
    importance: 2,
    summary:
      "Après une perte de 12 Mds FCFA en 2024, SAPH renoue avec un bénéfice de 6,5 Mds FCFA grâce au redressement des cours du caoutchouc.",
    keyPoints: [
      "Résultat net : 6,5 Mds FCFA (vs -12 Mds)",
      "CA : 481 Mds FCFA (+5,5 %)",
    ],
    figures: [
      { label: "Résultat net", value: "6,5 Mds FCFA" },
      { label: "CA", value: "481 Mds FCFA" },
    ],
    redFlags: ["Rentabilité encore faible"],
    greenFlags: ["Turnaround engagé", "Effet prix hévéa favorable"],
    basis: "illustratif",
  },
  {
    id: "bridge-ipo-2026",
    ticker: "BICC",
    title: "Bridge Bank Group CI — Note d'information IPO (scénario pédagogique)",
    type: "IPO",
    date: "2026-06-27",
    importance: 3,
    summary:
      "Scénario pédagogique d'introduction en bourse : prix indicatif de 6 750 FCFA, environ 20 % du capital ouvert au public. PER implicite de 12,4 et P/B de 1,9 — une valorisation exigeante face aux banques déjà cotées.",
    keyPoints: [
      "Prix indicatif : 6 750 FCFA",
      "Part du capital offerte : ~20 %",
      "PER implicite : 12,4 · P/B : 1,9",
    ],
    figures: [
      { label: "Prix indicatif", value: "6 750 FCFA" },
      { label: "PER implicite", value: "12,4" },
      { label: "P/B implicite", value: "1,9" },
    ],
    redFlags: ["Valorisation supérieure à la moyenne des banques cotées"],
    greenFlags: ["Croissance du PNB supérieure au secteur"],
    basis: "illustratif",
  },
  {
    id: "boab-div-2026",
    ticker: "BOAB",
    title: "BOA Burkina — Dividende versé au titre de 2025",
    type: "Dividende",
    date: "2026-05-26",
    importance: 2,
    summary:
      "Dividende net de 585 FCFA par action, soit un rendement net de 6,43 % au cours du 8 juillet 2026 — l'un des rendements les plus élevés de la cote.",
    keyPoints: [
      "Dividende net : 585 FCFA / action",
      "Rendement net au cours actuel : 6,43 %",
    ],
    figures: [
      { label: "Dividende net", value: "585 FCFA" },
      { label: "Rendement net", value: "6,43 %" },
    ],
    redFlags: [],
    greenFlags: ["Rendement net élevé"],
    basis: "réel",
  },
  {
    id: "etit-t1-2026",
    ticker: "ETIT",
    title: "Ecobank ETI — Résultats consolidés T1 2026",
    type: "Résultats",
    date: "2026-05-30",
    importance: 2,
    summary:
      "Résultat net attribuable en hausse de 15 % en FCFA malgré la volatilité du naira. Le ROE consolidé remonte à 15,2 %.",
    keyPoints: [
      "Résultat net : +15 % en FCFA",
      "ROE consolidé : 15,2 %",
      "Impact de change négatif au Nigeria",
    ],
    figures: [
      { label: "Résultat net T1", value: "34 Mds FCFA" },
      { label: "ROE", value: "15,2 %" },
    ],
    redFlags: ["Exposition naira/cedi"],
    greenFlags: ["Amélioration continue de la rentabilité"],
    basis: "illustratif",
  },
  {
    id: "palc-com-2026",
    ticker: "PALC",
    title: "Palm CI — Communiqué : impact de la hausse des cours de l'huile de palme",
    type: "Communiqué",
    date: "2026-07-02",
    importance: 2,
    summary:
      "La société confirme un effet prix favorable au S1 2026. Le titre progresse de 10,8 % sur un an, avec un rendement net de 4,98 % au cours actuel.",
    keyPoints: [
      "Effet prix favorable confirmé au S1",
      "Variation 1 an : +10,8 % (réel)",
    ],
    figures: [{ label: "Variation 1 an", value: "+10,8 %" }],
    redFlags: ["Dépendance au cours mondial de l'huile de palme"],
    greenFlags: [],
    basis: "illustratif",
  },
  {
    id: "ciec-fy2025",
    ticker: "CIEC",
    title: "CIE — Rapport annuel 2025",
    type: "États financiers",
    date: "2026-05-18",
    importance: 1,
    summary:
      "Année régulière pour le concessionnaire : CA +5,6 %, résultat net +8,8 %. Le renouvellement de la concession court jusqu'en 2044, offrant une visibilité rare sur la cote.",
    keyPoints: [
      "CA : 692 Mds FCFA (+5,6 %)",
      "Résultat net : 18,5 Mds FCFA (+8,8 %)",
      "Concession jusqu'en 2044",
    ],
    figures: [
      { label: "CA", value: "692 Mds FCFA" },
      { label: "Résultat net", value: "18,5 Mds FCFA" },
    ],
    redFlags: [],
    greenFlags: ["Revenus régulés et prévisibles"],
    basis: "illustratif",
  },
  {
    id: "ontbf-s1-2026",
    ticker: "ONTBF",
    title: "Onatel — Chiffre d'affaires S1 2026 en léger repli",
    type: "Résultats",
    date: "2026-06-28",
    importance: 2,
    summary:
      "CA en baisse de 3,4 % dans un contexte national difficile. Le résultat net recule de 10 %.",
    keyPoints: [
      "CA S1 : -3,4 %",
      "Résultat net : -10 %",
    ],
    figures: [
      { label: "CA S1", value: "96 Mds FCFA" },
      { label: "Résultat net S1", value: "10,4 Mds FCFA" },
    ],
    redFlags: ["Activité en recul", "Contexte pays difficile"],
    greenFlags: [],
    basis: "illustratif",
  },
  {
    id: "ttlc-div-2026",
    ticker: "TTLC",
    title: "TotalEnergies CI — Dividende versé au titre de 2024",
    type: "Dividende",
    date: "2025-09-03",
    importance: 1,
    summary:
      "Dividende net de 195,67 FCFA par action, soit un rendement net de 6,66 % au cours du 8 juillet 2026.",
    keyPoints: [
      "Dividende net : 195,67 FCFA / action",
      "Rendement net au cours actuel : 6,66 %",
    ],
    figures: [
      { label: "Dividende net", value: "195,67 FCFA" },
      { label: "Rendement net", value: "6,66 %" },
    ],
    redFlags: [],
    greenFlags: [],
    basis: "réel",
  },
  {
    id: "sibc-s1-2026",
    ticker: "SIBC",
    title: "SIB — Résultats S1 2026",
    type: "Résultats",
    date: "2026-07-04",
    importance: 2,
    summary:
      "PNB +7,7 % et résultat net +8,2 %. Trajectoire régulière. Le coût du risque reste contenu (+8 %).",
    keyPoints: [
      "PNB : +7,7 %",
      "Résultat net : +8,2 %",
      "Coût du risque : +8 %",
    ],
    figures: [
      { label: "PNB S1", value: "51 Mds FCFA" },
      { label: "Résultat net S1", value: "17,5 Mds FCFA" },
    ],
    redFlags: [],
    greenFlags: ["Régularité des résultats"],
    basis: "illustratif",
  },
  {
    id: "bicc-com-2026",
    ticker: "BICC",
    title: "BICICI — Communiqué sur le plan stratégique 2026-2028",
    type: "Communiqué",
    date: "2026-06-05",
    importance: 1,
    summary:
      "Nouveau plan stratégique post-reprise par le groupe BNI : objectif de ROE de 16 % d'ici 2028.",
    keyPoints: [
      "Objectif ROE 2028 : 16 %",
    ],
    figures: [{ label: "Objectif ROE", value: "16 % (2028)" }],
    redFlags: [],
    greenFlags: ["Plan de redressement crédible"],
    basis: "illustratif",
  },
];

export function docsForTicker(ticker: string): DocItem[] {
  return DOCUMENTS.filter((d) => d.ticker === ticker).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export function latestDocuments(count: number): DocItem[] {
  return [...DOCUMENTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
}
