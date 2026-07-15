import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Canvas, Path } from "@shopify/react-native-skia";
import { colors, tabular } from "../theme";

/**
 * Signature d'ouverture (~1,8 s) : le monogramme « A » se trace, trois
 * chandelles poussent, le wordmark apparaît, puis fondu vers l'app.
 * Le chargement des données tourne pendant toute la séquence (le
 * provider est monté au-dessus) — l'animation n'ajoute aucune attente.
 * Avec « réduire les animations », la séquence saute au fondu final.
 */

const MONOGRAM_SIZE = 180;
const W_SIGNAL = "M 18 28 L 54 108 L 90 62 L 126 108 L 162 28";

export function StartAnimation({ reduceMotion, onDone }: {
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const dot = useSharedValue(reduceMotion ? 1 : 0);
  const text = useSharedValue(reduceMotion ? 1 : 0);
  const veil = useSharedValue(1);

  useEffect(() => {
    const holdBeforeFade = reduceMotion ? 420 : 1450;
    if (!reduceMotion) {
      draw.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
      dot.value = withDelay(420, withTiming(1, { duration: 360, easing: Easing.out(Easing.back(1.7)) }));
      text.value = withDelay(700, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }));
    }
    veil.value = withDelay(holdBeforeFade, withTiming(0, { duration: 350 }, (finished) => {
      if (finished) runOnJS(onDone)();
    }));
  }, [dot, draw, onDone, reduceMotion, text, veil]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 8 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dot.value,
    transform: [{ scale: 0.4 + dot.value * 0.6 }],
  }));

  return (
    <Animated.View style={[styles.screen, veilStyle]} accessibilityLabel="WARIBA — la BRVM, clairement">
      <View style={styles.ambientOne} />
      <View style={styles.ambientTwo} />
      <View style={styles.stage}>
        <Canvas style={styles.monogram}>
          <Path
            path={W_SIGNAL}
            style="stroke"
            strokeWidth={11}
            strokeCap="round"
            strokeJoin="round"
            color={colors.accent}
            start={0}
            end={draw as SharedValue<number>}
          />
        </Canvas>
        <Animated.View style={[styles.signalDot, dotStyle]}><View style={styles.signalCore} /></Animated.View>
      </View>
      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={styles.wordmark}>WARIBA</Text>
        <Text style={styles.tagline}>LA BRVM, CLAIREMENT.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: colors.background,
  },
  ambientOne: { position: "absolute", width: 340, height: 340, borderRadius: 170, borderWidth: 1, borderColor: "rgba(52,217,143,0.08)" },
  ambientTwo: { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: "rgba(244,201,107,0.06)" },
  stage: { width: MONOGRAM_SIZE, height: MONOGRAM_SIZE, alignItems: "center", justifyContent: "center" },
  monogram: { width: MONOGRAM_SIZE, height: MONOGRAM_SIZE },
  signalDot: { position: "absolute", right: 6, top: 21, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.gold },
  signalCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFF4C8" },
  copy: { alignItems: "center", gap: 7 },
  wordmark: { color: colors.ink, fontSize: 29, fontWeight: "900", letterSpacing: 5.5 },
  tagline: { color: colors.ink3, fontSize: 10.5, fontWeight: "700", letterSpacing: 2.2, fontVariant: tabular },
});
