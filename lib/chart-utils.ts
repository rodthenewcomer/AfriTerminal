import type { OHLCV } from "@wariba/core/types";
import { DIVIDEND_MAP } from "./mock/dividends";
import { dividendHistoryFor } from "./real-dividends";

// Couleurs de SÉRIES (canvas lightweight-charts : littéraux requis, pas
// de variables CSS). L'accent de marque est l'or/ambre ; les moyennes
// mobiles gardent une palette variée (personnalisable par l'utilisateur).
export const CHART_COLORS = {
  up: "#22c55e",
  down: "#ef4444",
  accent: "#e2a63d",
  violet: "#8b5cf6",
  gold: "#d2a13c",
  warn: "#fb923c",
  sma20: "#38bdf8",
  sma50: "#8b5cf6",
  sma100: "#fb923c",
  sma200: "#94a3b8",
  ema20: "#ec4899",
} as const;

export const COMPARE_COLORS = ["#8b5cf6", "#d4af37", "#ec4899", "#f59e0b"];

/**
 * Palette catégorielle FIXE (identité) pour les répartitions — ordre
 * stable, jamais recyclée : au-delà de 7 catégories on replie dans
 * « Autres ». L'identité n'est jamais portée par la couleur seule
 * (légende étiquetée systématique à côté).
 */
export const CATEGORICAL_COLORS = [
  "#e2a63d", // ambre (marque)
  "#8b5cf6", // violet
  "#38bdf8", // ciel
  "#ec4899", // rose
  "#22c55e", // vert
  "#fb923c", // orange
  "#94a3b8", // ardoise
] as const;

/**
 * Ajustement dividendes (back-adjustment) : pour chaque détachement,
 * les barres antérieures sont multipliées par (1 - dividende / cours au détachement).
 */
export function adjustForDividends(ticker: string, data: OHLCV[]): OHLCV[] {
  const info = DIVIDEND_MAP.get(ticker);
  if (!info || info.history.length === 0 || data.length === 0) return data;
  if (typeof data[0].time !== "string") return data;

  const monthDay = info.exDate ? info.exDate.slice(4) : "-07-01";
  const events = info.history
    .map((h) => ({ date: `${h.year}${monthDay}`, amount: h.gross }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const out = data.map((d) => ({ ...d }));
  for (const ev of events) {
    const idx = out.findIndex(
      (d) => typeof d.time === "string" && d.time >= ev.date
    );
    if (idx <= 0) continue;
    const ref = out[idx].close;
    const factor = Math.max(0.5, 1 - ev.amount / ref);
    for (let i = 0; i < idx; i++) {
      out[i].open *= factor;
      out[i].high *= factor;
      out[i].low *= factor;
      out[i].close *= factor;
    }
  }
  return out;
}

/**
 * Ajustement dividendes sur l'HISTORIQUE RÉEL (data/real/dividends.json,
 * dividendes NETS après IRVM — la BRVM ne publie pas le brut au
 * bulletin ; l'ajustement est donc légèrement conservateur). Même
 * back-adjustment que la version mock : les barres antérieures à chaque
 * versement sont multipliées par (1 − dividende / cours au versement).
 * La date utilisée est la date de PAIEMENT publiée (le détachement n'est
 * pas publié) — approximation assumée, cohérente avec le portefeuille.
 */
export function adjustForRealDividends(ticker: string, data: OHLCV[]): OHLCV[] {
  const events = dividendHistoryFor(ticker);
  if (events.length === 0 || data.length === 0) return data;
  if (typeof data[0].time !== "string") return data;

  const out = data.map((d) => ({ ...d }));
  for (const ev of events) {
    const idx = out.findIndex(
      (d) => typeof d.time === "string" && d.time >= ev.date
    );
    if (idx <= 0) continue;
    const ref = out[idx].close;
    if (ref <= 0) continue;
    const factor = Math.max(0.5, 1 - ev.net / ref);
    for (let i = 0; i < idx; i++) {
      out[i].open *= factor;
      out[i].high *= factor;
      out[i].low *= factor;
      out[i].close *= factor;
    }
  }
  return out;
}
