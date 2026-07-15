"use client";

import type { MouseEvent } from "react";
import { Star } from "lucide-react";
import { useWatchlist, useWatchlistHydrated } from "@/hooks/use-watchlist";
import { cn } from "@wariba/core/utils";

/**
 * Étoile compacte pour suivre/retirer une valeur directement depuis un
 * tableau ou une carte — sans ouvrir la fiche. stopPropagation/
 * preventDefault car elle vit souvent DANS un lien de ligne.
 */
export function WatchlistStar({ ticker }: { ticker: string }) {
  const hydrated = useWatchlistHydrated();
  const isWatched = useWatchlist((s) =>
    s.lists.some((l) => l.tickers.includes(ticker))
  );
  const toggle = useWatchlist((s) => s.toggle);
  const watched = hydrated && isWatched;

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hydrated) return;
    toggle(ticker, "default");
  };

  return (
    <button
      onClick={onClick}
      disabled={!hydrated}
      aria-pressed={watched}
      aria-label={watched ? `Retirer ${ticker} de la watchlist` : `Suivre ${ticker}`}
      title={watched ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md cursor-pointer transition-colors disabled:opacity-50",
        watched
          ? "text-gold hover:bg-surface-2"
          : "text-ink-3/50 hover:bg-surface-2 hover:text-gold"
      )}
    >
      <Star className={cn("h-3.5 w-3.5", watched && "fill-current")} />
    </button>
  );
}
