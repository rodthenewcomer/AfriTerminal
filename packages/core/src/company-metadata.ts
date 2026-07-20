const SUBSECTORS: Record<string, string> = {
  Banque: "Services bancaires",
  "Services financiers": "Services financiers",
  Télécom: "Télécommunications intégrées",
  "Agro-industrie": "Agriculture et transformation",
  Industrie: "Manufacture et matériaux",
  Distribution: "Commerce et distribution",
  "Services publics": "Services essentiels",
  Transport: "Transport et logistique",
  Immobilier: "Immobilier",
};

export function waribaSubsector(sector: string): string {
  return SUBSECTORS[sector] ?? "Activité diversifiée";
}
