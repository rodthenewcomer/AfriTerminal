export type SgiContactPreference = "digital" | "phone" | "office";
export type InvestorExperience = "beginner" | "experienced";
export type SgiPriority = "fees" | "digital" | "support";
export type InvestableAmount = "under-500k" | "500k-5m" | "over-5m";

export interface SgiQuestionnaire {
  contactPreference: SgiContactPreference;
  experience: InvestorExperience;
  priority: SgiPriority;
  amount: InvestableAmount;
}

export interface SgiProfile {
  id: string;
  name: string;
  shortName: string;
  country: "Côte d'Ivoire";
  city: "Abidjan";
  address: string;
  phones: string[];
  email: string | null;
  website: string | null;
  officialDirectoryUrl: string;
  verifiedOn: string;
  verifiedRole: "SGI agréée pour les transactions à la BRVM";
  unknowns: readonly ["Frais de courtage", "Dépôt minimum", "Ouverture à distance", "Délai d'ouverture"];
}

const PAGE = "https://www.brvm.org/en/pays-sgi/cote-divoire";
const UNKNOWN_FIELDS = [
  "Frais de courtage",
  "Dépôt minimum",
  "Ouverture à distance",
  "Délai d'ouverture",
] as const;

function profile(
  value: Omit<SgiProfile, "country" | "city" | "verifiedOn" | "verifiedRole" | "unknowns">
): SgiProfile {
  return {
    ...value,
    country: "Côte d'Ivoire",
    city: "Abidjan",
    verifiedOn: "2026-07-19",
    verifiedRole: "SGI agréée pour les transactions à la BRVM",
    unknowns: UNKNOWN_FIELDS,
  };
}

