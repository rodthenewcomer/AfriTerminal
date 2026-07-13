import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { OHLCV } from "@afriterminal/core/types";
import { colors, radius } from "../../theme";
import { LWC_RUNTIME } from "./lwc-runtime";

export interface WebChartOverlay {
  id: string;
  color: string;
  dashed?: boolean;
  data: { time: string; value: number }[];
}

export interface WebChartPanes {
  rsi?: { time: string; value: number }[];
  macd?: { macd: { time: string; value: number }[]; signal: { time: string; value: number }[]; histogram: { time: string; value: number }[] };
  atr?: { time: string; value: number }[];
  stoch?: { k: { time: string; value: number }[]; d: { time: string; value: number }[] };
}

export interface WebChartMarker {
  time: string;
  kind: "dividend" | "operation";
  label: string;
}

export interface WebChartPayload {
  ticker: string;
  chartType: string;
  bars: OHLCV[];
  overlays: WebChartOverlay[];
  panes: WebChartPanes;
  referenceLines: { price: number; title: string; color: string; dashed: boolean }[];
  levels: number[];
  markers: WebChartMarker[];
  logarithmic: boolean;
  percentMode: boolean;
  levelMode: boolean;
  fit: boolean;
}

/**
 * Pont vers le moteur du site web : la même librairie lightweight-charts,
 * le même thème (main-chart.tsx), rendue dans une WebView hors-ligne.
 * Toute la logique (indicateurs, périodes, stores) reste côté natif ;
 * la page ne fait que dessiner ce qu'on lui envoie.
 */
