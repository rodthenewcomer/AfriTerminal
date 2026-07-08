"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import type { ChartType, IndicatorId, OHLCV, Timeframe } from "@/lib/types";
import { seriesForTimeframe, getIndexSeries } from "@/lib/mock/series";
import { isRealTicker, realSeriesForTimeframe } from "@/lib/real-data";
import { STOCKS } from "@/lib/mock/stocks";
import {
  calculateBollingerBands,
  calculateEMA,
  calculateHeikinAshi,
  calculateMACD,
  calculateRSI,
  calculateSMA,
} from "@/lib/indicators";
import { adjustForDividends, CHART_COLORS, COMPARE_COLORS } from "@/lib/chart-utils";
import { compactVolume, pct } from "@/lib/format";
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

const OVERLAYS: { id: IndicatorId; period: number; color: string }[] = [
  { id: "sma20", period: 20, color: CHART_COLORS.sma20 },
  { id: "sma50", period: 50, color: CHART_COLORS.sma50 },
  { id: "sma100", period: 100, color: CHART_COLORS.sma100 },
  { id: "sma200", period: 200, color: CHART_COLORS.sma200 },
];

/** L'indice BRVM Composite reste synthétique (pas encore de pipeline réel dédié aux indices). */
async function compareSeriesData(code: string, tf: Timeframe): Promise<OHLCV[]> {
  if (code === "BRVMC") {
    const daily = getIndexSeries("BRVMC", 291.4, 0.14);
    const ref = seriesForTimeframe(STOCKS[0].ticker, tf).data.length;
    return daily.slice(-ref);
  }
  if (isRealTicker(code)) {
    return (await realSeriesForTimeframe(code, tf)).data;
  }
  return seriesForTimeframe(code, tf).data;
}

