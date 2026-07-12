import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import type { OHLCV } from "@afriterminal/core/types";
import type { TimeValue } from "@afriterminal/core/indicators";

const COLORS = {
  background: "#09090b",
  surface: "#111113",
  surface2: "#18181b",
  line: "rgba(255,255,255,0.08)",
  ink: "#fafafa",
  ink2: "#a1a1aa",
  ink3: "#63636b",
  accent: "#e2a63d",
  up: "#22c55e",
  down: "#ef4444",
} as const;

const BASE_SLOT_WIDTH = 10;
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const PRICE_AXIS_WIDTH = 58;
const DATE_AXIS_HEIGHT = 26;
const PLOT_TOP = 10;
const TOOLTIP_WIDTH = 174;
const SPRING = { damping: 19, stiffness: 190, mass: 0.82 } as const;
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const integerFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

type DateTick = { key: string; label: string; x: number };

function clamp(v: number, lo: number, hi: number): number {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-").map(Number);
  if (!month || !day) return value;
  return `${day} ${MONTHS[month - 1]}`;
}

function formatPrice(value: number): string {
  return integerFormatter.format(value);
}

function triggerResetHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function triggerSelectionHaptic(): void {
  void Haptics.selectionAsync();
}

function makeDateTicks(
  data: OHLCV[],
  scale: number,
  translateX: number,
  containerWidth: number
): DateTick[] {
  const plotWidth = Math.max(0, containerWidth - PRICE_AXIS_WIDTH);
  if (plotWidth === 0 || data.length === 0) return [];
  const slotWidth = BASE_SLOT_WIDTH * scale;
  const anchors = [18, plotWidth / 2, Math.max(18, plotWidth - 18)];
  const seen = new Set<number>();

  return anchors.flatMap((x, position) => {
    const index = Math.round((x - translateX - slotWidth / 2) / slotWidth);
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    if (seen.has(safeIndex)) return [];
    seen.add(safeIndex);
    return [{
      key: `${position}-${safeIndex}`,
      label: formatShortDate(String(data[safeIndex].time)),
      x,
    }];
  });
}

/**
 * Spike Phase 1 : chandelles et SMA 20 en Skia natif. Le rendu et les
 * gestes continus restent sur le thread UI ; le thread React ne reçoit
 * qu'un nouvel index de bougie ou la plage finale après un geste.
 */
