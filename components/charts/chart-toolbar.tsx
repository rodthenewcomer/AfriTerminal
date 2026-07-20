"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GitCompareArrows, Maximize2, Minimize2, Ruler, SlidersHorizontal, Trash2 } from "lucide-react";
import type { ChartType, IndicatorId, Timeframe } from "@wariba/core/types";
import type { MaId } from "@/hooks/use-chart-prefs";
import { cn } from "@wariba/core/utils";
import { PillTabs } from "@/components/ui/tabs";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candlestick", label: "Bougies" },
  { value: "line", label: "Ligne" },
  { value: "area", label: "Aire" },
  { value: "baseline", label: "Baseline" },
  { value: "bars", label: "OHLC" },
  { value: "heikin-ashi", label: "Heikin Ashi" },
];

// colorable : les moyennes mobiles ont une pastille de couleur éditable
const INDICATORS: { id: IndicatorId; label: string; colorable?: MaId }[] = [
  { id: "sma20", label: "SMA 20", colorable: "sma20" },
  { id: "sma50", label: "SMA 50", colorable: "sma50" },
  { id: "sma100", label: "SMA 100", colorable: "sma100" },
  { id: "sma200", label: "SMA 200", colorable: "sma200" },
  { id: "ema20", label: "EMA 20", colorable: "ema20" },
  { id: "vwap", label: "VWAP" },
  { id: "bollinger", label: "Bandes de Bollinger" },
  { id: "rsi", label: "RSI 14" },
  { id: "macd", label: "MACD" },
  { id: "atr", label: "ATR 14" },
  { id: "stoch", label: "Stochastique 14-3" },
];

