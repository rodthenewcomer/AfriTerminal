"use client";

import { Star } from "lucide-react";
import { useWatchlist, useWatchlistHydrated } from "@/hooks/use-watchlist";
import { cn } from "@wariba/core/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function WatchlistButton({ ticker }: { ticker: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const hydrated = useWatchlistHydrated();
  const isWatched = useWatchlist((s) => s.lists.some((l) => l.tickers.includes(ticker)));
  const toggle = useWatchlist((s) => s.toggle);

  const watched = Boolean(session) && hydrated && isWatched;
  return (
    <Button
      variant={watched ? "accent" : "outline"}
      size="sm"
      onClick={() => {
        if (!session) {
          router.push(`/inscription?next=${encodeURIComponent(`/stocks/${ticker}`)}`);
          return;
        }
        toggle(ticker, "default");
      }}
      aria-pressed={watched}
      title={session ? "Ajouter ou retirer de votre watchlist synchronisée" : "Créez un compte gratuit pour suivre cette action"}
    >
      <Star className={cn("h-3.5 w-3.5", watched && "fill-current")} />
      {watched ? "Suivie" : session ? "Suivre" : "Se connecter pour suivre"}
    </Button>
  );
}
