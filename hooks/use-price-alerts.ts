"use client";

import { create } from "zustand";

export interface PriceAlert {
  id: string;
  ticker: string;
  direction: "above" | "below";
  /** Seuil en FCFA */
  threshold: number;
  createdAt: string;
  enabled: boolean;
  triggeredAt?: string;
  channels?: ("in_app" | "push" | "email")[];
}

/** Une alerte est déclenchée quand le dernier cours officiel franchit le seuil. */
export function isTriggered(alert: PriceAlert, lastClose: number): boolean {
  if (!alert.enabled) return false;
  return alert.direction === "above"
    ? lastClose >= alert.threshold
    : lastClose <= alert.threshold;
}

interface PriceAlertsState {
  alerts: PriceAlert[];
  add: (a: Omit<PriceAlert, "id" | "createdAt" | "enabled"> & { enabled?: boolean }) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const usePriceAlerts = create<PriceAlertsState>()((set) => ({
  alerts: [],
  add: (alert) => {
    const id = `pa-${crypto.randomUUID()}`;
    set((state) => ({
      alerts: [
        ...state.alerts,
        {
          ...alert,
          enabled: alert.enabled ?? true,
          id,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ],
    }));
    return id;
  },
  remove: (id) =>
    set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
  clear: () => set({ alerts: [] }),
}));

export function usePriceAlertsHydrated(): boolean {
  return true;
}
