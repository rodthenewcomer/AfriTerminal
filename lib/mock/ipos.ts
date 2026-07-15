import type { IPOItem } from "@wariba/core/types";

export const IPOS: IPOItem[] = [
  {
    id: "bridge-bank",
    name: "Bridge Bank Group Côte d'Ivoire",
    ticker: null,
    kind: "IPO",
    status: "En cours",
    date: "2026-07-15",
    summary:
      "Introduction en bourse simulée d'une banque ivoirienne de taille moyenne en forte croissance. Environ 20 % du capital est offert au public via une OPV à prix ferme.",
    metrics: [
      { label: "Prix indicatif", value: "6 750 FCFA" },
      { label: "Montant levé visé", value: "45 Mds FCFA" },
      { label: "Part du capital offerte", value: "20 %" },
      { label: "PER implicite", value: "12,4" },
      { label: "P/B implicite", value: "1,9" },
      { label: "Payout projeté", value: "45 %" },
      { label: "Rendement net estimé", value: "4,1 %" },
    ],
    risk: "Valorisation supérieure à la moyenne des banques cotées (PER secteur ~10) : le prix paie déjà la croissance future. Liquidité post-IPO incertaine.",
    opportunity:
      "Croissance du PNB supérieure au secteur et positionnement PME attractif. Si la croissance se maintient, le PER 2027 implicite retombe vers 9.",
  },
  {
    id: "boab-capital",
    name: "BOA Burkina — Augmentation de capital",
    ticker: "BOAB",
    kind: "Augmentation de capital",
    status: "À venir",
    date: "2026-09-10",
    summary:
      "Augmentation de capital simulée d'environ 15 Mds FCFA avec droit préférentiel de souscription, destinée à renforcer les fonds propres réglementaires.",
    metrics: [
      { label: "Montant visé", value: "15 Mds FCFA" },
      { label: "Modalité", value: "DPS, 1 nouvelle pour 6 anciennes" },
      { label: "Prix de souscription indicatif", value: "4 100 FCFA" },
    ],
    risk: "Dilution d'environ 14 % pour les actionnaires qui ne suivent pas. Pression possible sur le cours pendant la période de souscription.",
    opportunity:
      "Renforcement de la solvabilité ; le prix de souscription offre une décote de ~11 % sur le cours actuel.",
  },
  {
    id: "ciec-opv",
    name: "CIE — Cession d'un bloc de l'État (OPV)",
    ticker: "CIEC",
    kind: "OPV",
    status: "À l'étude",
    date: "2026-11-01",
    summary:
      "L'État ivoirien étudie la cession d'une tranche supplémentaire de sa participation via une offre publique de vente, pour élargir le flottant.",
    metrics: [
      { label: "Tranche étudiée", value: "5 à 8 % du capital" },
      { label: "Effet attendu", value: "Hausse du flottant et de la liquidité" },
    ],
    risk: "Une OPV mal calibrée peut peser temporairement sur le cours.",
    opportunity:
      "Un flottant élargi améliorerait la liquidité et l'éligibilité du titre aux portefeuilles institutionnels.",
  },
  {
    id: "snts-split",
    name: "Sonatel — Division du nominal à l'étude",
    ticker: "SNTS",
    kind: "Split",
    status: "À l'étude",
    date: "2026-10-15",
    summary:
      "Le conseil d'administration étudie un split 10:1 pour rendre le titre (24 500 FCFA) plus accessible aux particuliers, sur le modèle des splits déjà réalisés sur la cote.",
    metrics: [
      { label: "Ratio étudié", value: "10 pour 1" },
      { label: "Cours post-split théorique", value: "~2 450 FCFA" },
    ],
    risk: "Aucun impact sur la valeur fondamentale : ne pas confondre accessibilité et création de valeur.",
    opportunity:
      "Historiquement, les splits BRVM ont amélioré la liquidité et élargi la base d'actionnaires particuliers.",
  },
  {
    id: "tpci-bond",
    name: "État de Côte d'Ivoire — Emprunt obligataire TPCI 6,15 % 2026-2036",
    ticker: null,
    kind: "Emprunt obligataire",
    status: "En cours",
    date: "2026-07-20",
    summary:
      "Émission obligataire par appel public à l'épargne : 6,15 % brut sur 10 ans, coupon annuel. Référence utile pour comparer les rendements des actions à dividende.",
    metrics: [
      { label: "Taux facial", value: "6,15 % brut" },
      { label: "Maturité", value: "10 ans" },
      { label: "Nominal", value: "10 000 FCFA" },
    ],
    risk: "Risque de taux en cas de remontée des rendements régionaux.",
    opportunity:
      "Point de comparaison : un dividende net d'action > 6 % avec croissance bat ce rendement obligataire à long terme.",
  },
];
