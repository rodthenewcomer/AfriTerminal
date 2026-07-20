"use client";

import { create } from "zustand";
import type { AlertType } from "@wariba/core/types";

export type AlertScope = "personal" | "watchlist" | "portfolio" | "market";

interface AlertPreferencesState {
  scope: AlertScope;
  importantOnly: boolean;
  hiddenTypes: AlertType[];
  setScope: (scope: AlertScope) => void;
  setImportantOnly: (value: boolean) => void;
  hideType: (type: AlertType) => void;
  showAllTypes: () => void;
  replaceAll: (value: {
    scope?: AlertScope;
    importantOnly?: boolean;
    hiddenTypes?: AlertType[];
  }) => void;
}

const DEFAULTS = {
  scope: "personal" as const,
  importantOnly: false,
  hiddenTypes: [] as AlertType[],
};

export const useAlertPreferences = create<AlertPreferencesState>()((set) => ({
  ...DEFAULTS,
  setScope: (scope) => set({ scope }),
  setImportantOnly: (importantOnly) => set({ importantOnly }),
  hideType: (type) =>
    set((state) => ({
      hiddenTypes: state.hiddenTypes.includes(type)
        ? state.hiddenTypes
        : [...state.hiddenTypes, type],
    })),
  showAllTypes: () => set({ hiddenTypes: [] }),
  replaceAll: (value) =>
    set({
      scope: value.scope ?? DEFAULTS.scope,
      importantOnly: value.importantOnly ?? DEFAULTS.importantOnly,
      hiddenTypes: value.hiddenTypes ?? DEFAULTS.hiddenTypes,
    }),
}));
