"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migratedStorageKey } from "@/lib/storage-keys";

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
}

interface SavedFiltersState {
  saved: SavedFilter[];
  save: (name: string, filters: Record<string, string>) => void;
  remove: (id: string) => void;
  /** Restauration de sauvegarde : remplace tout l'état. */
  replaceAll: (saved: SavedFilter[]) => void;
}

/** Filtres de screener nommés, persistés en localStorage. */
export const useSavedFilters = create<SavedFiltersState>()(
  persist(
    (set) => ({
      saved: [],
      save: (name, filters) =>
        set((state) => ({
          saved: [
            ...state.saved,
            { id: `${Date.now()}`, name, filters: { ...filters } },
          ],
        })),
      remove: (id) =>
        set((state) => ({ saved: state.saved.filter((f) => f.id !== id) })),
      replaceAll: (saved) => set({ saved }),
    }),
    { name: migratedStorageKey("wariba-screener-filters", "screener-filters"), skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && useSavedFilters.persist?.hasHydrated?.() === true;
}

function rehydrateSavedFilters(): Promise<void> {
  hydrationPromise ??= Promise.resolve(useSavedFilters.persist?.rehydrate?.()).then(() => undefined);
  return hydrationPromise;
}

export function useSavedFiltersHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    let active = true;
    const unsub = useSavedFilters.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    rehydrateSavedFilters().finally(() => {
      if (active) setHydrated(hasHydrated());
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
