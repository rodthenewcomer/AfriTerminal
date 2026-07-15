"use client";

import Link from "next/link";
import { Plus, Star, Trash2 } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { getSeries } from "@/lib/mock/series";
import { fcfa, pct, ratio } from "@wariba/core/format";
import { useWatchlist, useWatchlistHydrated } from "@/hooks/use-watchlist";
import { cn } from "@wariba/core/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Sparkline } from "@/components/charts/sparkline";
import { PriceChange, SignalBadges } from "@/components/stocks/badges";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistPage() {
  const hydrated = useWatchlistHydrated();
  const { lists, activeId, setActive, toggle, createList, removeList } = useWatchlist();

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const active = lists.find((l) => l.id === activeId) ?? lists[0];
  const snapshots = getSnapshots();
  const watched = active
    ? snapshots.filter((s) => active.tickers.includes(s.ticker))
    : [];
  const others = snapshots.filter((s) => !active?.tickers.includes(s.ticker));

  return (
    <div className="space-y-4 stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Watchlist</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-3">
            Vos valeurs suivies, avec signaux et prochains dividendes. Pour en
            ajouter une, cliquez l&apos;étoile ☆ à côté de n&apos;importe
            quelle action (tableaux, fiches) — tout reste dans ce navigateur.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const name = window.prompt("Nom de la nouvelle liste :");
            if (name?.trim()) createList(name.trim());
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle liste
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActive(l.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
              l.id === active?.id
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
            )}
          >
            {l.name} <span className="opacity-60">({l.tickers.length})</span>
          </button>
        ))}
        {active && lists.length > 1 ? (
          <button
            onClick={() => removeList(active.id)}
            title="Supprimer la liste active"
            className="ml-1 rounded-full border border-line p-1.5 text-ink-3 hover:text-down hover:border-down/30 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {watched.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <Star className="mx-auto h-8 w-8 text-ink-3" />
          <p className="mt-3 text-sm font-medium text-ink">Liste vide</p>
          <p className="mt-1 text-xs text-ink-3">
            Ajoutez une valeur avec le sélecteur ci-dessous ou depuis une fiche
            action.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {watched.map((s) => (
            <div key={s.ticker} className="min-w-0 card-glass p-3.5">
              <div className="flex items-center gap-3">
                <Link
                  href={`/stocks/${s.ticker}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[9px] font-bold text-accent">
                    {s.ticker}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-ink-3">
                      {s.sector} · {s.country}
                    </span>
                  </span>
                </Link>
                <div className="hidden sm:block">
                  <Sparkline
                    data={s.real ? s.real.sparkline : getSeries(s.ticker).daily.slice(-30).map((d) => d.close)}
                    width={90}
                    height={30}
                  />
                </div>
                {/* Recherche en un coup d'œil : métriques réelles (les
                    anciens scores qualité/risque ne se rendaient jamais,
                    tout l'univers étant réel) */}
                <div className="hidden md:flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-3">PER</p>
                    <p className="num text-xs font-medium text-ink-2">
                      {s.per > 0 ? ratio(s.per) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-3">Rdt net</p>
                    <p className="num text-xs font-medium text-ink-2">
                      {pct(s.yieldNet, { signed: false, digits: 1 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-3">YTD</p>
                    <PriceChange value={s.ytdChange} className="text-xs" arrow={false} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold text-ink">{fcfa(s.lastPrice)}</p>
                  <PriceChange value={s.dayChange} className="text-xs" />
                </div>
                <button
                  onClick={() => toggle(s.ticker, active.id)}
                  title="Retirer de la liste"
                  className="rounded-lg p-1.5 text-gold hover:bg-surface-2 cursor-pointer"
                >
                  <Star className="h-4 w-4 fill-current" />
                </button>
              </div>
              {!s.real && s.signals.length > 0 ? (
                <div className="mt-2 pl-12">
                  <SignalBadges signals={s.signals} max={4} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && active ? (
        <div className="flex items-center gap-2">
          <Select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                toggle(e.target.value, active.id);
                e.target.value = "";
              }
            }}
            className="max-w-xs"
          >
            <option value="" disabled>
              Ajouter une valeur à « {active.name} »…
            </option>
            {others.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} — {s.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  );
}
