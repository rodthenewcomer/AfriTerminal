import type { AlertItem } from "@wariba/core/types";

// basis: "réel" = vérifié contre data/real/snapshot.json le 2026-07-08.
// basis: "illustratif" = scénario pédagogique signalé comme tel, construit
// sur des fondamentaux (résultat net, PNB, ROE, coût du risque...) qu'aucun
// pipeline ne collecte réellement — voir scripts/boc/README.md.
//
// Plusieurs alertes ont été corrigées ou retirées le 2026-07-08 après
// comparaison avec les vraies données : ex. PALC n'a PAS de volume anormal
// aujourd'hui (0,73×, contre 3,4× inventé) — mais UNXC, si (3,7× réel),
// d'où le changement de ticker sur l'alerte volume. Voir aussi
// git log pour le détail des corrections.
export const ALERTS: AlertItem[] = [
  {
    id: "a1",
    type: "ia",
    ticker: "UNXC",
    title: "Bénéfice non durable détecté",
    detail:
      "Résultat net de 8,2 Mds FCFA mais résultat ordinaire de -330 M : le bénéfice provient d'éléments exceptionnels. Ne pas traiter comme un bénéfice récurrent.",
    time: "2026-07-07T09:12:00Z",
    severity: "critical",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a2",
    type: "volume",
    ticker: "UNXC",
    title: "Volume à 3,7× la moyenne 30 jours",
    detail:
      "Uniwax traite un volume inhabituel dès l'ouverture. Le titre est aussi en très forte hausse sur un an (+150 %) : mouvement à surveiller de près sur les prochaines séances.",
    time: "2026-07-07T10:05:00Z",
    severity: "warning",
    active: true,
    basis: "réel",
  },
  {
    id: "a3",
    type: "ia",
    ticker: "NSBC",
    title: "Levier opérationnel positif confirmé",
    detail:
      "PNB +28 %, coefficient d'exploitation en baisse de 58 % à 52 % : signal de qualité pour une banque en croissance.",
    time: "2026-07-07T09:30:00Z",
    severity: "positive",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a4",
    type: "dividende",
    ticker: "ORAC",
    title: "Dernier dividende versé : 704 FCFA net",
    detail:
      "Orange CI a versé un dividende net de 704 FCFA par action (rendement net 4,32 % au cours actuel), détaché le 8 juin 2026.",
    time: "2026-07-06T16:40:00Z",
    severity: "info",
    active: true,
    basis: "réel",
  },
  {
    id: "a5",
    type: "fondamental",
    ticker: "CBIBF",
    title: "Coût du risque +42 % sur un an",
    detail:
      "La croissance rapide des crédits (+26 %) s'accompagne d'une montée du coût du risque. Surveiller le taux de créances douteuses au prochain arrêté.",
    time: "2026-07-05T11:20:00Z",
    severity: "warning",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a6",
    type: "document",
    ticker: "SNTS",
    title: "Résultats S1 2026 publiés",
    detail:
      "CA +6,9 %, marge EBITDA 45,3 %, objectifs annuels confirmés. Résumé IA disponible sur la fiche Sonatel.",
    time: "2026-07-06T08:05:00Z",
    severity: "info",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a7",
    type: "fondamental",
    ticker: "BOAB",
    title: "Payout élevé : durabilité du dividende à surveiller",
    detail:
      "Le rendement net réel est attractif (6,43 % au cours actuel), mais le payout (part du bénéfice distribuée) n'est pas mesurable sans les résultats financiers. Prudence tant que ce ratio n'est pas confirmé.",
    time: "2026-07-04T14:15:00Z",
    severity: "warning",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a8",
    type: "prix",
    ticker: "NSBC",
    title: "NSBC dépasse 20 000 FCFA",
    detail:
      "Le titre franchit ce seuil pour la première fois, porté par une hausse de 78 % depuis le 1er janvier (alerte de prix personnalisée, exemple).",
    time: "2026-07-07T08:30:00Z",
    severity: "positive",
    active: true,
    basis: "réel",
  },
  {
    id: "a9",
    type: "ia",
    ticker: "SPHC",
    title: "Turnaround : retour aux bénéfices",
    detail:
      "SAPH publie 6,5 Mds FCFA de résultat net après -12 Mds en 2024. Redressement à confirmer sur plusieurs exercices.",
    time: "2026-06-20T09:50:00Z",
    severity: "info",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a10",
    type: "document",
    ticker: "BICC",
    title: "IPO Bridge Bank : note d'information disponible",
    detail:
      "Prix indicatif 6 750 FCFA, PER implicite 12,4. Analyse comparative disponible sur la page IPO. (Scénario pédagogique)",
    time: "2026-06-27T10:00:00Z",
    severity: "info",
    active: true,
    basis: "illustratif",
  },
  {
    id: "a11",
    type: "ia",
    ticker: "UNXC",
    title: "Retournement spectaculaire sur un an : +150 %",
    detail:
      "Uniwax affiche la plus forte progression annuelle de la cote. Une telle amplitude, combinée au volume anormal du jour, appelle à la prudence : vérifier ce qui justifie fondamentalement ce mouvement avant d'y voir un signal d'achat.",
    time: "2026-07-02T12:30:00Z",
    severity: "warning",
    active: true,
    basis: "réel",
  },
  {
    id: "a12",
    type: "prix",
    ticker: "PALC",
    title: "PALC : +10,8 % sur un an",
    detail:
      "Progression régulière sur la période, sans mouvement de volume particulier aujourd'hui (0,7× la moyenne). Rendement net de 4,98 % au cours actuel.",
    time: "2026-07-01T15:10:00Z",
    severity: "info",
    active: true,
    basis: "réel",
  },
];

export function alertsOfDay(): AlertItem[] {
  return ALERTS.filter((a) => a.time.startsWith("2026-07-07"));
}
