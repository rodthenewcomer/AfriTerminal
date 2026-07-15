import type { Derived, Scores, Signal, Stock } from "@wariba/core/types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function computeScores(stock: Stock, d: Derived): Scores {
  const f = stock.fundamentals;

  let quality = 30 + f.roe * 1.6 + d.revenueGrowth * 0.8;
  if (f.payout >= 30 && f.payout <= 75) quality += 8;
  if (f.cir !== undefined && f.cirPrev !== undefined && f.cir < f.cirPrev) quality += 8;
  if (f.ordinaryIncome < 0) quality -= 25;
  if (f.netIncome < 0) quality -= 30;

  let valuation = 50;
  if (d.per > 0) valuation += (13 - d.per) * 3.5;
  valuation += (1.8 - f.pb) * 10;
  if (d.per > 0 && f.roe > 20 && d.per < 13) valuation += 10;
  if (f.pb > 3 && f.roe < 15) valuation -= 20;

  let momentum = 50 + d.yearChange * 0.45 + d.monthChange * 1.2;
  if (d.volumeRatio >= 2) momentum += 8;

  let risk = 20;
  if (f.ordinaryIncome < 0 && f.netIncome > 0) risk += 30;
  if (f.payout > 90) risk += 18;
  if ((f.costOfRiskChange ?? 0) > 30) risk += 18;
  if (d.revenueGrowth < 0) risk += 12;
  if (d.yearChange > 60) risk += 10;
  if (f.netIncome < 0) risk += 25;
  risk += Math.max(0, (stock.profile.vol - 0.012) * 900);

  return {
    quality: clamp(quality),
    valuation: clamp(valuation),
    momentum: clamp(momentum),
    risk: clamp(risk),
  };
}

export function detectSignals(stock: Stock, d: Derived): Signal[] {
  const f = stock.fundamentals;
  const out: Signal[] = [];

  if (f.netIncome > 0 && f.ordinaryIncome < 0) {
    out.push({
      id: "benefice-non-durable",
      label: "Bénéfice non durable",
      tone: "negative",
      detail:
        "Résultat net positif mais résultat des activités ordinaires négatif : le bénéfice provient d'éléments exceptionnels (HAO).",
    });
  }
  if (d.yieldNet > 6 && f.payout > 0 && f.payout < 70) {
    out.push({
      id: "dividende-solide",
      label: "Dividende solide",
      tone: "positive",
      detail: `Rendement net de ${d.yieldNet.toFixed(1)} % avec un payout maîtrisé (${f.payout} %).`,
    });
  }
  if (f.roe > 20 && d.per > 0 && d.per < 13) {
    out.push({
      id: "qualite-rentable",
      label: "Qualité rentable",
      tone: "positive",
      detail: `ROE de ${f.roe.toFixed(1)} % pour un PER de ${d.per.toFixed(1)} : rentabilité élevée à prix raisonnable.`,
    });
  }
  if (f.pb > 3 && f.roe < 15) {
    out.push({
      id: "valorisation-tendue",
      label: "Valorisation tendue",
      tone: "warning",
      detail: `P/B de ${f.pb.toFixed(1)} pour un ROE de ${f.roe.toFixed(1)} % : le prix intègre beaucoup d'optimisme.`,
    });
  }
  if (d.volumeRatio >= 3) {
    out.push({
      id: "volume-anormal",
      label: "Volume anormal",
      tone: "warning",
      detail: `Volume du jour à ${d.volumeRatio.toFixed(1)}× la moyenne 30 jours : mouvement inhabituel à surveiller.`,
    });
  }
  if ((f.loanGrowth ?? 0) > 20 && (f.costOfRiskChange ?? 0) > 30) {
    out.push({
      id: "risque-credit",
      label: "Risque crédit à surveiller",
      tone: "warning",
      detail: `Encours de crédits +${f.loanGrowth} % avec un coût du risque +${f.costOfRiskChange} % : la croissance se paie.`,
    });
  }
  if (d.revenueGrowth > 15 && d.netIncomeGrowth > 20 && f.ordinaryIncome > 0) {
    out.push({
      id: "croissance-confirmee",
      label: "Croissance confirmée",
      tone: "positive",
      detail: `${f.revenueLabel} +${d.revenueGrowth.toFixed(0)} % et résultat net +${d.netIncomeGrowth.toFixed(0)} % : la dynamique est réelle.`,
    });
  }
  if (f.payout > 90) {
    out.push({
      id: "payout-eleve",
      label: "Payout > 90 %",
      tone: "warning",
      detail: `${f.payout} % du bénéfice est distribué : peu de marge si les résultats reculent.`,
    });
  }
  if (f.netIncomePrev < 0 && f.netIncome > 0) {
    out.push({
      id: "turnaround",
      label: "Turnaround",
      tone: "neutral",
      detail: "Retour aux bénéfices après une perte : redressement à confirmer sur plusieurs exercices.",
    });
  }
  if (d.per > 0 && f.pb < 1 && f.roe > 12) {
    out.push({
      id: "sous-evaluee",
      label: "Sous-évaluée",
      tone: "positive",
      detail: `P/B de ${f.pb.toFixed(1)} avec un ROE de ${f.roe.toFixed(1)} % : décote notable sur les fonds propres.`,
    });
  }
  if (d.yearChange > 60) {
    out.push({
      id: "risque-fomo",
      label: "Risque de FOMO",
      tone: "warning",
      detail: `+${d.yearChange.toFixed(0)} % sur un an : attention à ne pas acheter uniquement le momentum.`,
    });
  }
  if (d.revenueGrowth < 0) {
    out.push({
      id: "activite-en-recul",
      label: "Activité en recul",
      tone: "negative",
      detail: `${f.revenueLabel} en baisse de ${Math.abs(d.revenueGrowth).toFixed(1)} % : surveiller la tendance commerciale.`,
    });
  }
  if (
    f.cir !== undefined &&
    f.cirPrev !== undefined &&
    f.cir < f.cirPrev &&
    d.revenueGrowth > 8
  ) {
    out.push({
      id: "levier-bancaire",
      label: "Levier opérationnel positif",
      tone: "positive",
      detail: `PNB en hausse et coefficient d'exploitation en baisse (${f.cirPrev} % → ${f.cir} %) : signal de qualité pour une banque.`,
    });
  }
  return out;
}
