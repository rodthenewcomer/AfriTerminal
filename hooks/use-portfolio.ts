"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PortfolioTransaction } from "@wariba/core/portfolio";

interface PortfolioState {
  transactions: PortfolioTransaction[];
  add: (tx: Omit<PortfolioTransaction, "id">) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Restauration de sauvegarde : remplace tout l'état. */
  replaceAll: (transactions: PortfolioTransaction[]) => void;
}

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set) => ({
      transactions: [],
      add: (tx) =>
        set((state) => ({
          transactions: [
            ...state.transactions,
            { ...tx, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
          ],
        })),
      remove: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
      clear: () => set({ transactions: [] }),
      replaceAll: (transactions) => set({ transactions }),
    }),
    { name: "afriterminal-portfolio", skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && usePortfolio.persist?.hasHydrated?.() === true;
}

function rehydratePortfolio(): Promise<void> {
  hydrationPromise ??= Promise.resolve(usePortfolio.persist?.rehydrate?.()).then(() => undefined);
  return hydrationPromise;
}

export function usePortfolioHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);

  useEffect(() => {
    let active = true;
    const unsub = usePortfolio.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    rehydratePortfolio().finally(() => {
      if (active) setHydrated(hasHydrated());
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return hydrated;
}
