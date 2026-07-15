import type { AlertItem } from "./types";

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
