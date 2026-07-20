"use client";

import { create } from "zustand";
import type { PortfolioTransaction } from "@wariba/core/portfolio";

interface PortfolioState {
  transactions: PortfolioTransaction[];
  add: (tx: Omit<PortfolioTransaction, "id">) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Restauration de sauvegarde : remplace tout l'état. */
  replaceAll: (transactions: PortfolioTransaction[]) => void;
}

export const usePortfolio = create<PortfolioState>()((set) => ({
  transactions: [],
  add: (tx) =>
    set((state) => ({
      transactions: [...state.transactions, { ...tx, id: `tx-${crypto.randomUUID()}` }],
    })),
  remove: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((transaction) => transaction.id !== id),
    })),
  clear: () => set({ transactions: [] }),
  replaceAll: (transactions) => set({ transactions }),
}));

export function usePortfolioHydrated(): boolean {
  return true;
}
