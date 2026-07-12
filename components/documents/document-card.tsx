"use client";

import Link from "next/link";
import { Download, FileSearch, FileText } from "lucide-react";
import type { DocItem } from "@/lib/types";
import { dateFr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DataBasisBadge } from "@/components/ui/data-basis-badge";
import { Button } from "@/components/ui/button";

const TYPE_TONES: Record<DocItem["type"], "accent" | "gold" | "neutral" | "warning"> = {
  "Résultats": "accent",
  "États financiers": "accent",
  "Dividende": "gold",
  "AGO": "neutral",
  "IPO": "warning",
  "Communiqué": "neutral",
};

export function ImportanceBadge({ level }: { level: 1 | 2 | 3 }) {
  if (level === 3) return <Badge tone="negative">Critique</Badge>;
  if (level === 2) return <Badge tone="warning">Important</Badge>;
  return <Badge tone="neutral">Info</Badge>;
}

export function DocumentCard({
  doc,
  onOpen,
  showTicker = true,
}: {
  doc: DocItem;
  onOpen: (doc: DocItem) => void;
  showTicker?: boolean;
}) {
  return (
    <article className="card-glass p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={TYPE_TONES[doc.type]}>{doc.type}</Badge>
          <ImportanceBadge level={doc.importance} />
          <DataBasisBadge basis={doc.basis} />
          {showTicker ? (
            <Link
              href={`/stocks/${doc.ticker}`}
              className="text-[11px] font-bold text-accent hover:underline"
            >
              {doc.ticker}
            </Link>
          ) : null}
        </div>
        <time className="shrink-0 text-[11px] text-ink-3">{dateFr(doc.date)}</time>
      </div>

      <h3 className="text-sm font-semibold leading-snug text-ink">{doc.title}</h3>
      <p className="text-xs leading-relaxed text-ink-2 line-clamp-3">{doc.summary}</p>

      {doc.redFlags.length > 0 || doc.greenFlags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {doc.greenFlags.slice(0, 2).map((f, i) => (
            <Badge key={`g${i}`} tone="positive">{f}</Badge>
          ))}
          {doc.redFlags.slice(0, 2).map((f, i) => (
            <Badge key={`r${i}`} tone="negative">{f}</Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => onOpen(doc)}>
          <FileText className="h-3.5 w-3.5" /> Lire
        </Button>
        <Button size="sm" variant="accent" onClick={() => onOpen(doc)}>
          <FileSearch className="h-3.5 w-3.5" /> Analyser
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title="Téléchargement indisponible pour ce scénario"
          aria-label="Télécharger"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}
