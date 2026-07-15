import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChartType, IndicatorId } from "@wariba/core/types";
import type { PortfolioTransaction } from "@wariba/core/portfolio";
import { legacyStorageKey } from "@wariba/core/legacy";

const migratedAsyncStorage = {
  async getItem(name: string) {
    const current = await AsyncStorage.getItem(name);
    if (current !== null || !name.startsWith("wariba-")) return current;
    const previous = legacyStorageKey(name.slice("wariba-".length));
    const value = await AsyncStorage.getItem(previous);
    if (value !== null) {
      await AsyncStorage.setItem(name, value);
      await AsyncStorage.removeItem(previous);
    }
    return value;
  },
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};
const storage = createJSONStorage(() => migratedAsyncStorage);

interface WatchlistState {
  tickers: string[];
  toggle: (ticker: string) => void;
  replaceAll: (tickers: string[]) => void;
  hasHydrated: boolean;
  setHydrated: (value: boolean) => void;
}
export const useWatchlistStore = create<WatchlistState>()(persist(
  (set, get) => ({
    tickers: ["SNTS", "ORAC", "SGBC"],
    toggle: (ticker) => set({ tickers: get().tickers.includes(ticker)
      ? get().tickers.filter((item) => item !== ticker)
      : [...get().tickers, ticker] }),
    replaceAll: (tickers) => set({ tickers: [...tickers] }),
    hasHydrated: false,
    setHydrated: (hasHydrated) => set({ hasHydrated }),
  }),
  { name: "wariba-watchlist", storage, skipHydration: true, onRehydrateStorage: () => (state) => state?.setHydrated(true) }
));

interface PortfolioState {
  transactions: PortfolioTransaction[];
  add: (transaction: PortfolioTransaction) => void;
  remove: (id: string) => void;
  clear: () => void;
  replaceAll: (transactions: PortfolioTransaction[]) => void;
  hasHydrated: boolean;
  setHydrated: (value: boolean) => void;
}
export const usePortfolioStore = create<PortfolioState>()(persist(
  (set, get) => ({
    transactions: [],
    add: (transaction) => set({ transactions: [...get().transactions, transaction] }),
    remove: (id) => set({ transactions: get().transactions.filter((item) => item.id !== id) }),
    clear: () => set({ transactions: [] }),
    replaceAll: (transactions) => set({ transactions: [...transactions] }),
    hasHydrated: false,
    setHydrated: (hasHydrated) => set({ hasHydrated }),
  }),
  { name: "wariba-portfolio", storage, skipHydration: true, onRehydrateStorage: () => (state) => state?.setHydrated(true) }
));

export interface PriceAlertRule {
  id: string;
  ticker: string;
  direction: "above" | "below";
  target: number;
  enabled: boolean;
  triggeredAt?: string;
  channels?: ("in_app" | "push" | "email")[];
}
interface AlertState {
  rules: PriceAlertRule[];
  add: (rule: PriceAlertRule) => void;
  remove: (id: string) => void;
  markTriggered: (id: string, triggeredAt: string) => void;
  rearm: (id: string) => void;
  replaceAll: (rules: PriceAlertRule[]) => void;
}
export const usePriceAlertStore = create<AlertState>()(persist(
  (set, get) => ({
    rules: [],
    add: (rule) => set({ rules: [...get().rules, rule] }),
    remove: (id) => set({ rules: get().rules.filter((item) => item.id !== id) }),
    markTriggered: (id, triggeredAt) => set({ rules: get().rules.map((item) => item.id === id ? { ...item, triggeredAt } : item) }),
    rearm: (id) => set({ rules: get().rules.map((item) => item.id === id ? { ...item, enabled: true, triggeredAt: undefined } : item) }),
    replaceAll: (rules) => set({ rules: [...rules] }),
  }),
  { name: "wariba-price-alerts", storage, skipHydration: true }
));

interface ChartState {
  type: ChartType;
  indicators: IndicatorId[];
  logarithmic: boolean;
  percentMode: boolean;
  setType: (type: ChartType) => void;
  setIndicators: (indicators: IndicatorId[]) => void;
  toggleIndicator: (indicator: IndicatorId) => void;
  toggleLog: () => void;
  togglePercent: () => void;
}
export const useChartStore = create<ChartState>()(persist(
  (set, get) => ({
    type: "candlestick",
    indicators: ["sma20"],
    logarithmic: false,
    percentMode: false,
    setType: (type) => set({ type }),
    setIndicators: (indicators) => set({ indicators: [...indicators] }),
    toggleIndicator: (indicator) => set({ indicators: get().indicators.includes(indicator)
      ? get().indicators.filter((item) => item !== indicator)
      : [...get().indicators, indicator] }),
    toggleLog: () => set({ logarithmic: !get().logarithmic }),
    togglePercent: () => set({ percentMode: !get().percentMode }),
  }),
  { name: "wariba-chart", storage, skipHydration: true }
));

