/** Même nomenclature BOC → libellés que lib/real-universe.ts côté web. */
const SECTOR_LABELS: Record<string, string> = {
  FIN: "Banque",
  TEL: "Télécom",
  CB: "Agro-industrie",
  CD: "Distribution",
  ENE: "Distribution",
  IND: "Industrie",
  SPU: "Services publics",
};

export function sectorLabel(code: string | null): string {
  return (code !== null && SECTOR_LABELS[code]) || "Autre";
}

/** Ordre fixe des secteurs (même lecture stable que la market map web). */
export const SECTOR_ORDER = [
  "Banque", "Télécom", "Agro-industrie", "Industrie",
  "Distribution", "Services publics", "Autre",
] as const;
