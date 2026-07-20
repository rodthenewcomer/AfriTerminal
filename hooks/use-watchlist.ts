"use client";

import { create } from "zustand";
import type { WatchlistDef } from "@wariba/core/types";

const EMPTY_LIST: WatchlistDef = { id: "default", name: "Ma watchlist", tickers: [] };

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

export const useWatchlist = create<WatchlistState>()((set, get) => ({
  lists: [EMPTY_LIST],
  activeId: "default",
  setActive: (id) => set({ activeId: id }),
  toggle: (ticker, listId) =>
    set((state) => {
      const target = listId ?? state.activeId;
      return {
        lists: state.lists.map((list) =>
          list.id !== target
            ? list
            : {
                ...list,
                tickers: list.tickers.includes(ticker)
                  ? list.tickers.filter((item) => item !== ticker)
                  : [...list.tickers, ticker],
              }
        ),
      };
    }),
  createList: (name) =>
    set((state) => {
      const id = `list-${crypto.randomUUID()}`;
      return { lists: [...state.lists, { id, name, tickers: [] }], activeId: id };
    }),
  removeList: (id) =>
    set((state) => {
      const remaining = state.lists.filter((list) => list.id !== id);
      const lists = remaining.length ? remaining : [EMPTY_LIST];
      return {
        lists,
        activeId: state.activeId === id ? lists[0].id : state.activeId,
      };
    }),
  isWatched: (ticker) => get().lists.some((list) => list.tickers.includes(ticker)),
  replaceAll: (incoming, activeId) => {
    const lists = incoming.length ? incoming : [EMPTY_LIST];
    set({
      lists,
      activeId: lists.some((list) => list.id === activeId) ? activeId : lists[0].id,
    });
  },
}));

export function useWatchlistHydrated(): boolean {
  return true;
}
