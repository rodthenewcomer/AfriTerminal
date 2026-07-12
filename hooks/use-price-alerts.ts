"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PriceAlert {
  id: string;
  ticker: string;
  direction: "above" | "below";
  /** Seuil en FCFA */
  threshold: number;
  createdAt: string;
}

/** Une alerte est déclenchée quand le dernier cours officiel franchit le
 * seuil. Évaluée à l'ouverture de l'app (site statique : pas de push —
 * dit explicitement dans l'UI). */
export function isTriggered(alert: PriceAlert, lastClose: number): boolean {
  return alert.direction === "above"
    ? lastClose >= alert.threshold
    : lastClose <= alert.threshold;
}

interface PriceAlertsState {
  alerts: PriceAlert[];
  add: (a: Omit<PriceAlert, "id" | "createdAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const usePriceAlerts = create<PriceAlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      add: (a) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...a,
              id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ],
        })),
      remove: (id) =>
        set((state) => ({ alerts: state.alerts.filter((x) => x.id !== id) })),
      clear: () => set({ alerts: [] }),
    }),
    { name: "afriterminal-price-alerts", skipHydration: true }
  )
);

let hydrationPromise: Promise<void> | null = null;

function hasHydrated(): boolean {
  return typeof window !== "undefined" && usePriceAlerts.persist?.hasHydrated?.() === true;
}

export function usePriceAlertsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(hasHydrated);
  useEffect(() => {
    let active = true;
    const unsub = usePriceAlerts.persist?.onFinishHydration?.(() => {
      if (active) setHydrated(true);
    });
    hydrationPromise ??= Promise.resolve(usePriceAlerts.persist?.rehydrate?.()).then(
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