export const COTE_DIVOIRE_SGIS: SgiProfile[] = [
  profile({
    id: "atlantique-finance",
    name: "ATLANTIQUE FINANCE",
    shortName: "Atlantique Finance",
    address: "15 avenue Joseph Anoma, 10e étage, Abidjan-Plateau",
    phones: ["+225 27 20 31 21 21", "+225 27 20 31 21 23"],
    email: "atlantiquefinance@banqueatlantique.net",
    website: "https://www.atlantiquefinance.net/",
    officialDirectoryUrl: PAGE,
  }),
  profile({
    id: "attijari-securities-west-africa",
    name: "ATTIJARI SECURITIES WEST AFRICA",
    shortName: "ASWA",
    address: "Rue Gourgas, Tour Alpha 2000, 3e étage, Abidjan-Plateau",
    phones: ["+225 27 20 21 98 26", "+225 27 20 21 98 32"],
    email: "aswa@sib.ci",
    website: "https://www.sib.ci/",
    officialDirectoryUrl: PAGE,
  }),
  profile({
    id: "boa-capital-securities",
    name: "BOA CAPITAL SECURITIES",
    shortName: "BOA Capital Securities",
    address: "Boulevard de la République / Avenue Crozet, immeuble XL, 2e étage, Abidjan-Plateau",
    phones: ["+225 27 20 30 21 22"],
    email: "info@boacapital.com",
    website: "https://www.boacapital.com/",
    officialDirectoryUrl: PAGE,
  }),
  profile({
    id: "bridge-securities",
    name: "BRIDGE SECURITIES",
    shortName: "Bridge Securities",
    address: "Immeuble The One, Cocody, 33 rue Cannebière, Abidjan",
    phones: ["+225 05 85 74 98 98", "+225 05 74 80 80 31"],
    email: "info@bridge-securities.com",
    website: "https://www.bridge-securities.com/",
    officialDirectoryUrl: PAGE,
  }),
  profile({
    id: "bsic-capital",
    name: "BSIC CAPITAL SA",
    shortName: "BSIC Capital",
    address: "Avenue Noguès, immeuble Broadway, 3e étage, Abidjan-Plateau",
    phones: ["+225 27 20 31 71 11"],
    email: "bsic.capital@bsicbank.com",
    website: "https://bsiccapital.com/",
    officialDirectoryUrl: `${PAGE}?page=1`,
  }),
  profile({
    id: "gek-capital",
    name: "GEK CAPITAL",
    shortName: "GEK Capital",
    address: "Cocody Riviera Golf, Cité Riviera Beach, Villa Émeraude, Abidjan",
    phones: ["+225 27 22 22 43 60"],
    email: "info@gekcapital.com",
    website: "https://www.gekcapital.com/",
    officialDirectoryUrl: `${PAGE}?page=1`,
  }),
  profile({
    id: "matha-securities",
    name: "MATHA SECURITIES",
    shortName: "Matha Securities",
    address: "Immeuble Tropique 3, 3e étage, boulevard de la République, Abidjan-Plateau",
    phones: ["+225 27 20 24 30 30"],
    email: null,
    website: "https://mathasecurities.com/",
    officialDirectoryUrl: `${PAGE}?page=1`,
  }),
  profile({
    id: "nsia-finance",
    name: "NSIA FINANCE",
    shortName: "NSIA Finance",
    address: "8/10 avenue Joseph Anoma, Tour BIAO, 14e étage, Abidjan-Plateau",
    phones: ["+225 27 20 20 06 53"],
    email: "nsiafinance@nsiafinance.com",
    website: "https://www.nsiafinance.com/",
    officialDirectoryUrl: `${PAGE}?page=1`,
  }),
  profile({
    id: "oragroup-securities",
    name: "ORAGROUP SECURITIES",
    shortName: "Oragroup Securities",
    address: "Cocody Mermoz, rue Jeanne Gervais, lots 7B et 8, Abidjan",
    phones: ["+225 07 88 77 15 69"],
    email: "contactOGS@orabank.net",
    website: "https://www.oragroupsecurities.net/",
    officialDirectoryUrl: `${PAGE}?page=2`,
  }),
  profile({
    id: "phoenix-capital-management",
    name: "PHOENIX CAPITAL MANAGEMENT",
    shortName: "Phoenix Capital Management",
    address: "Cocody Riviera 4 Golf, Abidjan",
    phones: ["+225 27 22 59 85 80"],
    email: "cms@phoenixafrica.com",
    website: "https://phoenixafricaholding.com/pcm/",
    officialDirectoryUrl: `${PAGE}?page=2`,
  }),
  profile({
    id: "bici-bourse",
    name: "SGI BICI BOURSE",
    shortName: "BICI Bourse",
    address: "1er étage, agence BICICI Aghien, Cocody II Plateaux, Abidjan",
    phones: ["+225 27 20 20 16 68"],
    email: "bicibourse@africa.bnpparibas.com",
    website: null,
    officialDirectoryUrl: `${PAGE}?page=2`,
  }),
  profile({
    id: "bni-finances",
    name: "SGI BNI FINANCES",
    shortName: "BNI Finances",
    address: "Avenue Delafosse prolongée, immeuble Belle Rive, 14e étage, Abidjan-Plateau",
    phones: ["+225 27 20 31 07 77"],
    email: "bnifinances@bni.ci",
    website: null,
    officialDirectoryUrl: `${PAGE}?page=3`,
  }),
  profile({
    id: "edc-investment-corporation",
    name: "SGI EDC INVESTMENT CORPORATION",
    shortName: "EDC Investment Corporation",
    address: "Avenue Houdaille, immeuble Ecobank, 2e étage, Abidjan-Plateau",
    phones: ["+225 27 20 21 10 44"],
    email: "eic@ecobank.com",
    website: null,
    officialDirectoryUrl: `${PAGE}?page=3`,
  }),
  profile({
    id: "hudson-cie",
    name: "SGI HUDSON & CIE",
    shortName: "Hudson & Cie",
    address: "24 boulevard Clozel / avenue Lamblin, immeuble Le 24, 4e étage, Abidjan-Plateau",
    phones: ["+225 27 20 31 55 00"],
    email: "info@hudson-cie.com",
    website: "http://www.hudson-cie.com/",
    officialDirectoryUrl: `${PAGE}?page=3`,
  }),
  profile({
    id: "mac-african",
    name: "SGI MAC AFRICAN",
    shortName: "MAC African",
    address: "Cocody Riviera M'Badon, Abidjan",
    phones: ["+225 07 68 31 11 25", "+225 27 22 46 28 92"],
    email: "macafrican@macafrican.com",
    website: "https://www.macafricansgi.com/",
    officialDirectoryUrl: `${PAGE}?page=3`,
  }),
  profile({
    id: "sirius-capital",
    name: "SIRIUS CAPITAL",
    shortName: "Sirius Capital",
    address: "Rue Jesse Owens, immeuble SCIAM, Abidjan-Plateau",
    phones: ["+225 27 20 24 24 65"],
    email: "contact@sirius.ci",
    website: "https://www.sirius.ci/",
    officialDirectoryUrl: `${PAGE}?page=4`,
  }),
  profile({
    id: "societe-generale-capital-securities-west-africa",
    name: "SOCIETE GENERALE CAPITAL SECURITIES WEST AFRICA",
    shortName: "SG Capital Securities West Africa",
    address: "Boulevard Hassan II, Ivoire Trade Center, Cocody, Abidjan",
    phones: ["+225 27 20 20 12 65"],
    email: "filiale.sogebourse@socgen.com",
    website: null,
    officialDirectoryUrl: `${PAGE}?page=4`,
  }),
];

