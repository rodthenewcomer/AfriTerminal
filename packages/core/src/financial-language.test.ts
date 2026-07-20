import { describe, expect, it } from "vitest";
import {
  annualMetricDisclosure,
  explainEarningsQuality,
  explainOfficialPer,
  explainOperatingCashFlow,
  metricDisclosureLabel,
} from "./financial-language";
import { metricEvidenceLabel } from "./financial-language";

describe("financial-language", () => {
  it("identifie un bénéfice porté par un élément exceptionnel", () => {
    expect(explainEarningsQuality({ netIncome: 8_200, ordinaryIncome: -330 })).toMatchObject({
      classification: "exceptional-non-recurring",
      label: "Élément exceptionnel non récurrent",
    });
  });

  it("n'affirme jamais une génération de trésorerie négative ou inconnue", () => {
    expect(explainOperatingCashFlow(-10).classification).toBe("negative");
    expect(explainOperatingCashFlow(-10).detail).toContain("n'est pas classée");
    expect(explainOperatingCashFlow(null).classification).toBe("unknown");
  });

  it("explique un PER officiel incompatible avec une perte annuelle", () => {
    const explanation = explainOfficialPer({
      officialPer: 34.6,
      fiscalYear: 2025,
      latestAnnualNetIncome: -624,
    });
    expect(explanation).toContain("autre base bénéficiaire");
    expect(explanation).toContain("négatif");
  });

  it("produit la période, la source, la date et la confiance", () => {
    const label = metricDisclosureLabel(annualMetricDisclosure({
      fiscalYear: 2025,
      publishedOn: "2026-07-13",
      sourceUrl: "https://www.brvm.org/",
    }));
    expect(label).toContain("Vérifié");
    expect(label).toContain("Annuel");
    expect(label).toContain("source");
    expect(label).toContain("confiance élevée");
  });

  it("expose le statut de preuve", () => {
    expect(metricEvidenceLabel("calculated")).toBe("Calculé");
    expect(metricEvidenceLabel("estimated")).toBe("Estimé");
    expect(metricEvidenceLabel("unavailable")).toBe("N/D");
  });
});
