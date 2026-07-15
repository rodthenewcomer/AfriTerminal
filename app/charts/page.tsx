"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Columns2,
  Copy,
  Grid2X2,
  Pencil,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { usePortfolio, usePortfolioHydrated } from "@/hooks/use-portfolio";
import { computePositions } from "@wariba/core/portfolio";
import {
  useChartLayouts,
  useChartLayoutsHydrated,
  type LayoutKind,
} from "@/hooks/use-chart-layouts";
import { cn } from "@wariba/core/utils";
import { Select } from "@/components/ui/input";
import { MainChart } from "@/components/charts/main-chart";

const LAYOUT_KINDS: { value: LayoutKind; label: string; icon: typeof Square }[] = [
  { value: 1, label: "1 graphique", icon: Square },
  { value: 2, label: "2 graphiques", icon: Columns2 },
  { value: 4, label: "4 graphiques", icon: Grid2X2 },
];

function LayoutSwitcher() {
  const layouts = useChartLayouts((s) => s.layouts);
  const activeId = useChartLayouts((s) => s.activeId);
  const setActive = useChartLayouts((s) => s.setActive);
  const create = useChartLayouts((s) => s.create);
  const rename = useChartLayouts((s) => s.rename);
  const duplicate = useChartLayouts((s) => s.duplicate);
  const remove = useChartLayouts((s) => s.remove);
  const active = layouts.find((l) => l.id === activeId) ?? layouts[0];

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
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface/60 px-2.5 text-xs font-medium text-ink-2 cursor-pointer transition-colors hover:bg-surface-2"
      >
        <span className="max-w-32 truncate">{active?.name ?? "Disposition"}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-3">
            Vos dispositions
          </p>
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {layouts.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-1.5 py-1",
                  l.id === activeId ? "bg-accent/10" : "hover:bg-surface-2"
                )}
              >
                <button
                  onClick={() => setActive(l.id)}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left text-xs font-medium cursor-pointer",
                    l.id === activeId ? "text-accent" : "text-ink-2"
                  )}
                >
                  {l.name}
                </button>
                <button
                  onClick={() => {
                    const name = window.prompt("Renommer la disposition :", l.name);
                    if (name?.trim()) rename(l.id, name.trim());
                  }}
                  aria-label={`Renommer ${l.name}`}
                  className="rounded-md p-1 text-ink-3 opacity-0 hover:bg-surface hover:text-ink cursor-pointer group-hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => duplicate(l.id)}
                  aria-label={`Dupliquer ${l.name}`}
                  className="rounded-md p-1 text-ink-3 opacity-0 hover:bg-surface hover:text-ink cursor-pointer group-hover:opacity-100"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {layouts.length > 1 ? (
                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer la disposition « ${l.name} » ?`)) remove(l.id);
                    }}
                    aria-label={`Supprimer ${l.name}`}
                    className="rounded-md p-1 text-ink-3 opacity-0 hover:bg-surface hover:text-down cursor-pointer group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const name = window.prompt("Nom de la nouvelle disposition :", `Disposition ${layouts.length + 1}`);
              if (name?.trim()) create(name.trim());
              setOpen(false);
            }}
            className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-line px-2 py-1.5 pt-2 text-xs font-medium text-accent cursor-pointer hover:bg-accent/10"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvelle disposition
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Graphiques multi-panneaux façon poste de travail : 1, 2 ou 4 charts
 * indépendants côte à côte (ticker, période, type, indicateurs propres à
 * chaque panneau). Dispositions multiples nommées, mémorisées dans le
 * navigateur — plus une seule mais autant que vous voulez.
 */
export default function ChartsPage() {
  const hydrated = useChartLayoutsHydrated();
  const layouts = useChartLayouts((s) => s.layouts);
  const activeId = useChartLayouts((s) => s.activeId);
  const updateLayout = useChartLayouts((s) => s.update);
  const active = layouts.find((l) => l.id === activeId) ?? layouts[0];

  const snapshots = getSnapshots();
  usePortfolioHydrated();
  const transactions = usePortfolio((s) => s.transactions);
  const held = new Set(
    computePositions(transactions)
      .filter((p) => p.quantity > 0)
      .map((p) => p.ticker)
  );
  const heldSnapshots = snapshots.filter((s) => held.has(s.ticker));

  const setKind = (kind: LayoutKind) => updateLayout(active.id, { kind });
  const setTickerAt = (i: number, t: string) =>
    updateLayout(active.id, { tickers: active.tickers.map((x, j) => (j === i ? t : x)) });

  return (
    <div className="stagger space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Graphiques
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-3">
            Votre poste d&apos;analyse : comparez jusqu&apos;à 4 valeurs côte à
            côte, chacune avec sa période, son type de graphique et ses
            indicateurs. Gardez plusieurs dispositions nommées — une par
            secteur suivi, par exemple.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hydrated ? <LayoutSwitcher /> : null}
          <div
            className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/60 p-0.5"
            role="radiogroup"
            aria-label="Nombre de panneaux"
          >
            {LAYOUT_KINDS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                role="radio"
                aria-checked={active.kind === value}
                title={label}
                onClick={() => setKind(value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium cursor-pointer transition-colors",
                  active.kind === value
                    ? "bg-surface text-ink shadow-sm border border-line"
                    : "text-ink-3 hover:text-ink"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          active.kind === 2 && "xl:grid-cols-2",
          active.kind === 4 && "xl:grid-cols-2"
        )}
      >
        {active.tickers.slice(0, active.kind).map((ticker, i) => (
          <div key={i} className="card-glass min-w-0 space-y-3 p-4">
            <Select
              value={ticker}
              onChange={(e) => setTickerAt(i, e.target.value)}
              className="w-full max-w-xs"
              aria-label={`Valeur du panneau ${i + 1}`}
            >
              {heldSnapshots.length > 0 ? (
                <optgroup label="Mon portefeuille">
                  {heldSnapshots.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} — {s.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Toute la cote">
                {snapshots.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} — {s.name}
                  </option>
                ))}
              </optgroup>
            </Select>
            <MainChart ticker={ticker} />
          </div>
        ))}
      </div>

      {/* Teaser Pro — honnête : les dispositions multiples sont livrées et
          gratuites ; seuls le dessin technique et le volume profile restent
          à l'étude. */}
      <div className="card-glass relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <p className="text-sm font-semibold text-ink">Et ensuite ?</p>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-2">
          Tracé de tendances obliques et volume profile sont à l&apos;étude
          pour une future offre Pro. Les dispositions sauvegardées multiples
          ci-dessus restent, elles, gratuites — comme tout le reste du site.
        </p>
      </div>
    </div>
  );
}