export function MainChart({ ticker }: { ticker: string }) {
  const [tf, setTf] = useState<Timeframe>("6M");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [indicators, setIndicators] = useState<IndicatorId[]>([]);
  const [showVolume, setShowVolume] = useState(true);
  const [adjusted, setAdjusted] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [noIntraday, setNoIntraday] = useState(false);
  const isReal = isRealTicker(ticker);

  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const intraday = tf === "1D" || tf === "1W";
  const comparing = compare.length > 0 && !intraday;
  const indKey = [...indicators].sort().join(",");
  const cmpKey = compare.join(",");

  const hasPanes = indicators.includes("rsi") || indicators.includes("macd");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let chart: IChartApi | null = null;
    let onMove: ((param: MouseEventParams) => void) | null = null;
    setReady(false);
    setNoIntraday(false);

    async function run() {
      const raw = isReal
        ? (await realSeriesForTimeframe(ticker, tf)).data
        : seriesForTimeframe(ticker, tf).data;
      if (cancelled) return;

      if (isReal && intraday && raw.length === 0) {
        setNoIntraday(true);
        setReady(true);
        return;
      }
      if (raw.length === 0) {
        setReady(true);
        return;
      }

      const bars = adjusted && !intraday ? adjustForDividends(ticker, raw) : raw;

      const compareData = comparing
        ? await Promise.all(compare.map((code) => compareSeriesData(code, tf)))
        : [];
      if (cancelled) return;

      const dark = resolvedTheme !== "light";
      const ink2 = dark ? "#94a3b8" : "#475569";
      const grid = dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)";
      const border = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.12)";

      const c = createChart(el!, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: ink2,
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: grid },
          horzLines: { color: grid },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: border, labelBackgroundColor: dark ? "#1e293b" : "#334155" },
          horzLine: { color: border, labelBackgroundColor: dark ? "#1e293b" : "#334155" },
        },
        rightPriceScale: {
          borderColor: "transparent",
          mode: comparing ? PriceScaleMode.Percentage : PriceScaleMode.Normal,
          scaleMargins: { top: 0.08, bottom: showVolume && !comparing ? 0.22 : 0.08 },
        },
        timeScale: {
          borderColor: "transparent",
          timeVisible: intraday,
          secondsVisible: false,
          rightOffset: 3,
        },
        localization: {
          locale: "fr-FR",
          priceFormatter: (p: number) => fmtPrice(p),
        },
      });
      chart = c;

      const toTime = (t: string | number): Time => t as Time;
      let mainSeries: ISeriesApi<SeriesType>;

      if (comparing || chartType === "line") {
        mainSeries = c.addSeries(LineSeries, {
          color: CHART_COLORS.accent,
          lineWidth: 2,
          priceLineVisible: !comparing,
        });
        mainSeries.setData(bars.map((b) => ({ time: toTime(b.time), value: b.close })));
      } else if (chartType === "area") {
        mainSeries = c.addSeries(AreaSeries, {
          lineColor: CHART_COLORS.accent,
          topColor: "rgba(56,189,248,0.25)",
          bottomColor: "rgba(56,189,248,0.02)",
          lineWidth: 2,
        });
        mainSeries.setData(bars.map((b) => ({ time: toTime(b.time), value: b.close })));
      } else if (chartType === "bars") {
        mainSeries = c.addSeries(BarSeries, {
          upColor: CHART_COLORS.up,
          downColor: CHART_COLORS.down,
          thinBars: false,
        });
        mainSeries.setData(
          bars.map((b) => ({
            time: toTime(b.time),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }))
        );
      } else {
        const candleData = chartType === "heikin-ashi" ? calculateHeikinAshi(bars) : bars;
        mainSeries = c.addSeries(CandlestickSeries, {
          upColor: CHART_COLORS.up,
          downColor: CHART_COLORS.down,
          borderUpColor: CHART_COLORS.up,
          borderDownColor: CHART_COLORS.down,
          wickUpColor: "rgba(34,197,94,0.6)",
          wickDownColor: "rgba(239,68,68,0.6)",
        });
        mainSeries.setData(
          candleData.map((b) => ({
            time: toTime(b.time),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }))
        );
      }

      // Comparaison (mode pourcentage)
      if (comparing) {
        compareData.forEach((data, i) => {
          const s = c.addSeries(LineSeries, {
            color: COMPARE_COLORS[i % COMPARE_COLORS.length],
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(data.map((b) => ({ time: toTime(b.time), value: b.close })));
        });
      }

      // Volume
      if (showVolume && !comparing) {
        const vol = c.addSeries(HistogramSeries, {
          priceScaleId: "volume",
          priceFormat: { type: "volume" },
          priceLineVisible: false,
          lastValueVisible: false,
        });
        c.priceScale("volume").applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
        });
        vol.setData(
          bars.map((b) => ({
            time: toTime(b.time),
            value: b.volume,
            color:
              b.close >= b.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
          }))
        );
      }

      // Overlays (SMA / EMA / Bollinger)
      if (!comparing) {
        for (const ov of OVERLAYS) {
          if (!indicators.includes(ov.id)) continue;
          const s = c.addSeries(LineSeries, {
            color: ov.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(
            calculateSMA(bars, ov.period).map((p) => ({
              time: toTime(p.time),
              value: p.value,
            }))
          );
        }
        if (indicators.includes("ema20")) {
          const s = c.addSeries(LineSeries, {
            color: CHART_COLORS.ema20,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          s.setData(
            calculateEMA(bars, 20).map((p) => ({ time: toTime(p.time), value: p.value }))
          );
        }
        if (indicators.includes("bollinger")) {
          const bb = calculateBollingerBands(bars);
          for (const band of [bb.upper, bb.middle, bb.lower]) {
            const s = c.addSeries(LineSeries, {
              color: "rgba(139,92,246,0.5)",
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            s.setData(band.map((p) => ({ time: toTime(p.time), value: p.value })));
          }
        }
      }

      // Panneaux séparés : RSI / MACD
      let paneIndex = 1;
      if (indicators.includes("rsi") && !comparing) {
        const rsi = c.addSeries(
          LineSeries,
          { color: CHART_COLORS.violet, lineWidth: 2, priceLineVisible: false },
          paneIndex
        );
        rsi.setData(
          calculateRSI(bars).map((p) => ({ time: toTime(p.time), value: p.value }))
        );
        rsi.createPriceLine({ price: 70, color: "rgba(239,68,68,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        rsi.createPriceLine({ price: 30, color: "rgba(34,197,94,0.4)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        c.panes()[paneIndex]?.setHeight(90);
        paneIndex++;
      }
      if (indicators.includes("macd") && !comparing) {
        const { macd, signal, histogram } = calculateMACD(bars);
        const hist = c.addSeries(
          HistogramSeries,
          { priceLineVisible: false, lastValueVisible: false },
          paneIndex
        );
        hist.setData(
          histogram.map((p) => ({
            time: toTime(p.time),
            value: p.value,
            color: p.value >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
          }))
        );
        const macdLine = c.addSeries(
          LineSeries,
          { color: CHART_COLORS.accent, lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
          paneIndex
        );
        macdLine.setData(macd.map((p) => ({ time: toTime(p.time), value: p.value })));
        const sigLine = c.addSeries(
          LineSeries,
          { color: CHART_COLORS.warn, lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
          paneIndex
        );
        sigLine.setData(signal.map((p) => ({ time: toTime(p.time), value: p.value })));
        c.panes()[paneIndex]?.setHeight(90);
        paneIndex++;
      }

      // Légende OHLCV custom
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
      renderLegend(bars[bars.length - 1]);

      const byTime = new Map(bars.map((b) => [b.time, b]));
      onMove = (param: MouseEventParams) => {
        if (!param.time) {
          renderLegend(bars[bars.length - 1]);
          return;
        }
        renderLegend(byTime.get(param.time as string | number));
      };
      c.subscribeCrosshairMove(onMove);
      c.timeScale().fitContent();
      setReady(true);
    }

    run();

    return () => {
      cancelled = true;
      if (chart) {
        if (onMove) chart.unsubscribeCrosshairMove(onMove);
        chart.remove();
      }
    };
  }, [
    ticker,
    tf,
    chartType,
    indKey,
    showVolume,
    adjusted,
    cmpKey,
    comparing,
    intraday,
    isReal,
    resolvedTheme,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  const compareOptions = useMemo(
    () => [
      { code: "BRVMC", label: "BRVM Composite" },
      ...STOCKS.filter((s) => s.ticker !== ticker).map((s) => ({
        code: s.ticker,
        label: `${s.ticker} — ${s.name}`,
      })),
    ],
    [ticker]
  );

  return (
    <div className="flex flex-col gap-2.5">
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
        compare={compare}
        onCompare={setCompare}
        compareOptions={compareOptions}
        intraday={intraday}
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
        className="relative w-full rounded-xl border border-line bg-surface/40 overflow-hidden"
        style={{ height: hasPanes ? 560 : 440 }}
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
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
