import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { cancelAnimation, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, tabular, type } from "../theme";

/**
 * Conteneur d'écran. Les onglets n'ont pas d'en-tête natif : le titre est
 * rendu ici, sous l'encoche grâce aux insets. Les écrans de pile (en-tête
 * natif déjà présent) omettent `title` et gardent un padding standard.
 */
export function Page({
  title, subtitle, children, refreshing = false, onRefresh, action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  action?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[
        styles.content,
        { paddingTop: title ? insets.top + 14 : 20, paddingBottom: 36 + insets.bottom },
      ]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {title || subtitle ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : action ? (
        <View style={styles.header}><View style={styles.headerCopy} />{action}</View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Section({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(280)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      {children}
    </Animated.View>
  );
}

/** Tuile de métrique — carte pleine, valeur qui se réduit plutôt que déborder. */
export function Metric({ label, value, tone = "default", detail }: { label: string; value: string; tone?: "default" | "up" | "down" | "accent"; detail?: string }) {
  return (
    <View style={styles.metric}>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.metricValue, tone === "up" && styles.up, tone === "down" && styles.down, tone === "accent" && styles.accent]}
      >
        {value}
      </Text>
      {detail ? <Text numberOfLines={1} style={styles.metricDetail}>{detail}</Text> : null}
    </View>
  );
}

/** Pastille de variation (+1,25 %) sur fond teinté — lisible d'un coup d'œil. */
export function ChangePill({ value, label }: { value: number; label: string }) {
  const up = value >= 0;
  return (
    <View style={[styles.pill, { backgroundColor: up ? colors.upSoft : colors.downSoft }]}>
      <Text style={[styles.pillText, { color: up ? colors.up : colors.down }]}>{label}</Text>
    </View>
  );
}

export function Row({ icon, title, detail, value, valueDetail, onPress, tone }: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  value?: string;
  valueDetail?: string;
  onPress?: () => void;
  tone?: "up" | "down";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? [title, detail].filter(Boolean).join(", ") : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={17} color={colors.ink2} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text numberOfLines={2} style={styles.rowTitle}>{title}</Text>
        {detail ? <Text numberOfLines={2} style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value || valueDetail ? (
        <View style={styles.rowRight}>
          {value ? <Text style={[styles.rowValue, tone === "up" && styles.up, tone === "down" && styles.down]}>{value}</Text> : null}
          {valueDetail ? <Text style={[styles.rowValueDetail, tone === "up" && styles.up, tone === "down" && styles.down]}>{valueDetail}</Text> : null}
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={15} color={colors.ink3} /> : null}
    </Pressable>
  );
}

export function ActionButton({ label, icon, onPress, active = false }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.action, active && styles.actionActive, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? colors.background : colors.ink2} /> : null}
      <Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SegmentedTabs<T extends string>({ tabs, active, onChange }: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.segmented}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active === tab.id }}
            onPress={() => { if (tab.id !== active) void Haptics.selectionAsync(); onChange(tab.id); }}
            style={[styles.segment, active === tab.id && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active === tab.id && styles.segmentTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function LoadingState({ label = "Chargement des données BRVM…" }: { label?: string }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = reduceMotion ? 1 : withRepeat(withTiming(1, { duration: 700 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.loading}>
      <View style={styles.loadingHeader}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
      {[0.8, 1, 0.92, 1].map((share, index) => (
        <Animated.View key={index} style={[styles.skeleton, { width: `${share * 100}%` }, pulseStyle]} />
      ))}
    </View>
  );
}

export function EmptyState({ icon = "file-tray-outline", title, detail }: { icon?: keyof typeof Ionicons.glyphMap; title: string; detail: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={22} color={colors.ink2} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, gap: 26 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  title: { ...type.display },
  subtitle: { ...type.caption, marginTop: 5 },
  section: { gap: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  sectionTitle: { ...type.title },
  sectionDetail: { ...type.caption },
  metric: {
    flexGrow: 1, flexBasis: "44%", paddingVertical: 13, paddingHorizontal: 14,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  metricLabel: { ...type.label },
  metricValue: { color: colors.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.4, marginTop: 7, fontVariant: tabular },
  metricDetail: { ...type.caption, marginTop: 3 },
  pill: { paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: radius.full },
  pillText: { fontSize: 12, fontWeight: "700", fontVariant: tabular },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 11 },
  rowIcon: {
    width: 34, height: 34, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface2, borderRadius: radius.md,
  },
  rowCopy: { flex: 1 },
  rowTitle: { ...type.body },
  rowDetail: { ...type.caption, marginTop: 3 },
  rowRight: { alignItems: "flex-end" },
  rowValue: { color: colors.ink, fontSize: 14, fontWeight: "700", fontVariant: tabular },
  rowValueDetail: { ...type.caption, marginTop: 2, fontVariant: tabular },
  segmented: {
    flexDirection: "row", gap: 2, padding: 3,
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md,
  },
  segment: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 13, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surface, borderColor: colors.lineStrong, borderWidth: 1 },
  segmentText: { color: colors.ink3, fontSize: 12.5, fontWeight: "600" },
  segmentTextActive: { color: colors.ink },
  action: {
    minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingHorizontal: 13, borderRadius: radius.full, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface,
  },
  actionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionText: { color: colors.ink2, fontSize: 12.5, fontWeight: "700" },
  actionTextActive: { color: colors.background },
  pressed: { opacity: 0.6 },
  loading: { flex: 1, minHeight: 320, justifyContent: "center", gap: 12, paddingHorizontal: 18, backgroundColor: colors.background },
  loadingHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  loadingText: { ...type.caption },
  skeleton: { height: 58, borderRadius: radius.lg, backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1 },
  empty: {
    minHeight: 170, alignItems: "center", justifyContent: "center", padding: 24,
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 42, height: 42, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface2, borderRadius: radius.full,
  },
  emptyTitle: { ...type.body, marginTop: 12 },
  emptyDetail: { ...type.caption, textAlign: "center", marginTop: 5, maxWidth: 260 },
  up: { color: colors.up }, down: { color: colors.down }, accent: { color: colors.accent },
});
