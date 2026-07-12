"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChartLevelsState {
  /** Niveaux horizontaux (supports/résistances) posés par l'utilisateur,
   * en FCFA, par ticker. */
  levels: Record<string, number[]>;
  add: (ticker: string, price: number) => void;
  remove: (ticker: string, price: number) => void;
  clear: (ticker: string) => void;
  clearAll: () => void;
}

export const useChartLevels = create<ChartLevelsState>()(
  persist(
    (set) => ({
      levels: {},
      add: (ticker, price) =>
        set((s) => ({
          levels: {
            ...s.levels,
            [ticker]: [...(s.levels[ticker] ?? []), price].sort((a, b) => b - a),
          },
        })),
      remove: (ticker, price) =>
        set((s) => ({
          levels: {
            ...s.levels,
            [ticker]: (s.levels[ticker] ?? []).filter((p) => p !== price),
          },
        })),
      clear: (ticker) =>
        set((s) => ({ levels: { ...s.levels, [ticker]: [] } })),
      clearAll: () => set({ levels: {} }),
    }),
    { name: "afriterminal-chart-levels", skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && useChartLevels.persist?.hasHydrated?.() === true;
}

/** À l'initialisation côté client uniquement (pattern des autres stores). */
export function rehydrateChartLevels(): Promise<void> {
  hydrationPromise ??= Promise.resolve(useChartLevels.persist?.rehydrate?.()).then(() => undefined);
  return hydrationPromise;
}

export function useChartLevelsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    let active = true;
    const unsub = useChartLevels.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    rehydrateChartLevels().finally(() => {
      if (active) setHydrated(hasHydrated());
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
