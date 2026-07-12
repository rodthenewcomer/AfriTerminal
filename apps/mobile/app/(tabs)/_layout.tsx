import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "../../src/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Dock : Accueil · Recherche · Watchlist · Portefeuille · Plus. */
const ICONS: Record<string, [IconName, IconName]> = {
  index: ["view-dashboard-outline", "view-dashboard"],
  search: ["magnify", "magnify"],
  watchlist: ["star-outline", "star"],
  portfolio: ["wallet-outline", "wallet"],
  more: ["dots-horizontal", "dots-horizontal"],
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      // Pas de hauteur fixe : la barre garde l'inset « home indicator » géré nativement.
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, paddingTop: 6 },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.ink3,
      tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600", letterSpacing: 0.1 },
      tabBarIcon: ({ color, focused }) => {
        const pair = ICONS[route.name] ?? ICONS.more;
        return <MaterialCommunityIcons name={pair[focused ? 1 : 0]} size={24} color={color} />;
      },
    })}>
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="search" options={{ title: "Recherche" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watchlist" }} />
      <Tabs.Screen name="portfolio" options={{ title: "Portefeuille" }} />
      <Tabs.Screen name="more" options={{ title: "Plus" }} />
    </Tabs>
  );
}
