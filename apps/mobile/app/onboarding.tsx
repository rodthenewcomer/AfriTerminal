import { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { pct } from "@wariba/core/format";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { useChartStore, useSettingsStore, type ExperienceLevel } from "../src/stores";
import { colors, radius, tabular, type } from "../src/theme";
import waribaIcon from "../assets/icon.png";

const SLIDES = [
  {
    step: "01",
    icon: "analytics-outline" as const,
    eyebrow: "INTELLIGENCE DE MARCHÉ",
    title: "La BRVM devient une décision, pas un déchiffrage.",
    body: "Cours officiels, 48 sociétés, indices, dividendes et publications vérifiées — une lecture nette du marché ouest-africain.",
  },
  {
    step: "02",
    icon: "pulse-outline" as const,
    eyebrow: "VOTRE SIGNAL",
    title: "Suivez moins. Comprenez mieux.",
    body: "Watchlist, portefeuille, rendement et alertes de prix rassemblent ce qui compte vraiment, sans faux temps réel ni bruit.",
  },
  {
    step: "03",
    icon: "shield-checkmark-outline" as const,
    eyebrow: "PRIVÉ PAR DÉFAUT",
    title: "Votre espace reste le vôtre.",
    body: "Explorez librement sans compte. Connectez-vous seulement pour chiffrer, sauvegarder et synchroniser vos données entre appareils.",
  },
] as const;

const LEVELS: { id: ExperienceLevel; title: string; detail: string }[] = [
  { id: "debutant", title: "Guidé", detail: "Lexique et graphiques épurés" },
  { id: "intermediaire", title: "Investisseur", detail: "Expérience équilibrée" },
  { id: "avance", title: "Expert", detail: "Outils avancés dès l'ouverture" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const market = useMarketData();
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const chart = useChartStore();
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel>("intermediaire");
  const pagerRef = useRef<ScrollView>(null);
  const composite = market.indices.find((item) => /composite/i.test(item.name)) ?? market.indices[0];
  const pages = SLIDES.length + 1;

  const finish = (destination: "tabs" | "login" | "signup") => {
    if (level === "debutant") {
      chart.setType("line");
      chart.setIndicators([]);
    }
    completeOnboarding(level);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (destination === "signup") router.replace("/(auth)/sign-up");
    else if (destination === "login") router.replace("/(auth)/sign-in");
    else router.replace("/(tabs)");
  };

  const next = () => {
    if (!width) return;
    void Haptics.selectionAsync();
    pagerRef.current?.scrollTo({ x: (page + 1) * width, animated: !reduceMotion });
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14 }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.glow} />
      <View style={styles.topBar}>
        <View style={styles.brandLockup}>
          <Image source={waribaIcon} alt="" style={styles.brandIcon} />
          <Text style={styles.brand}>WARIBA</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Passer l'introduction" hitSlop={10} onPress={() => finish("tabs")}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.step} style={[styles.slide, { width: width || 1 }]}>
            <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(360)} style={styles.visual}>
              <View style={styles.visualTop}>
                <Text style={styles.step}>{slide.step}</Text>
                <View style={styles.iconRing}>
                  <Ionicons name={slide.icon} size={22} color={colors.accent} />
                </View>
              </View>
              {index === 0 ? (
                <View style={styles.marketCard}>
                  <Text style={styles.marketLabel}>{composite?.name ?? "BRVM COMPOSITE"}</Text>
                  <View style={styles.marketRow}>
                    <Text style={styles.marketValue}>{composite?.level.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) ?? "—"}</Text>
                    <Text style={[styles.marketChange, { color: (composite?.dayChangePct ?? 0) >= 0 ? colors.up : colors.down }]}>
                      {composite ? pct(composite.dayChangePct, { signed: true, digits: 2 }) : "—"}
                    </Text>
                  </View>
                  <View style={styles.signalBars}>
                    {[28, 46, 36, 60, 52, 74, 66, 88, 78, 96].map((height, bar) => (
                      <View key={bar} style={[styles.signalBar, { height }]} />
                    ))}
                  </View>
                </View>
              ) : index === 1 ? (
                <View style={styles.stack}>
                  {[
                    ["star-outline", "Watchlist", "12 valeurs suivies"],
                    ["wallet-outline", "Portefeuille", "Performance consolidée"],
                    ["notifications-outline", "Alertes", "Seuils de clôture"],
                  ].map(([icon, label, detail]) => (
                    <View key={label} style={styles.featureRow}>
                      <View style={styles.featureIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.accent} /></View>
                      <View style={styles.featureCopy}><Text style={styles.featureTitle}>{label}</Text><Text style={styles.featureDetail}>{detail}</Text></View>
                      <Ionicons name="chevron-forward" size={15} color={colors.ink3} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.privacyCard}>
                  <View style={styles.shield}><Ionicons name="lock-closed" size={24} color={colors.accent} /></View>
                  <Text style={styles.privacyTitle}>Données locales en mode invité</Text>
                  <Text style={styles.privacyDetail}>Synchronisation chiffrée uniquement après votre connexion.</Text>
                  <View style={styles.privacyLine}><Ionicons name="checkmark-circle" size={16} color={colors.accent} /><Text style={styles.privacyLineText}>Export et suppression à tout moment</Text></View>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(90).duration(360)} style={styles.copy}>
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text accessibilityRole="header" style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>
            </Animated.View>
          </View>
        ))}

        <View style={[styles.slide, styles.finalSlide, { width: width || 1 }]}>
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(360)} style={styles.finalCopy}>
            <Text style={styles.eyebrow}>VOTRE WARIBA</Text>
            <Text accessibilityRole="header" style={styles.slideTitle}>Commencez à votre rythme.</Text>
            <Text style={styles.slideBody}>Choisissez votre niveau. Vous pourrez le modifier à tout moment.</Text>
          </Animated.View>

          <View style={styles.levels}>
            {LEVELS.map((item) => {
              const selected = level === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => { setLevel(item.id); void Haptics.selectionAsync(); }}
                  style={({ pressed }) => [styles.levelCard, selected && styles.levelSelected, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioCore} /> : null}</View>
                  <View style={styles.levelCopy}><Text style={styles.levelTitle}>{item.title}</Text><Text style={styles.levelDetail}>{item.detail}</Text></View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.authActions}>
            <Pressable accessibilityRole="button" onPress={() => finish("signup")} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Créer mon compte</Text><Ionicons name="arrow-forward" size={17} color={colors.background} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => finish("login")} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>J&apos;ai déjà un compte · Se connecter</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => finish("tabs")}><Text style={styles.guest}>Explorer sans compte</Text></Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Écran ${page + 1} sur ${pages}`}>
          {Array.from({ length: pages }, (_, index) => <View key={index} style={[styles.dot, page === index && styles.dotActive]} />)}
        </View>
        {page < pages - 1 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Écran suivant" onPress={next} style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
            <Text style={styles.nextText}>Continuer</Text><Ionicons name="arrow-forward" size={16} color={colors.background} />
          </Pressable>
        ) : <Text style={styles.finalHint}>Compte optionnel</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: colors.background },
  glow: { position: "absolute", top: -150, right: -160, width: 420, height: 420, borderRadius: 210, backgroundColor: "rgba(52,217,143,0.055)" },
  topBar: { zIndex: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 8 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 30, height: 30, borderRadius: 9 },
  brand: { color: colors.ink, fontSize: 14, fontWeight: "900", letterSpacing: 2.2 },
  skip: { ...type.caption, color: colors.ink2, fontWeight: "700", paddingVertical: 8 },
  pager: { flex: 1 },
  slide: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 28 },
  finalSlide: { gap: 18 },
  visual: { minHeight: 272, padding: 18, borderRadius: 28, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: "rgba(10,24,18,0.92)" },
  visualTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  step: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  iconRing: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: "rgba(52,217,143,0.25)" },
  marketCard: { flex: 1, justifyContent: "space-between", paddingTop: 4 },
  marketLabel: { ...type.label, color: colors.ink2 },
  marketRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  marketValue: { color: colors.ink, fontSize: 36, fontWeight: "900", letterSpacing: -1.2, fontVariant: tabular },
  marketChange: { fontSize: 13, fontWeight: "900", paddingBottom: 6, fontVariant: tabular },
  signalBars: { height: 104, flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 10 },
  signalBar: { flex: 1, minWidth: 4, borderRadius: 4, backgroundColor: colors.accent, opacity: 0.72 },
  stack: { flex: 1, justifyContent: "center", gap: 8 },
  featureRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderRadius: radius.lg, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  featureIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.accentSoft },
  featureCopy: { flex: 1, gap: 2 },
  featureTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  featureDetail: { color: colors.ink3, fontSize: 11 },
  privacyCard: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  shield: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: "rgba(52,217,143,0.28)", marginBottom: 16 },
  privacyTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  privacyDetail: { ...type.caption, textAlign: "center", marginTop: 7, maxWidth: 260 },
  privacyLine: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 20 },
  privacyLineText: { color: colors.ink2, fontSize: 11.5, fontWeight: "600" },
  copy: { gap: 10 },
  finalCopy: { gap: 8 },
  eyebrow: { ...type.label, color: colors.accent, letterSpacing: 1.7 },
  slideTitle: { color: colors.ink, fontSize: 29, fontWeight: "900", letterSpacing: -0.9, lineHeight: 34 },
  slideBody: { ...type.sub, fontSize: 14, lineHeight: 21 },
  levels: { gap: 8 },
  levelCard: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 15, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  levelSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  radio: { width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1.5, borderColor: colors.ink3 },
  radioSelected: { borderColor: colors.accent },
  radioCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  levelCopy: { flex: 1, gap: 2 },
  levelTitle: { color: colors.ink, fontSize: 13.5, fontWeight: "800" },
  levelDetail: { color: colors.ink3, fontSize: 11.5 },
  authActions: { gap: 9, marginTop: 2 },
  primary: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: radius.lg, backgroundColor: colors.accent },
  primaryText: { color: colors.background, fontSize: 14, fontWeight: "900" },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  secondaryText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  guest: { minHeight: 38, color: colors.ink2, fontSize: 12, fontWeight: "700", textAlign: "center", textAlignVertical: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  footer: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 8 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surface2 },
  dotActive: { width: 24, backgroundColor: colors.accent },
  next: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, backgroundColor: colors.accent, borderRadius: radius.full },
  nextText: { color: colors.background, fontSize: 13.5, fontWeight: "900" },
  finalHint: { ...type.caption, fontWeight: "600" },
});