export interface SgiMatch {
  sgi: SgiProfile;
  score: number;
  reasons: string[];
  questionsToAsk: string[];
}

export function matchSgis(
  questionnaire: SgiQuestionnaire,
  profiles: readonly SgiProfile[] = COTE_DIVOIRE_SGIS
): SgiMatch[] {
  return profiles
    .map((sgi) => {
      let score = 0;
      const reasons: string[] = [];
      if (questionnaire.contactPreference === "digital") {
        if (sgi.website) {
          score += 3;
          reasons.push("Site web vérifié dans le répertoire BRVM.");
        }
        if (sgi.email) {
          score += 2;
          reasons.push("Adresse e-mail vérifiée.");
        }
      } else if (questionnaire.contactPreference === "phone" && sgi.phones.length) {
        score += 4;
        reasons.push(`${sgi.phones.length} numéro${sgi.phones.length > 1 ? "s" : ""} vérifié${sgi.phones.length > 1 ? "s" : ""}.`);
      } else if (questionnaire.contactPreference === "office" && sgi.address) {
        score += 4;
        reasons.push("Adresse physique détaillée vérifiée à Abidjan.");
      }
      if (sgi.website && sgi.email && sgi.phones.length) score += 1;

      const amountQuestion =
        questionnaire.amount === "under-500k"
          ? "Quel est le dépôt minimum et acceptez-vous un premier investissement inférieur à 500 000 FCFA ?"
          : questionnaire.amount === "500k-5m"
            ? "Quels frais totaux s'appliquent à un ordre entre 500 000 et 5 000 000 FCFA ?"
            : "Quels services et frais s'appliquent à un portefeuille supérieur à 5 000 000 FCFA ?";
      const priorityQuestion =
        questionnaire.priority === "fees"
          ? "Pouvez-vous transmettre votre grille complète : courtage, tenue de compte, minimum par ordre et fiscalité ?"
          : questionnaire.priority === "digital"
            ? "L'ouverture, les ordres et les relevés sont-ils disponibles à distance ?"
            : "Quel accompagnement fournissez-vous à un débutant et par quel canal ?";
      return {
        sgi,
        score,
        reasons: reasons.length ? reasons : ["Coordonnées physiques et téléphone vérifiés par la BRVM."],
        questionsToAsk: [
          amountQuestion,
          priorityQuestion,
          "Quel délai faut-il pour ouvrir le compte-titres et recevoir les accès ?",
        ],
      };
    })
    .sort((a, b) => b.score - a.score || a.sgi.name.localeCompare(b.sgi.name, "fr"));
}

export function getSgi(id: string): SgiProfile | undefined {
  return COTE_DIVOIRE_SGIS.find((sgi) => sgi.id === id);
}
