import alertsJson from "@/data/real/alerts.json";
import type { AlertItem } from "@wariba/core/types";
import { prioritizeCriticalAlerts } from "@wariba/core/alerts";

/**
 * Alertes réelles générées par scripts/boc/build_alerts.py à partir des
 * bulletins officiels (variations fortes, extrêmes 52 semaines, volumes
 * inhabituels, dividendes payés, états financiers publiés). Factuel,
 * jamais prescriptif — régénérées à chaque bulletin par la CI.
 */
export const REAL_ALERTS = alertsJson as AlertItem[];

/** Alertes décisionnelles récentes, puis faits de la dernière séance. */
export function latestSessionAlerts(limit = 3): AlertItem[] {
  return prioritizeCriticalAlerts(REAL_ALERTS).slice(0, limit);
}

export function alertsForTicker(ticker: string, limit = 5): AlertItem[] {
  return REAL_ALERTS.filter((a) => a.ticker === ticker).slice(0, limit);
}
