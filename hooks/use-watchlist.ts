"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WatchlistDef } from "@wariba/core/types";

const SEED_LISTS: WatchlistDef[] = [
  { id: "default", name: "Ma watchlist", tickers: ["SNTS", "NSBC", "PALC"] },
  { id: "banques", name: "BRVM banques", tickers: ["NSBC", "SGBC", "SIBC", "CBIBF", "ETIT"] },
  { id: "dividendes", name: "Dividendes", tickers: ["SNTS", "BOAB", "TTLC", "ORAC"] },
  { id: "speculatif", name: "Spéculatif", tickers: ["UNXC", "SPHC"] },
];

interface WatchlistState {
  lists: WatchlistDef[];
  activeId: string;
  setActive: (id: string) => void;
  toggle: (ticker: string, listId?: string) => void;
  createList: (name: string) => void;
  removeList: (id: string) => void;
  isWatched: (ticker: string) => boolean;
  /** Restauration de sauvegarde : remplace tout l'état. */
  replaceAll: (lists: WatchlistDef[], activeId: string) => void;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      lists: SEED_LISTS,
      activeId: "default",
      setActive: (id) => set({ activeId: id }),
      toggle: (ticker, listId) =>
        set((state) => {
          const target = listId ?? state.activeId;
          return {
            lists: state.lists.map((l) =>
              l.id !== target
                ? l
                : {
                    ...l,
                    tickers: l.tickers.includes(ticker)
                      ? l.tickers.filter((t) => t !== ticker)
                      : [...l.tickers, ticker],
                  }
            ),
          };
        }),
      createList: (name) =>
        set((state) => {
          const id = `list-${Date.now()}`;
          return {
            lists: [...state.lists, { id, name, tickers: [] }],
            activeId: id,
          };
        }),
      removeList: (id) =>
        set((state) => {
          const lists = state.lists.filter((l) => l.id !== id);
          return {
            lists,
            activeId:
              state.activeId === id ? (lists[0]?.id ?? "default") : state.activeId,
          };
        }),
      isWatched: (ticker) =>
        get().lists.some((l) => l.tickers.includes(ticker)),
      replaceAll: (lists, activeId) =>
        set({ lists, activeId: lists.some((l) => l.id === activeId) ? activeId : (lists[0]?.id ?? "default") }),
    }),
    { name: "afriterminal-watchlists", skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && useWatchlist.persist?.hasHydrated?.() === true;
}

function rehydrateWatchlist(): Promise<void> {
  hydrationPromise ??= Promise.resolve(useWatchlist.persist?.rehydrate?.()).then(() => undefined);
  return hydrationPromise;
}

export function useWatchlistHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    let active = true;
    const unsub = useWatchlist.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    rehydrateWatchlist().finally(() => {
      if (active) setHydrated(hasHydrated());
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
