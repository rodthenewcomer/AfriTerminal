"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { REAL_DOCUMENTS, type RealDocument } from "@/lib/real-documents";
import { dateFr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const TYPES: (RealDocument["type"] | "Tous")[] = [
  "Tous",
  "États financiers",
  "Résultats",
  "Dividende",
  "AGO",
  "Communiqué",
];

export default function DocumentsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]>("Tous");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return REAL_DOCUMENTS.filter(
      (d) =>
        (type === "Tous" || d.type === type) &&
        (!q || d.ticker.includes(q) || d.title.toUpperCase().includes(q))
    ).slice(0, 120);
  }, [type, query]);

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Documents</h1>
        <p className="mt-1 text-sm text-ink-3">
          {REAL_DOCUMENTS.length} publications officielles des sociétés cotées,
          référencées depuis brvm.org — chaque lien ouvre le PDF original.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
                type === t
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Input
          placeholder="Filtrer par ticker ou titre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-2.5">
        {filtered.map((d) => (
          <article key={d.url} className="min-w-0 card-glass flex items-start gap-3 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start justify-between gap-2"
              >
                <span className="text-sm font-semibold text-ink group-hover:text-accent">
                  {d.title}
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-accent" />
              </a>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Link
                  href={`/stocks/${d.ticker}`}
                  className="text-[11px] font-bold text-accent hover:underline"
                >
                  {d.ticker}
                </Link>
                <Badge tone="neutral">{d.type}</Badge>
                <time className="text-[11px] text-ink-3">{dateFr(d.date)}</time>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="text-[11px] text-ink-3">
        Source : fiches sociétés officielles de la BRVM, actualisées chaque
        semaine. Les documents appartiennent à leurs émetteurs.
      </p>
    </div>
  );
}
