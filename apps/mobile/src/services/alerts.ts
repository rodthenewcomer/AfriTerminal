import * as Notifications from "expo-notifications";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { priceAlertMatches } from "../lib/forms";
import type { QuoteMap } from "../data/types";
import { usePriceAlertStore, useSettingsStore } from "../stores";
import { registerPushDevice, unregisterPushDevice } from "./push-registration";
import { legacyStorageKey } from "@wariba/core/legacy";

const TASK_NAME = "wariba-price-alert-check";
const PREVIOUS_TASK_NAME = legacyStorageKey("price-alert-check");

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function evaluatePriceAlerts(quotes: QuoteMap): Promise<number> {
  const settings = useSettingsStore.getState();
  if (!settings.notifications || settings.serverPushRegistered) return 0;
  const state = usePriceAlertStore.getState();
  let triggered = 0;
  for (const rule of state.rules) {
    if (!rule.enabled || rule.triggeredAt) continue;
    const price = quotes[rule.ticker]?.lastClose;
    if (price === undefined) continue;
    const matches = priceAlertMatches(rule, price);
    if (!matches) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${rule.ticker} · seuil atteint`,
        body: `Cours ${Math.round(price).toLocaleString("fr-FR")} FCFA · seuil ${rule.direction === "above" ? "haut" : "bas"} ${Math.round(rule.target).toLocaleString("fr-FR")} FCFA`,
        data: { ticker: rule.ticker },
        sound: false,
      },
      trigger: null,
    });
    state.markTriggered(rule.id, new Date().toISOString());
    triggered += 1;
  }
  return triggered;
}

async function unregisterBackgroundTasks(): Promise<void> {
  for (const name of [TASK_NAME, PREVIOUS_TASK_NAME]) {
    if (await TaskManager.isTaskRegisteredAsync(name)) {
      await BackgroundTask.unregisterTaskAsync(name);
    }
  }
}

export async function enableNotifications(accessToken?: string): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("price-alerts", {
      name: "Alertes de prix",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  const enabled = permission.granted;
  useSettingsStore.getState().setNotifications(enabled);
  if (enabled && !accessToken) {
    useSettingsStore.getState().setNotifications(false);
    throw new Error("Connexion requise pour les alertes push");
  }
  if (enabled && accessToken) {
    try {
      await registerPushDevice(accessToken);
      useSettingsStore.getState().setServerPushRegistered(true);
      await unregisterBackgroundTasks();
    } catch (error) {
      useSettingsStore.getState().setNotifications(false);
      useSettingsStore.getState().setServerPushRegistered(false);
      throw error;
    }
  }
  return enabled;
}

export async function disableNotifications(accessToken?: string): Promise<void> {
  if (accessToken) await unregisterPushDevice(accessToken);
  useSettingsStore.getState().setNotifications(false);
  useSettingsStore.getState().setServerPushRegistered(false);
  await unregisterBackgroundTasks();
}
