"use client";

import { useMemo } from "react";
import { Bell, FileText, Newspaper } from "lucide-react";
import { newsDate, newsForTicker } from "@/lib/news";
import { realDocsForTicker } from "@/lib/real-documents";
import { REAL_ALERTS } from "@/lib/real-alerts";
import { dateFr } from "@wariba/core/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

/**
 * Le portefeuille comme filtre d'attention : actualités, documents
 * officiels et alertes factuelles restreints aux valeurs détenues —
 * « suivez VOS sociétés sans chercher ».
 */
export function HoldingsFeed({ tickers }: { tickers: string[] }) {
  const news = useMemo(() => {
    const seen = new Set<string>();
    return tickers
      .flatMap((t) => newsForTicker(t))
      .filter((n) => (seen.has(n.link) ? false : (seen.add(n.link), true)))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 6);
  }, [tickers]);

  const docs = useMemo(
    () =>
      tickers
        .flatMap((t) => realDocsForTicker(t))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [tickers]
  );

  const alerts = useMemo(
    () =>
      REAL_ALERTS.filter((a) => a.ticker && tickers.includes(a.ticker)).slice(0, 6),
    [tickers]
  );

  if (tickers.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-accent" /> Alertes de vos valeurs
            </span>
          }
        />
        <CardBody className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-xs text-ink-3">
              Aucune alerte récente sur vos valeurs — rien d&apos;inhabituel
              détecté dans les derniers bulletins.
            </p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-line bg-surface/50 p-2.5">
                <p className="text-xs font-semibold text-ink">{a.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3 line-clamp-2">
                  {a.detail}
                </p>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5 text-accent" /> Actualités de vos valeurs
            </span>
          }
        />
        <CardBody className="space-y-2">
          {news.length === 0 ? (
            <p className="text-xs text-ink-3">
              Aucun article récent ne mentionne vos valeurs.
            </p>
          ) : (
            news.map((n) => (
              <a
                key={n.link}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-line bg-surface/50 p-2.5 hover:bg-surface-2 transition-colors"
              >
                <p className="text-xs font-semibold text-ink line-clamp-2">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {n.tickers[0] ? <Badge tone="accent">{n.tickers[0]}</Badge> : null}{" "}
                  {n.source} · {newsDate(n.publishedAt)}
                </p>
              </a>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-accent" /> Documents de vos valeurs
            </span>
          }
        />
        <CardBody className="space-y-2">
          {docs.length === 0 ? (
            <p className="text-xs text-ink-3">Aucun document référencé pour vos valeurs.</p>
          ) : (
            docs.map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-line bg-surface/50 p-2.5 hover:bg-surface-2 transition-colors"
              >
                <p className="text-xs font-semibold text-ink line-clamp-2">{d.title}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  <span className="font-bold text-accent">{d.ticker}</span> · {d.type} ·{" "}
                  {dateFr(d.date)}
                </p>
              </a>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