function Dropdown({
  label,
  icon,
  count,
  children,
}: {
  label: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors",
          count > 0
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
        )}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {count > 0 ? (
          <span className="rounded-full bg-accent/20 px-1.5 text-[10px]">{count}</span>
        ) : null}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1.5 max-h-80 w-56 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CheckItem({
  checked,
  label,
  onToggle,
  disabled,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs cursor-pointer disabled:opacity-40",
        checked ? "text-ink" : "text-ink-2 hover:bg-surface-2"
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded border",
          checked ? "border-accent bg-accent" : "border-line"
        )}
      >
        {checked ? (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
            <path d="M1.5 5.5l2.5 2.5 4.5-6" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

export interface ChartToolbarProps {
  tf: Timeframe;
  onTf: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartType: (t: ChartType) => void;
  indicators: IndicatorId[];
  onIndicators: (ids: IndicatorId[]) => void;
  showVolume: boolean;
  onShowVolume: (v: boolean) => void;
  adjusted: boolean;
  onAdjusted: (v: boolean) => void;
  logScale: boolean;
  onLogScale: (v: boolean) => void;
  levelsMode: boolean;
  onLevelsMode: (v: boolean) => void;
  levels: number[];
  onRemoveLevel: (price: number) => void;
  onClearLevels: () => void;
  comparing: boolean;
  isReal: boolean;
  compare: string[];
  onCompare: (codes: string[]) => void;
  compareOptions: { code: string; label: string }[];
  intraday: boolean;
  maColors: Record<MaId, string>;
  onMaColor: (id: MaId, color: string) => void;
  onResetMaColors: () => void;
  fullscreen: boolean;
  onFullscreen: (v: boolean) => void;
}

export function ChartToolbar(props: ChartToolbarProps) {
  const toggleIndicator = (id: IndicatorId) => {
    props.onIndicators(
      props.indicators.includes(id)
        ? props.indicators.filter((i) => i !== id)
        : [...props.indicators, id]
    );
  };
  const toggleCompare = (code: string) => {
    props.onCompare(
      props.compare.includes(code)
        ? props.compare.filter((c) => c !== code)
        : props.compare.length >= 4
          ? props.compare
          : [...props.compare, code]
    );
  };

  return (
    // Deux rangées délibérées (au lieu d'un flex-wrap imprévisible qui
    // empilait 3-4 lignes sur mobile) : timeframes + plein écran, puis
    // types de graphique + contrôles, chacune défilant horizontalement.
    // min-w-0 partout : sans lui, min-width:auto des enfants flex fait
    // grandir toute la colonne au lieu de laisser défiler à l'intérieur
    // (débordement horizontal de la page sur mobile).
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <PillTabs
          options={TIMEFRAMES.map((t) => ({ value: t, label: t }))}
          value={props.tf}
          onChange={props.onTf}
          label="Période du graphique"
          className="min-w-0 flex-1 sm:flex-none"
        />
        <button
          onClick={() => props.onFullscreen(!props.fullscreen)}
          title={props.fullscreen ? "Quitter le plein écran (Échap)" : "Plein écran"}
          aria-label={props.fullscreen ? "Quitter le plein écran" : "Plein écran"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface/60 text-ink-2 hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors",
            props.fullscreen && "hidden"
          )}
        >
          {props.fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        {/* Scroll horizontal isolé du groupe de droite : overflow-x-auto
            force overflow-y à auto (spec CSS), ce qui coupait net les
            menus déroulants Indicateurs/Comparer s'ils partageaient ce
            conteneur — leur panneau de ~270px se retrouvait rogné à la
            hauteur de la rangée (34px), invisible bien qu'ouvert. */}
        <div className="relative min-w-0 w-full sm:flex-1">
          <PillTabs
            options={CHART_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={props.chartType}
            onChange={props.onChartType}
            label="Type de graphique"
            className="min-w-0 snap-x"
          />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-5 rounded-r-lg bg-gradient-to-l from-surface-2/90 to-transparent sm:hidden" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0 sm:flex-nowrap">
        <button
          onClick={() => props.onShowVolume(!props.showVolume)}
          className={cn(
            "h-8 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors",
            props.showVolume
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-line bg-surface/60 text-ink-3 hover:bg-surface-2"
          )}
        >
          Vol
        </button>
        <button
          onClick={() => props.onAdjusted(!props.adjusted)}
          disabled={props.intraday}
          title={
            props.isReal
              ? "Cours ajustés des dividendes nets réels (bulletins officiels) — utile pour juger la performance totale"
              : "Cours ajustés des dividendes"
          }
          className={cn(
            "h-8 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors disabled:opacity-40",
            props.adjusted
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-line bg-surface/60 text-ink-3 hover:bg-surface-2"
          )}
        >
          Div. adj
        </button>
        <button
          onClick={() => props.onLogScale(!props.logScale)}
          disabled={props.comparing}
          title={
            props.comparing
              ? "Indisponible en comparaison (échelle en %)"
              : "Échelle logarithmique — les variations en % ont la même hauteur partout"
          }
          className={cn(
            "h-8 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors disabled:opacity-40",
            props.logScale
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-line bg-surface/60 text-ink-3 hover:bg-surface-2"
          )}
        >
          Log
        </button>
        <Dropdown
          label="Niveaux"
          icon={<Ruler className="h-3.5 w-3.5" />}
          count={props.levels.length}
        >
          <button
            onClick={() => props.onLevelsMode(!props.levelsMode)}
            className={cn(
              "mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs cursor-pointer",
              props.levelsMode ? "bg-accent/15 text-accent" : "text-ink-2 hover:bg-surface-2"
            )}
          >
            <Ruler className="h-3.5 w-3.5" />
            {props.levelsMode ? "Mode pose actif — cliquez le graphique" : "Poser un niveau au clic"}
          </button>
          {props.levels.length === 0 ? (
            <p className="px-2.5 py-1 text-[10px] text-ink-3">
              Vos supports/résistances, mémorisés pour ce titre.
            </p>
          ) : (
            <>
              {props.levels.map((price) => (
                <div key={price} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2">
                  <span className="num">{price.toLocaleString("fr-FR")} FCFA</span>
                  <button
                    onClick={() => props.onRemoveLevel(price)}
                    aria-label={`Retirer le niveau ${price}`}
                    className="rounded p-0.5 text-ink-3 hover:text-down cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={props.onClearLevels}
                className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
              >
                Tout effacer
              </button>
            </>
          )}
        </Dropdown>
        <Dropdown
          label="Indicateurs"
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          count={props.indicators.length}
        >
          {INDICATORS.map((ind) => (
            <div key={ind.id} className="flex items-center gap-1">
              <div className="flex-1">
                <CheckItem
                  label={ind.label}
                  checked={props.indicators.includes(ind.id)}
                  onToggle={() => toggleIndicator(ind.id)}
                />
              </div>
              {ind.colorable ? (
                <input
                  type="color"
                  value={props.maColors[ind.colorable]}
                  onChange={(e) => props.onMaColor(ind.colorable as MaId, e.target.value)}
                  title={`Couleur ${ind.label}`}
                  suppressHydrationWarning
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0"
                />
              ) : null}
            </div>
          ))}
          <button
            onClick={props.onResetMaColors}
            className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
          >
            Réinitialiser les couleurs
          </button>
        </Dropdown>
        <Dropdown
          label="Comparer"
          icon={<GitCompareArrows className="h-3.5 w-3.5" />}
          count={props.compare.length}
        >
          <p className="px-2.5 py-1 text-[10px] text-ink-3">
            {props.intraday
              ? "Indisponible en intraday — choisissez 1M ou plus."
              : "Jusqu'à 4 comparaisons, échelle en %."}
          </p>
          {props.compareOptions.map((opt) => (
            <CheckItem
              key={opt.code}
              label={opt.label}
              checked={props.compare.includes(opt.code)}
              onToggle={() => toggleCompare(opt.code)}
              disabled={props.intraday}
            />
          ))}
        </Dropdown>
        </div>
      </div>
    </div>
  );
}
