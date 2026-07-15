"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus } from "lucide-react";
import { REAL_ALERTS } from "@/lib/real-alerts";
import type { AlertType } from "@wariba/core/types";
import { cn } from "@wariba/core/utils";
import { AlertCard } from "@/components/alerts/alert-card";
import { MyPriceAlerts } from "@/components/alerts/my-price-alerts";
import { Button } from "@/components/ui/button";

const TYPE_FILTERS: { value: AlertType | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "prix", label: "Prix" },
  { value: "volume", label: "Volume" },
  { value: "dividende", label: "Dividendes" },
  { value: "fondamental", label: "Fondamentaux" },
];

export default function AlertsPage() {
  const router = useRouter();
  const [type, setType] = useState<AlertType | "all">("all");

  const filtered = useMemo(
    () =>
      [...REAL_ALERTS]
        .sort((a, b) => b.time.localeCompare(a.time))
        .filter((a) => type === "all" || a.type === type),
    [type]
  );

  return (
    <div className="space-y-4 stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Alertes</h1>
          <p className="mt-1 text-sm text-ink-3">
            Détectées dans les bulletins officiels des 5 dernières séances :
            variations fortes, extrêmes 52 semaines, volumes inhabituels,
            dividendes, publications. Rien à configurer : générées
            automatiquement à chaque bulletin, pour savoir où regarder.
            Factuel — jamais un conseil.
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

      <MyPriceAlerts />

      {filtered.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucune alerte</p>
          <p className="mt-1 text-xs text-ink-3">
            Aucune alerte de ce type pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {filtered.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}
