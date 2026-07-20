import { describe, expect, it } from "vitest";
import { COTE_DIVOIRE_SGIS, matchSgis } from "./sgi";

describe("sgi", () => {
  it("référence les 17 SGI uniques de Côte d'Ivoire", () => {
    expect(COTE_DIVOIRE_SGIS).toHaveLength(17);
    expect(new Set(COTE_DIVOIRE_SGIS.map((sgi) => sgi.id)).size).toBe(17);
    expect(COTE_DIVOIRE_SGIS.every((sgi) => sgi.officialDirectoryUrl.includes("brvm.org"))).toBe(true);
  });

  it("classe seulement sur les canaux vérifiés et pose les questions inconnues", () => {
    const matches = matchSgis({
      contactPreference: "digital",
      experience: "beginner",
      priority: "fees",
      amount: "under-500k",
    });
    expect(matches[0].reasons.join(" ")).toMatch(/Site web|e-mail/);
    expect(matches[0].questionsToAsk.join(" ")).toContain("dépôt minimum");
    expect(matches[0].questionsToAsk.join(" ")).toContain("grille complète");
  });
});