const BRIDGE = `
(function () {
  var LWC = window.LightweightCharts;
  var container = document.getElementById("c");
  var fmt0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  function fmtPrice(p) { return (Math.abs(p) < 100 ? fmt2 : fmt0).format(p); }
  function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }

  var chart = LWC.createChart(container, {
    autoSize: true,
    layout: {
      background: { type: LWC.ColorType.Solid, color: "transparent" },
      textColor: "#a1a1aa",
      fontSize: 11.5,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: "rgba(255,255,255,0.05)" },
      horzLines: { color: "rgba(255,255,255,0.05)" },
    },
    crosshair: {
      mode: LWC.CrosshairMode.Magnet,
      vertLine: { color: "rgba(255,255,255,0.10)", labelBackgroundColor: "#27272a" },
      horzLine: { color: "rgba(255,255,255,0.10)", labelBackgroundColor: "#27272a" },
    },
    rightPriceScale: { borderColor: "transparent" },
    timeScale: { borderColor: "transparent", timeVisible: false, secondsVisible: false, rightOffset: 4, minBarSpacing: 1 },
    localization: { locale: "fr-FR", priceFormatter: fmtPrice },
    handleScroll: { pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
  });

  var tracked = [];
  var watermark = null;
  var markersPlugin = null;
  var mainSeries = null;
  var levelMode = false;
  var lastDataKey = "";

  function track(series) { tracked.push(series); return series; }

  chart.subscribeClick(function (param) {
    if (!levelMode || !param.point || !mainSeries) return;
    var price = mainSeries.coordinateToPrice(param.point.y);
    if (price !== null && isFinite(price)) post({ type: "levelTap", price: price });
  });

  window.__shoot = function () {
    try { post({ type: "png", dataUrl: chart.takeScreenshot().toDataURL("image/png") }); }
    catch (err) { post({ type: "error", message: String(err) }); }
  };

  window.__render = function (payload) {
    try {
      levelMode = !!payload.levelMode;
      tracked.forEach(function (series) { try { chart.removeSeries(series); } catch (e) {} });
      tracked = [];
      if (markersPlugin) { try { markersPlugin.detach(); } catch (e) {} markersPlugin = null; }

      var bars = payload.bars;
      var toLine = function (b) { return { time: b.time, value: b.close }; };

      chart.priceScale("right").applyOptions({
        mode: payload.percentMode ? LWC.PriceScaleMode.Percentage : payload.logarithmic ? LWC.PriceScaleMode.Logarithmic : LWC.PriceScaleMode.Normal,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      });

      if (payload.chartType === "line") {
        mainSeries = track(chart.addSeries(LWC.LineSeries, { color: "#e2a63d", lineWidth: 2, priceLineVisible: true }));
        mainSeries.setData(bars.map(toLine));
      } else if (payload.chartType === "area") {
        mainSeries = track(chart.addSeries(LWC.AreaSeries, {
          lineColor: "#e2a63d", topColor: "rgba(226,166,61,0.22)", bottomColor: "rgba(226,166,61,0.02)", lineWidth: 2,
        }));
        mainSeries.setData(bars.map(toLine));
      } else if (payload.chartType === "baseline") {
        mainSeries = track(chart.addSeries(LWC.BaselineSeries, {
          baseValue: { type: "price", price: bars.length ? bars[0].close : 0 },
          topLineColor: "#22c55e", topFillColor1: "rgba(34,197,94,0.20)", topFillColor2: "rgba(34,197,94,0.02)",
          bottomLineColor: "#ef4444", bottomFillColor1: "rgba(239,68,68,0.02)", bottomFillColor2: "rgba(239,68,68,0.20)",
          lineWidth: 2,
        }));
        mainSeries.setData(bars.map(toLine));
      } else if (payload.chartType === "bars") {
        mainSeries = track(chart.addSeries(LWC.BarSeries, { upColor: "#22c55e", downColor: "#ef4444", thinBars: false }));
        mainSeries.setData(bars);
      } else {
        mainSeries = track(chart.addSeries(LWC.CandlestickSeries, {
          upColor: "#22c55e", downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "rgba(34,197,94,0.75)", wickDownColor: "rgba(239,68,68,0.75)",
          priceLineColor: "rgba(226,166,61,0.55)",
        }));
        mainSeries.setData(bars);
      }

      var volume = track(chart.addSeries(LWC.HistogramSeries, {
        priceScaleId: "volume", priceFormat: { type: "volume" },
        priceLineVisible: false, lastValueVisible: false,
      }));
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volume.setData(bars.map(function (b) {
        return { time: b.time, value: b.volume, color: b.close >= b.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)" };
      }));

      payload.overlays.forEach(function (overlay) {
        var series = track(chart.addSeries(LWC.LineSeries, {
          color: overlay.color, lineWidth: 1,
          lineStyle: overlay.dashed ? LWC.LineStyle.Dashed : LWC.LineStyle.Solid,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        }));
        series.setData(overlay.data);
      });

      var paneIndex = 1;
      if (payload.panes.rsi) {
        var rsi = track(chart.addSeries(LWC.LineSeries, { color: "#8b5cf6", lineWidth: 2, priceLineVisible: false, title: "RSI 14" }, paneIndex));
        rsi.setData(payload.panes.rsi);
        rsi.createPriceLine({ price: 70, color: "rgba(239,68,68,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        rsi.createPriceLine({ price: 30, color: "rgba(34,197,94,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        var rsiPane = chart.panes()[paneIndex]; if (rsiPane) rsiPane.setHeight(90);
        paneIndex++;
      }
      if (payload.panes.macd) {
        var hist = track(chart.addSeries(LWC.HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, paneIndex));
        hist.setData(payload.panes.macd.histogram.map(function (p) {
          return { time: p.time, value: p.value, color: p.value >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)" };
        }));
        var macdLine = track(chart.addSeries(LWC.LineSeries, { color: "#e2a63d", lineWidth: 1, priceLineVisible: false, title: "MACD 12-26-9" }, paneIndex));
        macdLine.setData(payload.panes.macd.macd);
        var signalLine = track(chart.addSeries(LWC.LineSeries, { color: "#fb923c", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex));
        signalLine.setData(payload.panes.macd.signal);
        var macdPane = chart.panes()[paneIndex]; if (macdPane) macdPane.setHeight(90);
        paneIndex++;
      }
      if (payload.panes.atr) {
        var atr = track(chart.addSeries(LWC.LineSeries, { color: "#fb923c", lineWidth: 1, priceLineVisible: false, title: "ATR 14" }, paneIndex));
        atr.setData(payload.panes.atr);
        var atrPane = chart.panes()[paneIndex]; if (atrPane) atrPane.setHeight(80);
        paneIndex++;
      }
      if (payload.panes.stoch) {
        var kLine = track(chart.addSeries(LWC.LineSeries, { color: "#38bdf8", lineWidth: 1, priceLineVisible: false, title: "Stoch %K" }, paneIndex));
        kLine.setData(payload.panes.stoch.k);
        var dLine = track(chart.addSeries(LWC.LineSeries, { color: "#ec4899", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, paneIndex));
        dLine.setData(payload.panes.stoch.d);
        kLine.createPriceLine({ price: 80, color: "rgba(239,68,68,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        kLine.createPriceLine({ price: 20, color: "rgba(34,197,94,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        var stochPane = chart.panes()[paneIndex]; if (stochPane) stochPane.setHeight(90);
        paneIndex++;
      }

      payload.referenceLines.forEach(function (line) {
        mainSeries.createPriceLine({
          price: line.price, color: line.color, lineWidth: 1,
          lineStyle: line.dashed ? LWC.LineStyle.Dashed : LWC.LineStyle.Dotted,
          axisLabelVisible: false, title: line.title,
        });
      });
      payload.levels.forEach(function (price) {
        mainSeries.createPriceLine({
          price: price, color: "rgba(226,166,61,0.8)", lineWidth: 1,
          lineStyle: LWC.LineStyle.Solid, axisLabelVisible: true, title: "niveau",
        });
      });

      if (payload.markers.length && bars.length) {
        var first = bars[0].time, last = bars[bars.length - 1].time;
        var snap = function (d) {
          for (var i = 0; i < bars.length; i++) if (bars[i].time >= d) return bars[i].time;
          return null;
        };
        var markers = [];
        payload.markers.forEach(function (event) {
          if (event.time < first || event.time > last) return;
          var t = snap(event.time);
          if (!t) return;
          markers.push(event.kind === "dividend"
            ? { time: t, position: "belowBar", color: "#d2a13c", shape: "circle", text: event.label }
            : { time: t, position: "aboveBar", color: "#8b5cf6", shape: "square", text: event.label });
        });
        if (markers.length) {
          markers.sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
          markersPlugin = LWC.createSeriesMarkers(mainSeries, markers);
        }
      }

      if (watermark) { try { watermark.detach(); } catch (e) {} }
      watermark = LWC.createTextWatermark(chart.panes()[0], {
        horzAlign: "center", vertAlign: "center",
        lines: [{ text: payload.ticker, color: "rgba(255,255,255,0.045)", fontSize: 72, fontStyle: "bold" }],
      });

      var dataKey = payload.ticker + "|" + payload.chartType + "|" + bars.length + "|" +
        (bars.length ? bars[0].time + "|" + bars[bars.length - 1].time : "");
      if (payload.fit || dataKey !== lastDataKey) {
        var candleLike = payload.chartType === "candlestick" || payload.chartType === "heikin-ashi" || payload.chartType === "bars";
        if (candleLike && bars.length > 90) {
          chart.timeScale().setVisibleLogicalRange({ from: bars.length - 80, to: bars.length + 4 });
        } else {
          chart.timeScale().fitContent();
        }
      }
      lastDataKey = dataKey;
      post({ type: "ready" });
    } catch (err) {
      post({ type: "error", message: String(err && err.message ? err.message : err) });
    }
  };

  post({ type: "boot" });
})();
`;

