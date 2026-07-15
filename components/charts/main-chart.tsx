"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Camera } from "lucide-react";
import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  createChart,
  createSeriesMarkers,
  createTextWatermark,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import type { ChartType, IndicatorId, OHLCV, Timeframe } from "@wariba/core/types";
import { seriesForTimeframe } from "@/lib/mock/series";
import {
  getRealQuote,
  isRealTicker,
  realIndexSeriesForTimeframe,
  realSeriesForTimeframe,
} from "@/lib/real-data";
import { getSnapshots } from "@/lib/data";
import {
  calculateATR,
  calculateBollingerBands,
  calculateEMA,
  calculateHeikinAshi,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateStochastic,
  calculateVWAP,
} from "@wariba/core/indicators";
import {
  adjustForDividends,
  adjustForRealDividends,
  CHART_COLORS,
  COMPARE_COLORS,
} from "@/lib/chart-utils";
import { dividendHistoryFor } from "@/lib/real-dividends";
import { operationsForTicker } from "@/lib/real-operations";
import { compactVolume, pct } from "@wariba/core/format";
import { useChartPrefs, useChartPrefsHydrated } from "@/hooks/use-chart-prefs";
import { rehydrateChartLevels, useChartLevels } from "@/hooks/use-chart-levels";
import { cn } from "@wariba/core/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartToolbar } from "./chart-toolbar";

const PRICE_FMT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const PRICE_FMT2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtPrice(p: number): string {
  return p < 100 ? PRICE_FMT2.format(p) : PRICE_FMT.format(p);
}

const NO_LEVELS: number[] = [];

const OVERLAYS: { id: "sma20" | "sma50" | "sma100" | "sma200"; period: number }[] = [
  { id: "sma20", period: 20 },
  { id: "sma50", period: 50 },
  { id: "sma100", period: 100 },
  { id: "sma200", period: 200 },
];

async function compareSeriesData(code: string, tf: Timeframe): Promise<OHLCV[]> {
  if (code === "BRVMC") {
    return realIndexSeriesForTimeframe("BRVMC", tf);
  }
  if (isRealTicker(code)) {
    return (await realSeriesForTimeframe(code, tf)).data;
  }
  return seriesForTimeframe(code, tf).data;
}

/**
 * Moteur de chart « instance conservée » : le chart n'est créé qu'une
 * fois par (ticker, thème, plein écran) — changer de période, de type,
 * d'indicateur ou d'échelle remplace seulement les séries, sans
 * reconstruire grille/axes ni perdre le zoom. C'est ce qui supprime le
 * flash à chaque toggle de l'ancienne implémentation.
 */
