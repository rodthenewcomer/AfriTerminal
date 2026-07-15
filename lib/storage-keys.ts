"use client";

import { legacyStorageKey } from "@wariba/core/legacy";

/** Copie une valeur locale existante vers son namespace WARIBA, puis retire
 * l'ancienne clé. L'opération est idempotente et sans effet pendant le SSR. */
export function migratedStorageKey(
  current: string,
  legacySuffix: string,
  separator: "-" | ":" | "." = "-"
): string {
  if (typeof window === "undefined") return current;
  const previous = legacyStorageKey(legacySuffix, separator);
  try {
    if (window.localStorage.getItem(current) === null) {
      const value = window.localStorage.getItem(previous);
      if (value !== null) window.localStorage.setItem(current, value);
    }
    window.localStorage.removeItem(previous);
  } catch {
    // localStorage peut être bloqué ; Zustand gérera son repli habituel.
  }
  return current;
}
