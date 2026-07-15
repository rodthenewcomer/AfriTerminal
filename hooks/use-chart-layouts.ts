"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { legacyStorageKey } from "@wariba/core/legacy";
import { migratedStorageKey } from "@/lib/storage-keys";

export type LayoutKind = 1 | 2 | 4;

export interface ChartLayout {
  id: string;
  name: string;
  kind: LayoutKind;
  /** Toujours 4 entrées ; seules les `kind` premières sont affichées — évite
   * de perdre le choix d'un panneau en repassant de 1 à 4 graphiques. */
  tickers: string[];
}

const DEFAULT_TICKERS = ["SNTS", "ORAC", "SGBC", "PALC"];
const LEGACY_KEY = legacyStorageKey("chart-layout");

function seedLayout(): ChartLayout {
  // Migre l'ancienne disposition unique (pré-dispositions multiples) plutôt
  // que de la perdre silencieusement au premier chargement de ce store.
  let kind: LayoutKind = 2;
  let tickers = DEFAULT_TICKERS;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { layout: LayoutKind; tickers: string[] };
        if ([1, 2, 4].includes(saved.layout)) kind = saved.layout;
        if (Array.isArray(saved.tickers) && saved.tickers.length === 4) tickers = saved.tickers;
        window.localStorage.removeItem(LEGACY_KEY);
      }
    } catch {
      // stockage corrompu : on repart des défauts
    }
  }
  return { id: "default", name: "Ma disposition", kind, tickers };
}

interface ChartLayoutsState {
  layouts: ChartLayout[];
  activeId: string;
  setActive: (id: string) => void;
  update: (id: string, patch: Partial<Pick<ChartLayout, "kind" | "tickers">>) => void;
  create: (name: string) => void;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
}

export const useChartLayouts = create<ChartLayoutsState>()(
  persist(
    (set) => ({
      layouts: [seedLayout()],
      activeId: "default",
      setActive: (id) => set({ activeId: id }),
      update: (id, patch) =>
        set((s) => ({
          layouts: s.layouts.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      create: (name) =>
        set((s) => {
          const active = s.layouts.find((l) => l.id === s.activeId);
          const id = `layout-${Date.now()}`;
          const layout: ChartLayout = {
            id,
            name,
            kind: active?.kind ?? 2,
            tickers: active?.tickers ?? DEFAULT_TICKERS,
          };
          return { layouts: [...s.layouts, layout], activeId: id };
        }),
      rename: (id, name) =>
        set((s) => ({ layouts: s.layouts.map((l) => (l.id === id ? { ...l, name } : l)) })),
      duplicate: (id) =>
        set((s) => {
          const source = s.layouts.find((l) => l.id === id);
          if (!source) return s;
          const newId = `layout-${Date.now()}`;
          const copy: ChartLayout = { ...source, id: newId, name: `${source.name} (copie)` };
          return { layouts: [...s.layouts, copy], activeId: newId };
        }),
      remove: (id) =>
        set((s) => {
          if (s.layouts.length <= 1) return s;
          const layouts = s.layouts.filter((l) => l.id !== id);
          return {
            layouts,
            activeId: s.activeId === id ? layouts[0].id : s.activeId,
          };
        }),
    }),
    { name: migratedStorageKey("wariba-chart-layouts", "chart-layouts"), skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && useChartLayouts.persist?.hasHydrated?.() === true;
}

export function useChartLayoutsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    let active = true;
    const unsub = useChartLayouts.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    hydrationPromise ??= Promise.resolve(useChartLayouts.persist?.rehydrate?.()).then(
      () => undefined
    );
    hydrationPromise.finally(() => {
      if (active) setHydrated(hasHydrated());
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