export function CandleChart({
  data,
  sma,
  height = 340,
}: {
  data: OHLCV[];
  sma?: TimeValue[];
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, data.length - 1));
  const [dateTicks, setDateTicks] = useState<DateTick[]>([]);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);
  const pinchFocalX = useSharedValue(0);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(PLOT_TOP);
  const crosshairIndex = useSharedValue(-1);
  const crosshairActive = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);

  const plotWidth = Math.max(0, width - PRICE_AXIS_WIDTH);
  const plotBottom = height - DATE_AXIS_HEIGHT;
  const plotHeight = Math.max(1, plotBottom - PLOT_TOP);

  const { min: priceMin, max: priceMax } = useMemo(
    () => data.reduce(
      (acc, d) => ({ min: Math.min(acc.min, d.low), max: Math.max(acc.max, d.high) }),
      { min: Infinity, max: -Infinity }
    ),
    [data]
  );
  const pricePad = Math.max(1, (priceMax - priceMin) * 0.08);
  const yLo = priceMin - pricePad;
  const yHi = priceMax + pricePad;

  const smaValues = useMemo(() => {
    const byTime = new Map((sma ?? []).map((point) => [String(point.time), point.value]));
    return data.map((bar) => byTime.get(String(bar.time)) ?? null);
  }, [data, sma]);

  const priceTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => ({
      key: index,
      price: yHi - ((yHi - yLo) * index) / 4,
      y: PLOT_TOP + (plotHeight * index) / 4,
    })),
    [plotHeight, yHi, yLo]
  );

  const selectedBar = data[selectedIndex] ?? data[data.length - 1];

  const syncDateTicks = useCallback(
    (nextScale: number, nextTranslateX: number, nextWidth: number) => {
      setDateTicks(makeDateTicks(data, nextScale, nextTranslateX, nextWidth));
    },
    [data]
  );

  const priceToY = (price: number) => {
    "worklet";
    return PLOT_TOP + (1 - (price - yLo) / (yHi - yLo)) * plotHeight;
  };

  const minTranslateFor = (nextScale: number) => {
    "worklet";
    const totalWidth = data.length * BASE_SLOT_WIDTH * nextScale;
    return Math.min(0, plotWidth - totalWidth);
  };

  function buildCandlePath(direction: "up" | "down") {
    "worklet";
    const path = Skia.Path.Make();
    if (plotWidth === 0) return path;
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const halfWidth = Math.max(1, slotWidth * 0.34);
    const startIndex = Math.max(0, Math.floor(-translateX.value / slotWidth) - 1);
    const endIndex = Math.min(data.length, startIndex + Math.ceil(plotWidth / slotWidth) + 2);

    for (let index = startIndex; index < endIndex; index++) {
      const bar = data[index];
      const isUp = bar.close >= bar.open;
      if ((direction === "up") !== isUp) continue;
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      path.moveTo(x, priceToY(bar.high));
      path.lineTo(x, priceToY(bar.low));
      const openY = priceToY(bar.open);
      const closeY = priceToY(bar.close);
      const top = Math.min(openY, closeY);
      const bottom = Math.max(openY, closeY);
      path.addRect({
        x: x - halfWidth,
        y: top,
        width: halfWidth * 2,
        height: Math.max(1, bottom - top),
      });
    }
    return path;
  }

  const upPath = useDerivedValue(() => buildCandlePath("up"), [data, plotWidth, plotHeight]);
  const downPath = useDerivedValue(() => buildCandlePath("down"), [data, plotWidth, plotHeight]);

  const smaPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (plotWidth === 0) return path;
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    let started = false;
    for (let index = 0; index < data.length; index++) {
      const value = smaValues[index];
      if (value === null) continue;
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      if (x < -slotWidth || x > plotWidth + slotWidth) {
        started = false;
        continue;
      }
      const y = priceToY(value);
      if (!started) {
        path.moveTo(x, y);
        started = true;
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [data, plotWidth, plotHeight, smaValues]);

  const crosshairPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!crosshairActive.value || plotWidth === 0) return path;
    path.moveTo(crosshairX.value, PLOT_TOP);
    path.lineTo(crosshairX.value, plotBottom);
    path.moveTo(0, crosshairY.value);
    path.lineTo(plotWidth, crosshairY.value);
    return path;
  }, [plotWidth, plotBottom]);

  const tooltipStyle = useAnimatedStyle(() => {
    const left = crosshairX.value < plotWidth / 2
      ? Math.max(8, plotWidth - TOOLTIP_WIDTH - 8)
      : 8;
    return {
      opacity: tooltipOpacity.value,
      transform: [{ translateX: left }],
    };
  }, [plotWidth]);

  const selectCrosshair = (x: number, y: number) => {
    "worklet";
    if (plotWidth === 0) return;
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const index = Math.round((clamp(x, 0, plotWidth) - translateX.value - slotWidth / 2) / slotWidth);
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    const candleX = safeIndex * slotWidth + translateX.value + slotWidth / 2;
    crosshairX.value = clamp(candleX, 0, plotWidth);
    crosshairY.value = clamp(y, PLOT_TOP, plotBottom);
    if (safeIndex !== crosshairIndex.value) {
      crosshairIndex.value = safeIndex;
      scheduleOnRN(setSelectedIndex, safeIndex);
    }
  };

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      cancelAnimation(translateX);
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      const minTranslate = minTranslateFor(scale.value);
      translateX.value = clamp(startTranslateX.value + event.translationX, minTranslate, 0);
    })
    .onEnd((event) => {
      const minTranslate = minTranslateFor(scale.value);
      translateX.value = withDecay(
        {
          velocity: event.velocityX,
          deceleration: 0.995,
          clamp: [minTranslate, 0],
          rubberBandEffect: false,
        },
        (finished) => {
          if (finished) scheduleOnRN(syncDateTicks, scale.value, translateX.value, width);
        }
      );
    });

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
      pinchFocalX.value = clamp(event.focalX, 0, plotWidth);
    })
    .onUpdate((event) => {
      const nextScale = clamp(startScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      const contentX = (pinchFocalX.value - startTranslateX.value) / startScale.value;
      const nextTranslate = pinchFocalX.value - contentX * nextScale;
      translateX.value = clamp(nextTranslate, minTranslateFor(nextScale), 0);
      scale.value = nextScale;
    })
    .onEnd(() => {
      const targetScale = clamp(scale.value, MIN_SCALE, MAX_SCALE);
      const targetTranslate = clamp(translateX.value, minTranslateFor(targetScale), 0);
      scale.value = withSpring(targetScale, SPRING);
      translateX.value = withSpring(targetTranslate, SPRING, (finished) => {
        if (finished) scheduleOnRN(syncDateTicks, targetScale, targetTranslate, width);
      });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(240)
    .onEnd(() => {
      const resetTranslate = minTranslateFor(1);
      scale.value = withSpring(1, SPRING);
      translateX.value = withSpring(resetTranslate, SPRING, (finished) => {
        if (finished) scheduleOnRN(syncDateTicks, 1, resetTranslate, width);
      });
      scheduleOnRN(triggerResetHaptic);
    });

  const longPress = Gesture.LongPress()
    .minDuration(320)
    .maxDistance(14)
    .onStart((event) => {
      crosshairActive.value = 1;
      tooltipOpacity.value = withTiming(1, { duration: 120 });
      selectCrosshair(event.x, event.y);
      scheduleOnRN(triggerSelectionHaptic);
    })
    .onTouchesMove((event) => {
      if (!crosshairActive.value) return;
      const touch = event.allTouches[0];
      if (touch) selectCrosshair(touch.x, touch.y);
    })
    .onFinalize(() => {
      crosshairActive.value = 0;
      tooltipOpacity.value = withTiming(0, { duration: 100 });
    });

  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    doubleTap,
    longPress
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={[styles.container, { height }]}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          const nextPlotWidth = Math.max(0, nextWidth - PRICE_AXIS_WIDTH);
          const initialTranslate = width === 0
            ? Math.min(0, nextPlotWidth - data.length * BASE_SLOT_WIDTH)
            : translateX.value;
          setWidth(nextWidth);
          if (width === 0) translateX.value = initialTranslate;
          syncDateTicks(scale.value, initialTranslate, nextWidth);
        }}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Path path={upPath} color={COLORS.up} style="stroke" strokeWidth={1} />
          <Path path={upPath} color={COLORS.up} style="fill" />
          <Path path={downPath} color={COLORS.down} style="stroke" strokeWidth={1} />
          <Path path={downPath} color={COLORS.down} style="fill" />
          <Path path={smaPath} color={COLORS.accent} style="stroke" strokeWidth={1.5} />
          <Path
            path={crosshairPath}
            color="rgba(250,250,250,0.42)"
            style="stroke"
            strokeWidth={StyleSheet.hairlineWidth}
          />
        </Canvas>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {priceTicks.map((tick) => (
            <View key={tick.key} style={[styles.gridLine, { top: tick.y, right: PRICE_AXIS_WIDTH }]} />
          ))}

          <View style={[styles.priceAxis, { width: PRICE_AXIS_WIDTH, bottom: DATE_AXIS_HEIGHT }]}>
            {priceTicks.map((tick) => (
              <Text key={tick.key} style={[styles.axisText, styles.priceLabel, { top: tick.y - 7 }]}>
                {formatPrice(tick.price)}
              </Text>
            ))}
          </View>

          <View style={[styles.dateAxis, { right: PRICE_AXIS_WIDTH, height: DATE_AXIS_HEIGHT }]}>
            {dateTicks.map((tick) => (
              <Text
                key={tick.key}
                numberOfLines={1}
                style={[styles.axisText, styles.dateLabel, { left: tick.x - 30 }]}
              >
                {tick.label}
              </Text>
            ))}
          </View>

          {selectedBar ? (
            <Animated.View style={[styles.tooltip, tooltipStyle]}>
              <View style={styles.tooltipHeader}>
                <Text style={styles.tooltipDate}>{formatDate(String(selectedBar.time))}</Text>
                <View style={styles.liveDot} />
              </View>
              <View style={styles.tooltipValues}>
                <Text style={styles.tooltipLabel}>O <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.open)}</Text></Text>
                <Text style={styles.tooltipLabel}>H <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.high)}</Text></Text>
                <Text style={styles.tooltipLabel}>L <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.low)}</Text></Text>
                <Text style={styles.tooltipLabel}>C <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.close)}</Text></Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.line,
  },
  priceAxis: {
    position: "absolute",
    right: 0,
    top: 0,
    borderLeftColor: COLORS.line,
    borderLeftWidth: 1,
    backgroundColor: COLORS.surface,
  },
  dateAxis: {
    position: "absolute",
    left: 0,
    bottom: 0,
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    backgroundColor: COLORS.surface,
  },
  axisText: {
    color: COLORS.ink3,
    fontSize: 9,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  priceLabel: {
    position: "absolute",
    right: 6,
  },
  dateLabel: {
    position: "absolute",
    top: 7,
    width: 60,
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    top: PLOT_TOP + 8,
    width: TOOLTIP_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.surface2,
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 7,
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tooltipDate: {
    color: COLORS.ink2,
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  tooltipValues: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tooltipLabel: {
    color: COLORS.ink3,
    fontSize: 9,
    fontWeight: "700",
  },
  tooltipNumber: {
    color: COLORS.ink,
    fontVariant: ["tabular-nums"],
  },
});
