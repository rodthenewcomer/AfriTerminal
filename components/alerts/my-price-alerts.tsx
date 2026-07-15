"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, BellRing, Trash2 } from "lucide-react";
import {
  isTriggered,
  usePriceAlerts,
  usePriceAlertsHydrated,
} from "@/hooks/use-price-alerts";
import { getSnapshot } from "@/lib/data";
import { fcfa } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

/** Vos seuils personnels, évalués à l'ouverture contre le dernier cours
 * officiel — les franchis remontent en tête et sont surlignés. */
export function MyPriceAlerts() {
  const hydrated = usePriceAlertsHydrated();
  const alerts = usePriceAlerts((s) => s.alerts);
  const remove = usePriceAlerts((s) => s.remove);
  if (!hydrated || alerts.length === 0) return null;

  const evaluated = alerts
    .map((a) => {
      const last = getSnapshot(a.ticker)?.lastPrice ?? 0;
      return { ...a, last, hit: last > 0 && isTriggered(a, last) };
    })
    .sort((a, b) => Number(b.hit) - Number(a.hit));
  const hits = evaluated.filter((a) => a.hit).length;

  return (
    <Card className={hits > 0 ? "border-up/30" : undefined}>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5 text-accent" /> Mes alertes de prix
            {hits > 0 ? <Badge tone="positive">{hits} franchie{hits > 1 ? "s" : ""}</Badge> : null}
          </span>
        }
        subtitle="Seuils personnels vérifiés localement et, après synchronisation du compte, par le serveur de notifications."
      />
      <CardBody className="space-y-1.5">
        {evaluated.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs",
              a.hit ? "border-up/40 bg-up/10" : "border-line bg-surface/50"
            )}
          >
            <Link href={`/stocks/${a.ticker}`} className="font-bold text-accent hover:underline">
              {a.ticker}
            </Link>
            {a.direction === "above" ? (
              <ArrowUp className="h-3.5 w-3.5 text-up" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-down" />
            )}
            <span className="num text-ink-2">seuil {fcfa(a.threshold)}</span>
            <span className="num text-ink-3">cours {fcfa(a.last)}</span>
            {a.hit ? <Badge tone="positive">Franchi</Badge> : null}
            {a.channels?.includes("email") ? <Badge tone="neutral">E-mail</Badge> : null}
            {a.channels?.includes("push") ? <Badge tone="neutral">Push</Badge> : null}
            <button
              onClick={() => remove(a.id)}
              aria-label="Supprimer cette alerte"
              className="ml-auto rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-down cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