interface LevelState {
  byTicker: Record<string, number[]>;
  toggle: (ticker: string, price: number) => void;
}
export const useChartLevelStore = create<LevelState>()(persist(
  (set, get) => ({
    byTicker: {},
    toggle: (ticker, price) => {
      const current = get().byTicker[ticker] ?? [];
      const near = current.find((value) => Math.abs(value - price) / Math.max(1, price) < 0.005);
      set({ byTicker: { ...get().byTicker, [ticker]: near ? current.filter((value) => value !== near) : [...current, price] } });
    },
  }),
  { name: "wariba-chart-levels", storage, skipHydration: true }
));

export type ScreenerSort = "variation" | "rendement" | "per" | "liquidite";
export interface SavedScreenerFilter {
  id: string;
  label: string;
  query: string;
  sector: string;
  sort: ScreenerSort;
}
interface ScreenerState {
  query: string;
  sector: string;
  sort: ScreenerSort;
  saved: SavedScreenerFilter[];
  setQuery: (query: string) => void;
  setSector: (sector: string) => void;
  setSort: (sort: ScreenerSort) => void;
  saveCurrent: () => void;
  apply: (filter: SavedScreenerFilter) => void;
  remove: (id: string) => void;
}
export const useScreenerStore = create<ScreenerState>()(persist(
  (set, get) => ({
    query: "",
    sector: "Tous",
    sort: "variation",
    saved: [],
    setQuery: (query) => set({ query }),
    setSector: (sector) => set({ sector }),
    setSort: (sort) => set({ sort }),
    saveCurrent: () => {
      const { query, sector, sort, saved } = get();
      const id = `${query.trim().toLowerCase()}|${sector}|${sort}`;
      if (saved.some((filter) => filter.id === id)) return;
      const label = [query.trim(), sector === "Tous" ? "Toutes" : sector, sort].filter(Boolean).join(" · ");
      set({ saved: [...saved, { id, label, query, sector, sort }] });
    },
    apply: ({ query, sector, sort }) => set({ query, sector, sort }),
    remove: (id) => set({ saved: get().saved.filter((filter) => filter.id !== id) }),
  }),
  { name: "@wariba:screener", storage, skipHydration: true }
));

export type ExperienceLevel = "debutant" | "intermediaire" | "avance";
/** Version du flux de première ouverture — l'incrémenter re-présente l'onboarding. */
export const ONBOARDING_VERSION = 1;

interface SettingsState {
  notifications: boolean;
  serverPushRegistered: boolean;
  emailNotifications: boolean;
  analyticsConsent: "unknown" | "granted" | "denied";
  dataSaver: boolean;
  experienceLevel: ExperienceLevel | null;
  onboardingVersion: number;
  setNotifications: (value: boolean) => void;
  setServerPushRegistered: (value: boolean) => void;
  setEmailNotifications: (value: boolean) => void;
  setAnalyticsConsent: (value: "unknown" | "granted" | "denied") => void;
  setDataSaver: (value: boolean) => void;
  setExperienceLevel: (level: ExperienceLevel | null) => void;
  completeOnboarding: (level: ExperienceLevel | null) => void;
}
export const useSettingsStore = create<SettingsState>()(persist(
  (set) => ({
    notifications: false,
    serverPushRegistered: false,
    emailNotifications: false,
    analyticsConsent: "unknown",
    dataSaver: false,
    experienceLevel: null,
    onboardingVersion: 0,
    setNotifications: (notifications) => set({ notifications }),
    setServerPushRegistered: (serverPushRegistered) => set({ serverPushRegistered }),
    setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
    setAnalyticsConsent: (analyticsConsent) => set({ analyticsConsent }),
    setDataSaver: (dataSaver) => set({ dataSaver }),
    setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
    completeOnboarding: (experienceLevel) => set({ experienceLevel, onboardingVersion: ONBOARDING_VERSION }),
  }),
  { name: "wariba-settings", storage, skipHydration: true }
));

export async function rehydrateStores(): Promise<void> {
  await Promise.all([
    useWatchlistStore.persist.rehydrate(), usePortfolioStore.persist.rehydrate(),
    usePriceAlertStore.persist.rehydrate(), useChartStore.persist.rehydrate(),
    useChartLevelStore.persist.rehydrate(), useScreenerStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
  ]);
}
