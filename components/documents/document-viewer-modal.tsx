"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Sparkles, XCircle } from "lucide-react";
import type { DocItem } from "@/lib/types";
import { dateFr } from "@/lib/format";
import { STOCK_MAP } from "@/lib/mock/stocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ImportanceBadge } from "./document-card";

export function DocumentViewerModal({
  doc,
  onClose,
}: {
  doc: DocItem | null;
  onClose: () => void;
}) {
  const stock = doc ? STOCK_MAP.get(doc.ticker) : undefined;
  return (
    <Dialog open={doc !== null} onClose={onClose}>
      {doc ? (
        <div className="p-5 sm:p-6 space-y-5">
          <header className="space-y-2 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{doc.type}</Badge>
              <ImportanceBadge level={doc.importance} />
              {doc.basis === "réel" ? (
                <Badge tone="positive">Données réelles</Badge>
              ) : (
                <Badge tone="gold">Scénario illustratif</Badge>
              )}
              <span className="text-[11px] text-ink-3">{dateFr(doc.date)}</span>
            </div>
            <h2 className="text-base font-semibold leading-snug text-ink">
              {doc.title}
            </h2>
            {stock ? (
              <Link
                href={`/stocks/${doc.ticker}`}
                onClick={onClose}
                className="text-xs font-medium text-accent hover:underline"
              >
                {stock.name} · {stock.sector} · {stock.country}
              </Link>
            ) : null}
          </header>

          <section className="rounded-xl border border-accent/20 bg-accent/5 p-3.5">
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Résumé IA
            </p>
            <p className="text-sm leading-relaxed text-ink-2">{doc.summary}</p>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
              Points clés
            </p>
            <ul className="space-y-1.5 text-sm text-ink-2">
              {doc.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent">·</span>
                  {k}
                </li>
              ))}
            </ul>
          </section>

          {doc.figures.length > 0 ? (
            <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {doc.figures.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-line bg-surface-2/60 p-3"
                >
                  <p className="text-[10px] uppercase tracking-wide text-ink-3">
                    {f.label}
                  </p>
                  <p className="num mt-0.5 text-sm font-semibold text-ink">
                    {f.value}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          {(doc.greenFlags.length > 0 || doc.redFlags.length > 0) && (
            <section className="grid gap-3 sm:grid-cols-2">
              {doc.greenFlags.length > 0 ? (
                <div className="rounded-xl border border-up/20 bg-up/5 p-3">
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-up">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Signaux verts
                  </p>
                  <ul className="space-y-1 text-xs text-ink-2">
                    {doc.greenFlags.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {doc.redFlags.length > 0 ? (
                <div className="rounded-xl border border-down/20 bg-down/5 p-3">
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-down">
                    <XCircle className="h-3.5 w-3.5" /> Signaux rouges
                  </p>
                  <ul className="space-y-1 text-xs text-ink-2">
                    {doc.redFlags.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}

          <footer className="flex items-center justify-between border-t border-line pt-4">
            <p className="text-[10px] text-ink-3">Document simulé — démo produit.</p>
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3.5 w-3.5" /> Voir la source officielle
            </Button>
          </footer>
        </div>
      ) : null}
    </Dialog>
  );
}
