import "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { Appearance, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Stack, useRouter, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MarketDataProvider } from "../src/providers/MarketDataProvider";
import { rehydrateStores, useSettingsStore } from "../src/stores";
import { colors } from "../src/theme";
import "../src/services/alerts";
import { MobileAuthProvider } from "../src/providers/AuthProvider";
import { AppRuntime } from "../src/providers/AppRuntime";
import { trackMobileEvent } from "../src/services/analytics";

void SplashScreen.preventAutoHideAsync();

/** Filet de sécurité : sans lui, une erreur de rendu laisse un écran noir muet. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={errorStyles.screen}>
      <Text style={errorStyles.title}>L'écran a rencontré un problème</Text>
      <Text style={errorStyles.detail}>Une erreur inattendue empêche cet écran de s'afficher.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Réessayer" onPress={() => void retry()} style={({ pressed }) => [errorStyles.button, pressed && { opacity: 0.75 }]}>
        <Text style={errorStyles.buttonText}>Réessayer</Text>
      </Pressable>
      <Text style={errorStyles.hint}>Si le problème persiste, fermez puis rouvrez l’application. Vos données de compte restent protégées dans le cloud.</Text>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28, backgroundColor: colors.background },
  title: { color: colors.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  detail: { color: colors.ink3, fontSize: 12, lineHeight: 17, textAlign: "center" },
  button: { minHeight: 44, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.accent, marginTop: 6 },
  buttonText: { color: colors.onAccent, fontSize: 14, fontWeight: "800" },
  hint: { color: colors.ink3, fontSize: 11, lineHeight: 15, textAlign: "center", marginTop: 8, maxWidth: 280 },
});

export default function RootLayout() {
  const router = useRouter();
  const colorMode = useSettingsStore((state) => state.colorMode);
  const systemScheme = useColorScheme();
  const lastNotificationId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void rehydrateStores().finally(() => {
      setReady(true);
      void SplashScreen.hideAsync();
    });
  }, []);
  useEffect(() => {
    Appearance.setColorScheme(colorMode === "system" ? null : colorMode);
  }, [colorMode]);
  useEffect(() => {
    const openNotification = (response: Notifications.NotificationResponse | null) => {
      if (!response || lastNotificationId.current === response.notification.request.identifier) return;
      const ticker = response.notification.request.content.data?.ticker;
      if (typeof ticker !== "string" || !/^[A-Z0-9]{2,12}$/i.test(ticker)) return;
      lastNotificationId.current = response.notification.request.identifier;
      void trackMobileEvent("notification_tap", { ticker: ticker.toUpperCase() }, `/stocks/${ticker.toUpperCase()}`);
      router.push(`/stocks/${ticker.toUpperCase()}`);
    };
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      openNotification(response);
      if (response) void Notifications.clearLastNotificationResponseAsync();
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response);
    });
    return () => subscription.remove();
  }, [router]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <MobileAuthProvider>
        <AppRuntime />
        <MarketDataProvider>
          <StatusBar style={(systemScheme ?? "dark") === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{
          headerStyle: { backgroundColor: colors.background as string },
          headerTintColor: colors.ink as string,
          headerTitleStyle: { fontSize: 15, fontWeight: "700" },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background as string },
          animation: "slide_from_right",
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="account" options={{ title: "Compte" }} />
          <Stack.Screen name="stocks/[ticker]" options={{ title: "Fiche action" }} />
          <Stack.Screen name="indices/[code]" options={{ title: "Indice" }} />
          <Stack.Screen name="alerts" options={{ title: "Alertes" }} />
          <Stack.Screen name="screener" options={{ title: "Screener" }} />
          <Stack.Screen name="pro" options={{ title: "WARIBA Pro" }} />
          <Stack.Screen name="dividends" options={{ title: "Dividendes" }} />
          <Stack.Screen name="operations" options={{ title: "Opérations & documents" }} />
          <Stack.Screen name="documents" options={{ title: "Opérations & documents" }} />
          <Stack.Screen name="ipo" options={{ title: "Opérations & documents" }} />
          <Stack.Screen name="sgi" options={{ title: "Choisir une SGI" }} />
          <Stack.Screen name="sgi/[id]" options={{ title: "Fiche SGI" }} />
          <Stack.Screen name="map" options={{ title: "Carte du marché" }} />
          <Stack.Screen name="settings" options={{ title: "Réglages" }} />
          <Stack.Screen name="status" options={{ title: "État des données" }} />
          </Stack>
        </MarketDataProvider>
      </MobileAuthProvider>
    </GestureHandlerRootView>
  );
}
