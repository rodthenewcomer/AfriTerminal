import type { AlertItem } from "./types";

export function explainAlert(alert: AlertItem): {
  importance: "Urgente" | "Importante" | "À connaître";
  reason: string;
  possibleConsequence: string;
} {
  const importance =
    alert.severity === "critical"
      ? "Urgente"
      : alert.severity === "warning"
        ? "Importante"
        : "À connaître";
  const reasonByType: Record<AlertItem["type"], string> = {
    prix: "Le cours a franchi un niveau inhabituel ou un extrême observé.",
    volume: "Le volume s'écarte nettement de sa moyenne récente.",
    dividende: "Un paiement ou une décision de dividende concerne cette action.",
    document: "Une nouvelle publication officielle est disponible.",
    fondamental: "Un chiffre publié change la lecture de l'activité ou du résultat.",
    ia: "Une règle factuelle a détecté plusieurs éléments à examiner ensemble.",
  };
  const consequenceByType: Record<AlertItem["type"], string> = {
    prix: "Le risque ou l'intérêt du marché peut avoir changé ; vérifiez la cause et la liquidité avant toute décision.",
    volume: "Un mouvement de prix peut devenir plus volatile ; le volume seul n'indique ni achat ni vente.",
    dividende: "Le rendement attendu ou le calendrier de revenu peut évoluer.",
    document: "La valorisation et les risques doivent être relus avec les nouveaux chiffres du document.",
    fondamental: "La rentabilité, la solidité ou la valorisation peuvent être réévaluées.",
    ia: "Cette combinaison mérite une lecture du document source ; elle ne constitue pas une recommandation.",
  };
  return {
    importance,
    reason: reasonByType[alert.type],
    possibleConsequence: consequenceByType[alert.type],
  };
}

/** Place les publications critiques récentes avant les faits de séance,
 * puis conserve un ordre antéchronologique stable et des identifiants uniques. */
export function prioritizeCriticalAlerts(
  alerts: readonly AlertItem[],
  criticalWindowDays = 7
): AlertItem[] {
  if (!alerts.length) return [];
  const sorted = [...alerts].sort((a, b) => b.time.localeCompare(a.time));
  const latestMs = Math.max(...sorted.map((alert) => Date.parse(alert.time)));
  const windowMs = criticalWindowDays * 24 * 60 * 60 * 1000;
  const critical = sorted.filter((alert) => {
    const age = latestMs - Date.parse(alert.time);
    return alert.severity === "critical" && age >= 0 && age <= windowMs;
  });
  const seen = new Set<string>();
  return [...critical, ...sorted].filter((alert) => {
    if (seen.has(alert.id)) return false;
    seen.add(alert.id);
    return true;
  });
}
