"use client";

import { create } from "zustand";

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

/** Filtres nommés chargés depuis le compte, jamais conservés dans le navigateur. */
export const useSavedFilters = create<SavedFiltersState>()((set) => ({
  saved: [],
  save: (name, filters) =>
    set((state) => ({
      saved: [...state.saved, { id: crypto.randomUUID(), name, filters: { ...filters } }],
    })),
  remove: (id) =>
    set((state) => ({ saved: state.saved.filter((filter) => filter.id !== id) })),
  replaceAll: (saved) => set({ saved }),
}));

export function useSavedFiltersHydrated(): boolean {
  return true;
}