function buildHtml(): string {
  return [
    "<!doctype html><html><head>",
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>',
    "<style>html,body{margin:0;padding:0;background:#111113;overscroll-behavior:none}#c{position:absolute;inset:0}</style>",
    "</head><body><div id=\"c\"></div>",
    "<script>", LWC_RUNTIME, "</script>",
    "<script>", BRIDGE, "</script>",
    "</body></html>",
  ].join("");
}

export interface WebChartHandle {
  /** Demande une capture PNG au moteur (partagée via la feuille système). */
  shoot: () => void;
}

export const WebChart = forwardRef<WebChartHandle, {
  payload: WebChartPayload;
  height: number;
  onLevelTap?: (price: number) => void;
}>(function WebChart({ payload, height, onLevelTap }, handleRef) {
  const webRef = useRef<WebView>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  useImperativeHandle(handleRef, () => ({
    shoot: () => { webRef.current?.injectJavaScript("window.__shoot(); true;"); },
  }), []);
  const bootedRef = useRef(false);
  const html = useMemo(buildHtml, []);

  const send = useCallback((next: WebChartPayload) => {
    webRef.current?.injectJavaScript(`window.__render(${JSON.stringify(next)}); true;`);
  }, []);

  useEffect(() => {
    if (bootedRef.current) send(payload);
  }, [payload, send]);

  const sharePng = useCallback(async (dataUrl: string) => {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;
    const uri = `${FileSystem.cacheDirectory}${payload.ticker}-chart.png`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: `${payload.ticker} · AfriTerminal` });
  }, [payload.ticker]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type: string; price?: number; dataUrl?: string; message?: string };
      if (message.type === "boot") {
        bootedRef.current = true;
        send(payload);
      } else if (message.type === "ready") {
        setBridgeError(null);
        setEngineReady(true);
      } else if (message.type === "levelTap" && typeof message.price === "number") {
        onLevelTap?.(message.price);
      } else if (message.type === "png" && message.dataUrl) {
        void sharePng(message.dataUrl);
      } else if (message.type === "error" && message.message) {
        setBridgeError(message.message);
      }
    } catch {
      // Message non JSON — ignoré.
    }
  }, [onLevelTap, payload, send, sharePng]);

  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        ref={webRef}
        source={{ html }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        scrollEnabled={false}
        overScrollMode="never"
        nestedScrollEnabled={false}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        javaScriptCanOpenWindowsAutomatically={false}
        style={styles.web}
      />
      {!engineReady && !bridgeError ? (
        <View style={styles.booting}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.bootingText}>Préparation du graphique…</Text>
        </View>
      ) : null}
      {bridgeError ? <Text style={styles.error}>Erreur moteur chart : {bridgeError}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
    overflow: "hidden", backgroundColor: colors.surface,
  },
  web: { flex: 1, backgroundColor: "transparent" },
  booting: {
    ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: colors.surface,
  },
  bootingText: { color: colors.ink3, fontSize: 12 },
  error: {
    position: "absolute", left: 10, right: 10, bottom: 10,
    color: colors.warn, fontSize: 11, lineHeight: 15,
    backgroundColor: "rgba(9,9,11,0.9)", borderRadius: radius.sm, padding: 8,
  },
});