export function MainChart({ ticker }: { ticker: string }) {
  const [tf, setTf] = useState<Timeframe>("6M");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [indicators, setIndicators] = useState<IndicatorId[]>([]);
  const [showVolume, setShowVolume] = useState(true);
  const [adjusted, setAdjusted] = useState(false);
  const [logScale, setLogScale] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [noIntraday, setNoIntraday] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [levelsMode, setLevelsMode] = useState(false);
  useChartPrefsHydrated();
  useEffect(() => {
    void rehydrateChartLevels();
  }, []);
  // Sélecteur SANS `?? []` inline : un nouveau tableau à chaque snapshot
  // ferait boucler useSyncExternalStore (React #185) — le défaut est
  // une constante module.
  const levels = useChartLevels((s) => s.levels[ticker]) ?? NO_LEVELS;
  const removeLevel = useChartLevels((s) => s.remove);
  const clearLevels = useChartLevels((s) => s.clear);
  const { maColors, setMaColor, resetMaColors } = useChartPrefs();
  const isReal = isRealTicker(ticker);

  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType>[]>([]);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const barsRef = useRef<OHLCV[]>([]);
  const fitKeyRef = useRef<string>("");
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const levelsModeRef = useRef(false);
  levelsModeRef.current = levelsMode;
  const levelsRef = useRef<number[]>([]);
  levelsRef.current = levels;
  const { resolvedTheme } = useTheme();

  const [hasMarkers, setHasMarkers] = useState(false);
  const intraday = tf === "1D" || tf === "1W";
  const comparing = compare.length > 0 && !intraday;
  const indKey = [...indicators].sort().join(",");
  const cmpKey = compare.join(",");
  const maKey = JSON.stringify(maColors);

  const hasPanes =
    indicators.includes("rsi") ||
    indicators.includes("macd") ||
    indicators.includes("atr") ||
    indicators.includes("stoch");

  // ---- 1. Cycle de vie du chart (rare : ticker/thème/plein écran) ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dark = resolvedTheme !== "light";
    const ink2 = dark ? "#a1a1aa" : "#475569";
    const grid = dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)";
    const border = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.12)";

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: ink2,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: border, labelBackgroundColor: dark ? "#27272a" : "#334155" },
        horzLine: { color: border, labelBackgroundColor: dark ? "#27272a" : "#334155" },
      },
      rightPriceScale: { borderColor: "transparent" },
      timeScale: {
        borderColor: "transparent",
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 3,
      },
      localization: {
        locale: "fr-FR",
        priceFormatter: (p: number) => fmtPrice(p),
      },
    });

    // Filigrane du poste de travail — identité discrète, jamais gênante.
    createTextWatermark(chart.panes()[0], {
      horzAlign: "center",
      vertAlign: "center",
      lines: [
        {
          text: ticker,
          color: dark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.05)",
          fontSize: 72,
          fontStyle: "bold",
        },
      ],
    });

    // Légende OHLCV : abonnée UNE fois, lit les barres via ref — pas de
    // réabonnement à chaque changement de séries.
    const legend = legendRef.current;
    const renderLegend = (bar: OHLCV | undefined) => {
      if (!legend) return;
      if (!bar) {
        legend.textContent = "";
        return;
      }
      const chg = bar.open !== 0 ? ((bar.close - bar.open) / bar.open) * 100 : 0;
      const color = chg >= 0 ? CHART_COLORS.up : CHART_COLORS.down;
      legend.innerHTML =
        `<span style="opacity:.6">O</span> ${fmtPrice(bar.open)} ` +
        `<span style="opacity:.6">H</span> ${fmtPrice(bar.high)} ` +
        `<span style="opacity:.6">L</span> ${fmtPrice(bar.low)} ` +
        `<span style="opacity:.6">C</span> ${fmtPrice(bar.close)} ` +
        `<span style="color:${color}">${pct(chg)}</span> ` +
        `<span style="opacity:.6">Vol</span> ${compactVolume(bar.volume)}`;
    };
    const onMove = (param: MouseEventParams) => {
      const bars = barsRef.current;
      if (!param.time) {
        renderLegend(bars[bars.length - 1]);
        return;
      }
      renderLegend(bars.find((b) => b.time === param.time));
    };
    chart.subscribeCrosshairMove(onMove);

    // Pose/retrait de niveau au clic (mode « Niveau » de la toolbar).
    // Clic à moins de 0,6 % d'un niveau existant = suppression.
    const onClick = (param: MouseEventParams) => {
      if (!levelsModeRef.current || !param.point) return;
      const series = mainSeriesRef.current;
      if (!series) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price === null || price <= 0) return;
      const near = levelsRef.current.find(
        (p) => Math.abs(p - price) / price < 0.006
      );
      if (near !== undefined) {
        useChartLevels.getState().remove(ticker, near);
      } else {
        useChartLevels.getState().add(ticker, Math.round(price));
      }
    };
    chart.subscribeClick(onClick);

    // Double-clic n'importe où sur le chart : recadrage (standard 2026).
    const onDblClick = () => chart.timeScale().fitContent();
    el.addEventListener("dblclick", onDblClick);

    chartRef.current = chart;
    seriesRef.current = [];
    markersRef.current = null;
    fitKeyRef.current = "";
    setEpoch((e) => e + 1);

    return () => {
      chart.unsubscribeCrosshairMove(onMove);
      chart.unsubscribeClick(onClick);
      el.removeEventListener("dblclick", onDblClick);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = [];
      markersRef.current = null;
    };
  }, [ticker, resolvedTheme, fullscreen]);

  // ---- 2. Échelle (log/%) : appliquée à chaud, sans toucher aux séries ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.priceScale("right").applyOptions({
      mode: comparing
        ? PriceScaleMode.Percentage
        : logScale
          ? PriceScaleMode.Logarithmic
          : PriceScaleMode.Normal,
    });
  }, [epoch, comparing, logScale]);

  // ---- 3. Données & séries : remplacées sans recréer le chart ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    let cancelled = false;
    setNoIntraday(false);

    (async () => {
      const raw = isReal
        ? (await realSeriesForTimeframe(ticker, tf)).data
        : seriesForTimeframe(ticker, tf).data;
      if (cancelled || chartRef.current !== chart) return;

      // purge des séries précédentes (les price lines et marqueurs
      // attachés meurent avec elles)
      markersRef.current?.detach();
      markersRef.current = null;
      for (const s of seriesRef.current) chart.removeSeries(s);
      seriesRef.current = [];

      if (raw.length === 0) {
        barsRef.current = [];
        if (isReal && intraday) setNoIntraday(true);
        setReady(true);
        return;
      }

      const bars = !adjusted || intraday
        ? raw
        : isReal
          ? adjustForRealDividends(ticker, raw)
          : adjustForDividends(ticker, raw);

      const compareData = comparing
        ? await Promise.all(compare.map((code) => compareSeriesData(code, tf)))
        : [];
      if (cancelled || chartRef.current !== chart) return;

      const track = <T extends ISeriesApi<SeriesType>>(s: T): T => {
        seriesRef.current.push(s);
        return s;
      };
      const toTime = (t: string | number): Time => t as Time;

      chart.timeScale().applyOptions({ timeVisible: intraday });
      chart.priceScale("right").applyOptions({
        scaleMargins: { top: 0.08, bottom: showVolume && !comparing ? 0.22 : 0.08 },
      });

      let mainSeries: ISeriesApi<SeriesType>;
      if (comparing || chartType === "line") {
        mainSeries = track(
          chart.addSeries(LineSeries, {
            color: CHART_COLORS.accent,
            lineWidth: 2,
            priceLineVisible: !comparing,
          })
        );
        mainSeries.setData(bars.map((b) => ({ time: toTime(b.time), value: b.close })));
      } else if (chartType === "area") {
        mainSeries = track(
          chart.addSeries(AreaSeries, {
            lineColor: CHART_COLORS.accent,
            topColor: "rgba(226,166,61,0.22)",
            bottomColor: "rgba(226,166,61,0.02)",
            lineWidth: 2,
          })
        );
        mainSeries.setData(bars.map((b) => ({ time: toTime(b.time), value: b.close })));
      } else if (chartType === "baseline") {
        // Base = première clôture de la période : vert au-dessus du point
        // d'entrée, rouge en dessous — lecture « performance » immédiate.
        mainSeries = track(
          chart.addSeries(BaselineSeries, {
            baseValue: { type: "price", price: bars[0].close },
            topLineColor: CHART_COLORS.up,
            topFillColor1: "rgba(34,197,94,0.20)",
            topFillColor2: "rgba(34,197,94,0.02)",
            bottomLineColor: CHART_COLORS.down,
            bottomFillColor1: "rgba(239,68,68,0.02)",
            bottomFillColor2: "rgba(239,68,68,0.20)",
            lineWidth: 2,
          })
        );
        mainSeries.setData(bars.map((b) => ({ time: toTime(b.time), value: b.close })));
      } else if (chartType === "bars") {
        mainSeries = track(
          chart.addSeries(BarSeries, {
            upColor: CHART_COLORS.up,
            downColor: CHART_COLORS.down,
            thinBars: false,
          })
        );
        mainSeries.setData(
          bars.map((b) => ({ time: toTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close }))
        );
      } else {
        const candleData = chartType === "heikin-ashi" ? calculateHeikinAshi(bars) : bars;
        mainSeries = track(
          chart.addSeries(CandlestickSeries, {
            upColor: CHART_COLORS.up,
            downColor: CHART_COLORS.down,
            borderUpColor: CHART_COLORS.up,
            borderDownColor: CHART_COLORS.down,
            wickUpColor: "rgba(34,197,94,0.6)",
            wickDownColor: "rgba(239,68,68,0.6)",
          })
        );
        mainSeries.setData(
          candleData.map((b) => ({ time: toTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close }))
        );
      }

      if (comparing) {
        compareData.forEach((data, i) => {
          const s = track(
            chart.addSeries(LineSeries, {
              color: COMPARE_COLORS[i % COMPARE_COLORS.length],
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: true,
            })
          );
          s.setData(data.map((b) => ({ time: toTime(b.time), value: b.close })));
        });
      }

      if (showVolume && !comparing) {
        const vol = track(
          chart.addSeries(HistogramSeries, {
            priceScaleId: "volume",
            priceFormat: { type: "volume" },
            priceLineVisible: false,
            lastValueVisible: false,
          })
        );
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        vol.setData(
          bars.map((b) => ({
            time: toTime(b.time),
            value: b.volume,
            color: b.close >= b.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
          }))
        );
      }

      if (!comparing) {
        for (const ov of OVERLAYS) {
          if (!indicators.includes(ov.id)) continue;
          const s = track(
            chart.addSeries(LineSeries, {
              color: maColors[ov.id],
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            })
          );
          s.setData(calculateSMA(bars, ov.period).map((p) => ({ time: toTime(p.time), value: p.value })));
        }
        if (indicators.includes("ema20")) {
          const s = track(
            chart.addSeries(LineSeries, {
              color: maColors.ema20,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            })
          );
          s.setData(calculateEMA(bars, 20).map((p) => ({ time: toTime(p.time), value: p.value })));
        }
        if (indicators.includes("vwap")) {
          const s = track(
            chart.addSeries(LineSeries, {
              color: "#2dd4bf",
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: "VWAP",
            })
          );
          s.setData(calculateVWAP(bars).map((p) => ({ time: toTime(p.time), value: p.value })));
        }
        if (indicators.includes("bollinger")) {
          const bb = calculateBollingerBands(bars);
          const styles = [
            { band: bb.middle, color: "rgba(139,92,246,0.9)" },
            { band: bb.upper, color: "rgba(139,92,246,0.35)" },
            { band: bb.lower, color: "rgba(139,92,246,0.35)" },
          ];
          for (const { band, color } of styles) {
            const s = track(
              chart.addSeries(LineSeries, {
                color,
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              })
            );
            s.setData(band.map((p) => ({ time: toTime(p.time), value: p.value })));
          }
        }
      }

      // Panneaux séparés
      let paneIndex = 1;
      if (indicators.includes("rsi") && !comparing) {
        const rsi = track(
          chart.addSeries(
            LineSeries,
            { color: CHART_COLORS.violet, lineWidth: 2, priceLineVisible: false, title: "RSI 14" },
            paneIndex
          )
        );
        rsi.setData(calculateRSI(bars).map((p) => ({ time: toTime(p.time), value: p.value })));
        rsi.createPriceLine({ price: 70, color: "rgba(239,68,68,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        rsi.createPriceLine({ price: 30, color: "rgba(34,197,94,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        chart.panes()[paneIndex]?.setHeight(90);
        paneIndex++;
      }
      if (indicators.includes("macd") && !comparing) {
        const { macd, signal, histogram } = calculateMACD(bars);
        const hist = track(
          chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, paneIndex)
        );
        hist.setData(
          histogram.map((p) => ({
            time: toTime(p.time),
            value: p.value,
            color: p.value >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
          }))
        );
        const macdLine = track(
          chart.addSeries(
            LineSeries,
            { color: CHART_COLORS.accent, lineWidth: 1, priceLineVisible: false, title: "MACD 12-26-9" },
            paneIndex
          )
        );
        macdLine.setData(macd.map((p) => ({ time: toTime(p.time), value: p.value })));
        const sigLine = track(
          chart.addSeries(
            LineSeries,
            { color: CHART_COLORS.warn, lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
            paneIndex
          )
        );
        sigLine.setData(signal.map((p) => ({ time: toTime(p.time), value: p.value })));
        chart.panes()[paneIndex]?.setHeight(90);
        paneIndex++;
      }
      if (indicators.includes("atr") && !comparing) {
        const atr = track(
          chart.addSeries(
            LineSeries,
            { color: "#fb923c", lineWidth: 1, priceLineVisible: false, title: "ATR 14" },
            paneIndex
          )
        );
        atr.setData(calculateATR(bars).map((p) => ({ time: toTime(p.time), value: p.value })));
        chart.panes()[paneIndex]?.setHeight(80);
        paneIndex++;
      }
      if (indicators.includes("stoch") && !comparing) {
        const { k, d } = calculateStochastic(bars);
        const kLine = track(
          chart.addSeries(
            LineSeries,
            { color: "#38bdf8", lineWidth: 1, priceLineVisible: false, title: "Stoch %K" },
            paneIndex
          )
        );
        kLine.setData(k.map((p) => ({ time: toTime(p.time), value: p.value })));
        const dLine = track(
          chart.addSeries(
            LineSeries,
            { color: "#ec4899", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
            paneIndex
          )
        );
        dLine.setData(d.map((p) => ({ time: toTime(p.time), value: p.value })));
        kLine.createPriceLine({ price: 80, color: "rgba(239,68,68,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        kLine.createPriceLine({ price: 20, color: "rgba(34,197,94,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        chart.panes()[paneIndex]?.setHeight(90);
        paneIndex++;
      }

      // Lignes de référence réelles : clôture veille + bornes 52 semaines
      const quote = isReal ? getRealQuote(ticker) : undefined;
      if (quote && !comparing && !intraday) {
        const refLine = (price: number, title: string, color: string, style: LineStyle) =>
          mainSeries.createPriceLine({
            price,
            color,
            lineWidth: 1,
            lineStyle: style,
            axisLabelVisible: false,
            title,
          });
        refLine(quote.prevClose, "veille", "rgba(148,163,184,0.5)", LineStyle.Dashed);
        refLine(quote.week52High, "52s haut", "rgba(34,197,94,0.35)", LineStyle.Dotted);
        refLine(quote.week52Low, "52s bas", "rgba(239,68,68,0.35)", LineStyle.Dotted);
      }

      // Marqueurs d'événements : dividendes (D + montant) et opérations (S)
      if (isReal && !intraday && !comparing && typeof bars[0]?.time === "string") {
        const first = bars[0].time as string;
        const last = bars[bars.length - 1].time as string;
        const snap = (d: string) => {
          const later = bars.find((b) => (b.time as string) >= d);
          return later ? (later.time as string) : null;
        };
        const markers: SeriesMarker<Time>[] = [];
        for (const ev of dividendHistoryFor(ticker)) {
          if (ev.date < first || ev.date > last) continue;
          const t = snap(ev.date);
          if (!t) continue;
          markers.push({
            time: t as Time,
            position: "belowBar",
            color: CHART_COLORS.gold,
            shape: "circle",
            text: `D ${fmtPrice(ev.net)}`,
          });
        }
        for (const op of operationsForTicker(ticker)) {
          if (!op.date || op.date < first || op.date > last) continue;
          const t = snap(op.date);
          if (!t) continue;
          markers.push({
            time: t as Time,
            position: "aboveBar",
            color: CHART_COLORS.violet,
            shape: "square",
            text: "S",
          });
        }
        if (markers.length > 0) {
          markers.sort((a, b) => String(a.time).localeCompare(String(b.time)));
          markersRef.current = createSeriesMarkers(mainSeries, markers);
        }
        setHasMarkers(markers.length > 0);
      } else {
        setHasMarkers(false);
      }

      // Niveaux utilisateur (supports/résistances) — recréés avec la série
      for (const price of levelsRef.current) {
        mainSeries.createPriceLine({
          price,
          color: "rgba(226,166,61,0.8)",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "niveau",
        });
      }

      mainSeriesRef.current = mainSeries;
      barsRef.current = bars;
      // fitContent seulement quand l'instrument/la fenêtre change — pas
      // quand on togglise un indicateur (le zoom de l'utilisateur reste).
      const fitKey = `${ticker}|${tf}|${adjusted}|${comparing}`;
      if (fitKey !== fitKeyRef.current) {
        chart.timeScale().fitContent();
        fitKeyRef.current = fitKey;
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, tf, chartType, indKey, showVolume, adjusted, cmpKey, comparing, maKey, levels.join(",")]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  // Raccourcis clavier du poste de travail : F plein écran, L log,
  // V volume — ignorés quand un champ de saisie a le focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") setFullscreen((v) => !v);
      else if (e.key === "l" || e.key === "L") setLogScale((v) => !v);
      else if (e.key === "v" || e.key === "V") setShowVolume((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const compareOptions = useMemo(
    () => [
      { code: "BRVMC", label: "BRVM Composite" },
      ...getSnapshots()
        .filter((s) => s.ticker !== ticker)
        .map((s) => ({ code: s.ticker, label: `${s.ticker} — ${s.name}` })),
    ],
    [ticker]
  );

  const exportPng = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
    a.download = `${ticker}-${tf}-wariba.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const chartUi = (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5",
        fullscreen && "fixed inset-0 z-50 bg-background p-3 sm:p-5"
      )}
    >
      <ChartToolbar
        tf={tf}
        onTf={setTf}
        chartType={chartType}
        onChartType={setChartType}
        indicators={indicators}
        onIndicators={setIndicators}
        showVolume={showVolume}
        onShowVolume={setShowVolume}
        adjusted={adjusted}
        onAdjusted={setAdjusted}
        logScale={logScale}
        onLogScale={setLogScale}
        levelsMode={levelsMode}
        onLevelsMode={setLevelsMode}
        levels={levels}
        onRemoveLevel={(p) => removeLevel(ticker, p)}
        onClearLevels={() => clearLevels(ticker)}
        compare={compare}
        onCompare={setCompare}
        compareOptions={compareOptions}
        intraday={intraday}
        comparing={comparing}
        isReal={isReal}
        maColors={maColors}
        onMaColor={setMaColor}
        onResetMaColors={resetMaColors}
        fullscreen={fullscreen}
        onFullscreen={setFullscreen}
      />
      {comparing ? (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS.accent }} />
            {ticker}
          </span>
          {compare.map((code, i) => (
            <span key={code} className="inline-flex items-center gap-1.5 text-ink-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
              />
              {code === "BRVMC" ? "BRVM Composite" : code}
            </span>
          ))}
          <span className="text-ink-3">· échelle en %</span>
        </div>
      ) : null}
      <div
        className={cn(
          "relative w-full rounded-xl border border-line bg-surface/40 overflow-hidden",
          fullscreen && "min-h-0 flex-1"
        )}
        style={fullscreen ? undefined : { height: hasPanes ? 560 : 440 }}
      >
        {!ready ? <Skeleton className="absolute inset-2" /> : null}
        {ready && noIntraday ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-sm text-ink-3">
              Historique intraday non disponible sur les données réelles BRVM
              (le bulletin quotidien ne publie qu&apos;ouverture/clôture).
              Choisissez 1M ou plus.
            </p>
          </div>
        ) : null}
        <div
          ref={legendRef}
          className="pointer-events-none absolute left-3 top-2 z-10 text-[11px] num text-ink-2"
        />
        {levelsMode ? (
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[11px] font-medium text-accent">
            Cliquez pour poser un niveau — recliquez dessus pour le retirer
          </div>
        ) : null}
        <button
          onClick={exportPng}
          title="Exporter le graphique en image PNG"
          aria-label="Exporter le graphique en PNG"
          className="absolute right-2 top-2 z-10 rounded-lg border border-line bg-surface/80 p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
        <div
          ref={containerRef}
          className={cn("h-full w-full", levelsMode && "cursor-crosshair")}
        />
      </div>
      {hasMarkers ? (
        <p className="text-[10px] text-ink-3">
          <span style={{ color: CHART_COLORS.gold }}>●</span> D = dividende net
          payé · <span style={{ color: CHART_COLORS.violet }}>■</span> S =
          opération sur capital · double-clic : recadrer · touches F/L/V :
          plein écran, échelle log, volume
        </p>
      ) : null}
    </div>
  );

  if (fullscreen && typeof document !== "undefined") {
    return createPortal(chartUi, document.body);
  }
  return chartUi;
}
