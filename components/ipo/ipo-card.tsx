"use client";

import { useState } from "react";
import { AlertTriangle, Lightbulb, Rocket, Sparkles } from "lucide-react";
import type { IPOItem } from "@/lib/types";
import { dateFr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

const STATUS_TONE: Record<IPOItem["status"], "positive" | "accent" | "neutral" | "warning"> = {
  "En cours": "positive",
  "À venir": "accent",
  "À l'étude": "neutral",
  "Clôturée": "warning",
};

// Le champ `date` a un sens différent selon le statut : sans préfixe,
// "En cours · 20 juil. 2026" se lisait comme un début dans le futur pour
// une opération censée être déjà ouverte. Clarifie ce que la date
// représente pour chaque statut.
const STATUS_DATE_PREFIX: Record<IPOItem["status"], string> = {
  "En cours": "Clôture le",
  "À venir": "Prévue le",
  "À l'étude": "Échéance visée :",
  "Clôturée": "Clôturée le",
};

function ipoDateLabel(ipo: IPOItem): string {
  return `${STATUS_DATE_PREFIX[ipo.status]} ${dateFr(ipo.date)}`;
}

export function IPOCard({ ipo, featured }: { ipo: IPOItem; featured?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className={featured ? "relative overflow-hidden border-accent/25" : undefined}>
        {featured ? (
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        ) : null}
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5 text-accent" />
              {ipo.name}
            </span>
          }
          subtitle={`${ipo.kind} · ${ipoDateLabel(ipo)}`}
          action={<Badge tone={STATUS_TONE[ipo.status]}>{ipo.status}</Badge>}
        />
        <CardBody className="space-y-3.5">
          <p className="text-xs leading-relaxed text-ink-2">{ipo.summary}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ipo.metrics.slice(0, featured ? 7 : 3).map((m, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface-2/60 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-ink-3">{m.label}</p>
                <p className="num mt-0.5 text-sm font-semibold text-ink">{m.value}</p>
              </div>
            ))}
          </div>
          <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Analyser l&apos;opération
          </Button>
        </CardBody>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <div className="p-5 sm:p-6 space-y-4">
          <header className="pr-8">
            <h2 className="text-base font-semibold text-ink">{ipo.name}</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              {ipo.kind} · {ipoDateLabel(ipo)} · {ipo.status}
            </p>
          </header>
          <p className="text-sm leading-relaxed text-ink-2">{ipo.summary}</p>
          <div className="grid grid-cols-2 gap-2">
            {ipo.metrics.map((m, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface-2/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-3">{m.label}</p>
                <p className="num mt-0.5 text-sm font-semibold text-ink">{m.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-up/20 bg-up/5 p-3.5">
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-up">
              <Lightbulb className="h-3.5 w-3.5" /> Opportunité
            </p>
            <p className="text-xs leading-relaxed text-ink-2">{ipo.opportunity}</p>
          </div>
          <div className="rounded-xl border border-warn/20 bg-warn/5 p-3.5">
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-warn">
              <AlertTriangle className="h-3.5 w-3.5" /> Risques
            </p>
            <p className="text-xs leading-relaxed text-ink-2">{ipo.risk}</p>
          </div>
          <p className="border-t border-line pt-3 text-[10px] text-ink-3">
            Scénario pédagogique simulé, distinct des avis officiels BRVM.
            Ceci n&apos;est pas un conseil en investissement.
          </p>
        </div>
      </Dialog>
    </>
  );
}
