/**
 * Glossaire intégré — « la BRVM devient lisible » : chaque terme
 * financier affiché dans l'app peut porter une définition en une ou
 * deux phrases, factuelle et sans jargon. Consommé par <Term/>.
 */
export interface GlossaryEntry {
  label: string;
  def: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  per: {
    label: "PER",
    def: "Price/Earnings Ratio : cours divisé par le bénéfice net par action. WARIBA affiche la valeur du bulletin BRVM avec sa date ; elle peut reposer sur une période bénéficiaire différente des derniers comptes intégrés. Si ces derniers sont déficitaires, le PER est masqué car il n'est pas économiquement interprétable.",
  },
  "rendement-net": {
    label: "Rendement net",
    def: "Dividende net (après IRVM de 10 %) divisé par le cours, en %. Ce que rapporte l'action en dividendes chaque année, au cours actuel.",
  },
  "dividende-net": {
    label: "Dividende net",
    def: "Montant effectivement versé par action, après retenue de l'IRVM (impôt de 10 % à la source sur les dividendes dans l'UEMOA).",
  },
  payout: {
    label: "Payout",
    def: "Part du bénéfice net distribuée en dividendes. Au-delà de ~90 %, la société distribue presque tout — peu de marge en cas de coup dur.",
  },
  capitalisation: {
    label: "Capitalisation",
    def: "Cours × nombre d'actions en circulation : la valeur boursière totale de la société.",
  },
  bpa: {
    label: "BPA",
    def: "Bénéfice par action : résultat net de l'exercice divisé par le nombre d'actions en circulation. Il indique la part du bénéfice comptable générée pour une action, pas le dividende versé.",
  },
  pb: {
    label: "P/B",
    def: "Price-to-Book : le cours rapporté aux capitaux propres par action. Sous 1, la bourse valorise la société sous ses fonds propres comptables.",
  },
  roe: {
    label: "ROE",
    def: "Return on Equity : résultat net / capitaux propres. La rentabilité que la société tire des fonds de ses actionnaires.",
  },
  "marge-nette": {
    label: "Marge nette",
    def: "Résultat net divisé par le chiffre d'affaires : ce qui reste en bénéfice sur 100 FCFA de ventes.",
  },
  "chiffre-affaires": {
    label: "Chiffre d'affaires",
    def: "Total des ventes réalisées pendant l'exercice, avant les charges. La variation vs N-1 montre la croissance ou le recul de l'activité, sans dire à elle seule si elle est rentable.",
  },
  "resultat-net": {
    label: "Résultat net",
    def: "Bénéfice ou perte restant après charges d'exploitation, résultat financier, éléments exceptionnels et impôts. Positif ne signifie pas automatiquement qu'il sera distribué en dividende.",
  },
  "resultat-ordinaire": {
    label: "Résultat ordinaire",
    def: "Résultat des activités ordinaires (norme SYSCOHADA) : la performance du cœur d'activité, avant éléments exceptionnels. S'il est négatif alors que le résultat net est positif, le bénéfice ne vient pas du métier.",
  },
  pnb: {
    label: "PNB",
    def: "Produit Net Bancaire : l'équivalent du chiffre d'affaires pour une banque (marge d'intérêts + commissions).",
  },
  cir: {
    label: "Coefficient d'exploitation",
    def: "Charges d'exploitation / PNB d'une banque. Plus il est bas, plus la banque est efficace ; sous 60 % c'est généralement bien géré.",
  },
  "cout-du-risque": {
    label: "Coût du risque",
    def: "Provisions nettes passées sur les crédits douteux. Une valeur négative = les reprises dépassent les dotations (bonne nouvelle).",
  },
  "depots-clientele": {
    label: "Dépôts clientèle",
    def: "Argent confié à la banque par ses clients. C'est une ressource majeure pour financer les crédits, mais aussi une dette de la banque envers ses déposants.",
  },
  "credits-clientele": {
    label: "Crédits clientèle",
    def: "Montant des prêts accordés aux clients. Leur progression peut soutenir les revenus, mais doit être lue avec le coût du risque et la qualité du portefeuille.",
  },
  "dividende-propose": {
    label: "Dividende brut proposé",
    def: "Montant par action proposé par le conseil au titre de l'exercice. Il reste soumis au vote de l'assemblée générale et diffère du montant net après impôt réellement versé.",
  },
  "vol-moyen": {
    label: "Volume moyen 30 j",
    def: "Nombre moyen de titres échangés par séance sur les 30 dernières séances — la liquidité réelle de la valeur.",
  },
  volatilite: {
    label: "Volatilité",
    def: "Amplitude des variations quotidiennes du cours, annualisée. Plus elle est élevée, plus le titre bouge fort — dans les deux sens. Calculée sur les 252 dernières séances officielles.",
  },
  beta: {
    label: "Bêta",
    def: "Sensibilité du titre aux mouvements du marché (BRVM Composite). 1 = bouge comme le marché ; > 1 = amplifie ; < 1 = amortit ; négatif = à contre-courant. Calculé sur 1 an de séances communes.",
  },
  drawdown: {
    label: "Perte max.",
    def: "La pire baisse subie depuis un sommet de clôture — ce qu'aurait perdu, au pire moment, un investisseur entré au plus haut. Calculée sur tout l'historique disponible (2019+).",
  },
  saisonnalite: {
    label: "Saisonnalité",
    def: "Les mois où une société a, par le passé, versé un dividende — pas une date annoncée à l'avance (la BRVM ne publie pas de calendrier d'ex-dividende exploitable). Un versement observé sur au moins 2 années différentes est marqué « récurrent », sans que cela garantisse le prochain versement.",
  },
  ytd: {
    label: "YTD",
    def: "Year-to-date : la variation depuis le 1er janvier de l'année en cours.",
  },
};
