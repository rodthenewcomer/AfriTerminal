import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MarketDataProvider } from "../src/providers/MarketDataProvider";
import { rehydrateStores } from "../src/stores";
import { colors } from "../src/theme";
import "../src/services/alerts";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void rehydrateStores().finally(() => {
      setReady(true);
      void SplashScreen.hideAsync();
    });
  }, []);
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const ticker = response.notification.request.content.data?.ticker;
      if (typeof ticker === "string") router.push(`/stocks/${ticker.toUpperCase()}`);
    });
    return () => subscription.remove();
  }, [router]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <MarketDataProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontSize: 15, fontWeight: "700" },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="stocks/[ticker]" options={{ title: "Fiche action" }} />
          <Stack.Screen name="alerts" options={{ title: "Alertes" }} />
          <Stack.Screen name="screener" options={{ title: "Screener" }} />
          <Stack.Screen name="news" options={{ title: "Actualités" }} />
          <Stack.Screen name="dividends" options={{ title: "Dividendes" }} />
          <Stack.Screen name="documents" options={{ title: "Documents" }} />
          <Stack.Screen name="ipo" options={{ title: "IPO & opérations" }} />
          <Stack.Screen name="map" options={{ title: "Carte du marché" }} />
          <Stack.Screen name="settings" options={{ title: "Réglages" }} />
          <Stack.Screen name="status" options={{ title: "État des données" }} />
        </Stack>
      </MarketDataProvider>
    </GestureHandlerRootView>
  );
}
