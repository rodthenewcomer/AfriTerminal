import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { RealQuote } from "@afriterminal/core/types";
import { fcfa, pct } from "@afriterminal/core/format";
import { colors, radius, tabular, type } from "../theme";
import { Sparkline } from "./Sparkline";
import { useWatchlistStore } from "../stores";

export function QuoteRow({ quote, rank, onRemove }: { quote: RealQuote; rank?: number; onRemove?: () => void }) {
  const router = useRouter();
  const watched = useWatchlistStore((state) => state.tickers.includes(quote.ticker));
  const toggle = useWatchlistStore((state) => state.toggle);
  const up = quote.dayChangePct >= 0;
  const previousPrice = useRef(quote.lastClose);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (previousPrice.current !== quote.lastClose) {
      flash.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 }));
      previousPrice.current = quote.lastClose;
    }
  }, [flash, quote.lastClose]);
  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [0, 1],
      ["rgba(0,0,0,0)", up ? colors.upSoft : colors.downSoft]
    ),
  }), [up]);

  const content = (
    <Animated.View style={flashStyle}>
      <Pressable onPress={() => router.push(`/stocks/${quote.ticker}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        {rank ? <Text style={styles.rank}>{rank}</Text> : null}
        <View style={styles.identity}>
          <Text style={styles.ticker}>{quote.ticker}</Text>
          <Text numberOfLines={1} style={styles.name}>{quote.name}</Text>
        </View>
        {quote.sparkline?.length >= 2 ? (
          <View style={styles.spark}>
            <Sparkline values={quote.sparkline} width={54} height={22} color={up ? colors.up : colors.down} />
          </View>
        ) : null}
        <View style={styles.quote}>
          <Text style={styles.price}>{fcfa(quote.lastClose)}</Text>
          <View style={[styles.pill, { backgroundColor: up ? colors.upSoft : colors.downSoft }]}>
            <Text style={[styles.change, { color: up ? colors.up : colors.down }]}>{pct(quote.dayChangePct, { signed: true, digits: 2 })}</Text>
          </View>
        </View>
        <Pressable hitSlop={10} onPress={(event) => { event.stopPropagation(); void Haptics.selectionAsync(); toggle(quote.ticker); }}>
          <Ionicons name={watched ? "star" : "star-outline"} size={17} color={watched ? colors.accent : colors.ink3} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
  if (!onRemove) return content;
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${quote.ticker} de la watchlist`} onPress={onRemove} style={styles.remove}>
          <Ionicons name="trash-outline" size={18} color={colors.ink} />
          <Text style={styles.removeText}>Retirer</Text>
        </Pressable>
      )}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  rank: { width: 20, ...type.caption, fontVariant: tabular },
  identity: { flex: 1, minWidth: 0 },
  ticker: { color: colors.ink, fontSize: 14.5, fontWeight: "800", letterSpacing: 0.2 },
  name: { ...type.caption, marginTop: 2.5 },
  spark: { opacity: 0.85 },
  quote: { alignItems: "flex-end", gap: 4 },
  price: { color: colors.ink, fontSize: 13.5, fontWeight: "700", fontVariant: tabular },
  pill: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: radius.full },
  change: { fontSize: 11, fontWeight: "700", fontVariant: tabular },
  remove: { width: 84, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.down, borderRadius: radius.md, marginVertical: 6 },
  removeText: { color: colors.ink, fontSize: 10, fontWeight: "700" },
});
