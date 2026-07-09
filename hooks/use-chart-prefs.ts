"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHART_COLORS } from "@/lib/chart-utils";

/** Moyennes mobiles dont la couleur est personnalisable. */
export type MaId = "sma20" | "sma50" | "sma100" | "sma200" | "ema20";

export const DEFAULT_MA_COLORS: Record<MaId, string> = {
  sma20: CHART_COLORS.sma20,
  sma50: CHART_COLORS.sma50,
  sma100: CHART_COLORS.sma100,
  sma200: CHART_COLORS.sma200,
  ema20: CHART_COLORS.ema20,
};

interface ChartPrefsState {
  maColors: Record<MaId, string>;
  setMaColor: (id: MaId, color: string) => void;
  resetMaColors: () => void;
}

export const useChartPrefs = create<ChartPrefsState>()(
  persist(
    (set) => ({
      maColors: DEFAULT_MA_COLORS,
      setMaColor: (id, color) =>
        set((state) => ({ maColors: { ...state.maColors, [id]: color } })),
      resetMaColors: () => set({ maColors: DEFAULT_MA_COLORS }),
    }),
    { name: "afriterminal-chart-prefs", skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && useChartPrefs.persist?.hasHydrated?.() === true;
}

function rehydrateChartPrefs(): Promise<void> {
  hydrationPromise ??= Promise.resolve(useChartPrefs.persist?.rehydrate?.()).then(() => undefined);
  return hydrationPromise;
}

export function useChartPrefsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    let active = true;
    const unsub = useChartPrefs.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    rehydrateChartPrefs().finally(() => {
      if (active) setHydrated(hasHydrated());
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
