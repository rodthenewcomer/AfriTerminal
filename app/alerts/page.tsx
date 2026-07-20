"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, Briefcase, Eye, RotateCcw } from "lucide-react";
import { REAL_ALERTS } from "@/lib/real-alerts";
import type { AlertType } from "@wariba/core/types";
import { prioritizeCriticalAlerts } from "@wariba/core/alerts";
import { cn } from "@wariba/core/utils";
import { AlertCard } from "@/components/alerts/alert-card";
import { MyPriceAlerts } from "@/components/alerts/my-price-alerts";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { AccountValueGate } from "@/components/auth/account-value-gate";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePortfolio } from "@/hooks/use-portfolio";
import { computePositions } from "@wariba/core/portfolio";
import {
  useAlertPreferences,
  type AlertScope,
} from "@/hooks/use-alert-preferences";

const TYPE_FILTERS: { value: AlertType | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "prix", label: "Prix" },
  { value: "volume", label: "Volume" },
  { value: "dividende", label: "Dividendes" },
  { value: "fondamental", label: "Fondamentaux" },
  { value: "document", label: "Publications" },
];

export default function AlertsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [type, setType] = useState<AlertType | "all">("all");
  const lists = useWatchlist((state) => state.lists);
  const transactions = usePortfolio((state) => state.transactions);
  const {
    scope,
    importantOnly,
    hiddenTypes,
    setScope,
    setImportantOnly,
    hideType,
    showAllTypes,
  } = useAlertPreferences();
  const watchlistTickers = useMemo(
    () => new Set(lists.flatMap((list) => list.tickers)),
    [lists]
  );
  const portfolioTickers = useMemo(
    () =>
      new Set(
        computePositions(transactions)
          .filter((position) => position.quantity > 0)
          .map((position) => position.ticker)
      ),
    [transactions]
  );
  const personalTickers = useMemo(
    () => new Set([...watchlistTickers, ...portfolioTickers]),
    [portfolioTickers, watchlistTickers]
  );

  const filtered = useMemo(
    () => {
      const scopedTickers =
        scope === "watchlist"
          ? watchlistTickers
          : scope === "portfolio"
            ? portfolioTickers
            : personalTickers;
      return prioritizeCriticalAlerts(REAL_ALERTS).filter((alert) => {
        if (hiddenTypes.includes(alert.type)) return false;
        if (type !== "all" && alert.type !== type) return false;
        if (importantOnly && alert.severity !== "critical" && alert.severity !== "warning") return false;
        if (scope !== "market" && (!alert.ticker || !scopedTickers.has(alert.ticker))) return false;
        return true;
      });
    },
    [
      hiddenTypes,
      importantOnly,
      personalTickers,
      portfolioTickers,
      scope,
      type,
      watchlistTickers,
    ]
  );

  if (!loading && !user) {
    return (
      <AccountValueGate
        title="Ce qui compte aujourd'hui pour vos actions"
        description="Ajoutez des actions à votre watchlist ou votre portefeuille : WARIBA filtre automatiquement les publications, résultats, dividendes, volumes et mouvements qui vous concernent."
        next="/alerts"
        benefits={[
          "Priorité, raison et conséquence possible expliquées en français simple.",
          "Alertes séparées pour votre watchlist et vos sociétés réellement détenues.",
          "Lien direct vers le document officiel et notifications web, e-mail ou mobile.",
        ]}
      />
    );
  }

  const scopes: { value: AlertScope; label: string; icon: typeof Eye }[] = [
    { value: "personal", label: "Mes actions", icon: Eye },
    { value: "watchlist", label: "Ma watchlist", icon: Eye },
    { value: "portfolio", label: "Mon portefeuille", icon: Briefcase },
    { value: "market", label: "Tout le marché", icon: BellPlus },
  ];

  return (
    <div className="space-y-4 stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Ce qui compte aujourd&apos;hui pour mes actions
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Publications, prix, volumes, dividendes et fondamentaux détectés dans
            les sources officielles, puis filtrés selon votre watchlist et votre
            portefeuille. Factuel — jamais un conseil.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          title="Ouvrez une fiche action puis utilisez l'icône d'alerte."
          onClick={() => router.push("/screener")}
        >
          <BellPlus className="h-3.5 w-3.5" /> Choisir une action
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {scopes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setScope(value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
              scope === value
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-line bg-surface text-ink-2"
            )}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
        <label className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2">
          <input
            type="checkbox"
            checked={importantOnly}
            onChange={(event) => setImportantOnly(event.target.checked)}
            className="accent-accent"
          />
          Importantes seulement
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
              type === t.value
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {hiddenTypes.length ? (
        <button
          onClick={showAllTypes}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
        >
          <RotateCcw className="h-3 w-3" /> Réafficher {hiddenTypes.length} type
          {hiddenTypes.length > 1 ? "s" : ""} masqué{hiddenTypes.length > 1 ? "s" : ""}
        </button>
      ) : null}

      <MyPriceAlerts />

      {filtered.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucune alerte</p>
          <p className="mt-1 text-xs text-ink-3">
            {scope === "market"
              ? "Aucune alerte de ce type pour le moment."
              : "Ajoutez des actions à votre watchlist ou des transactions à votre portefeuille pour personnaliser ce flux."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {filtered.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              contextLabel={
                a.ticker && portfolioTickers.has(a.ticker)
                  ? "Portefeuille"
                  : a.ticker && watchlistTickers.has(a.ticker)
                    ? "Watchlist"
                    : undefined
              }
              onHideType={hideType}
            />
          ))}
        </div>
      )}
    </div>
  );
}
