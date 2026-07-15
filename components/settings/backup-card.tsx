"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { buildBackup, parseBackup } from "@/lib/backup";
import { usePortfolio, usePortfolioHydrated } from "@/hooks/use-portfolio";
import { useWatchlist, useWatchlistHydrated } from "@/hooks/use-watchlist";
import { useSavedFilters, useSavedFiltersHydrated } from "@/hooks/use-saved-filters";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

/**
 * Sauvegarde/restauration des données locales. Tout vit en localStorage :
 * un vidage de cache ou un changement d'appareil efface portefeuille,
 * watchlists et filtres — cette carte est la porte de sortie (et le
 * transfert d'appareil à appareil en attendant les comptes).
 */
export function BackupCard() {
  const portfolioHydrated = usePortfolioHydrated();
  const watchlistHydrated = useWatchlistHydrated();
  const filtersHydrated = useSavedFiltersHydrated();
  const hydrated = portfolioHydrated && watchlistHydrated && filtersHydrated;

  const transactions = usePortfolio((s) => s.transactions);
  const replaceTransactions = usePortfolio((s) => s.replaceAll);
  const lists = useWatchlist((s) => s.lists);
  const activeId = useWatchlist((s) => s.activeId);
  const replaceWatchlists = useWatchlist((s) => s.replaceAll);
  const saved = useSavedFilters((s) => s.saved);
  const replaceFilters = useSavedFilters((s) => s.replaceAll);

  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const doExport = () => {
    const backup = buildBackup({
      portfolio: transactions,
      watchlists: { lists, activeId },
      savedFilters: saved,
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wariba-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: "Sauvegarde téléchargée." });
  };

  const doImport = async (file: File) => {
    const res = parseBackup(await file.text());
    if (!res.ok) {
      setMessage({ tone: "error", text: res.error });
      return;
    }
    const { backup } = res;
    const confirmed = window.confirm(
      `Restaurer cette sauvegarde du ${backup.exportedAt.slice(0, 10)} ?\n\n` +
        `${backup.portfolio.length} transaction(s) de portefeuille\n` +
        `${backup.watchlists.lists.length} watchlist(s)\n` +
        `${backup.savedFilters.length} filtre(s) enregistré(s)\n\n` +
        "Vos données actuelles seront REMPLACÉES."
    );
    if (!confirmed) return;
    replaceTransactions(backup.portfolio);
    replaceWatchlists(backup.watchlists.lists, backup.watchlists.activeId);
    replaceFilters(backup.savedFilters);
    setMessage({ tone: "ok", text: "Sauvegarde restaurée." });
  };

  return (
    <Card>
      <CardHeader
        title="Sauvegarde de vos données"
        subtitle="Portefeuille, watchlists et filtres vivent uniquement dans ce navigateur — un vidage de cache les efface"
      />
      <CardBody className="space-y-3">
        <p className="text-xs leading-relaxed text-ink-2">
          Téléchargez un fichier de sauvegarde régulièrement, et pour passer
          d&apos;un appareil à l&apos;autre, restaurez-le sur le nouveau.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" size="sm" onClick={doExport} disabled={!hydrated}>
            <Download className="h-3.5 w-3.5" /> Télécharger la sauvegarde
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={!hydrated}
          >
            <Upload className="h-3.5 w-3.5" /> Restaurer un fichier
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {message ? (
          <p
            className={
              message.tone === "ok"
                ? "text-xs font-medium text-up"
                : "text-xs font-medium text-down"
            }
            role="status"
          >
            {message.text}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
