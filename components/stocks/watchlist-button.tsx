"use client";

import { Star } from "lucide-react";
import { useWatchlist, useWatchlistHydrated } from "@/hooks/use-watchlist";
import { cn } from "@wariba/core/utils";
import { Button } from "@/components/ui/button";

export function WatchlistButton({ ticker }: { ticker: string }) {
  const hydrated = useWatchlistHydrated();
  const isWatched = useWatchlist((s) => s.lists.some((l) => l.tickers.includes(ticker)));
  const toggle = useWatchlist((s) => s.toggle);

  const watched = hydrated && isWatched;
  return (
    <Button
      variant={watched ? "accent" : "outline"}
      size="sm"
      disabled={!hydrated}
      onClick={() => toggle(ticker, "default")}
      aria-pressed={watched}
    >
      <Star className={cn("h-3.5 w-3.5", watched && "fill-current")} />
      {watched ? "Suivie" : "Watchlist"}
    </Button>
  );
}
