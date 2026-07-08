import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { latestNews, newsDate } from "@/lib/news";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Toute l'actualité des marchés BRVM/UEMOA agrégée depuis Sika Finance et Financial Afrik, rattachée aux sociétés cotées. Liens vers les articles originaux.",
};

export default function NewsPage() {
  const news = latestNews(120);
  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Actualités</h1>
        <p className="mt-1 text-sm text-ink-3">
          {news.length} articles · Sika Finance & Financial Afrik · rafraîchi
          toutes les 2 h — chaque lien ouvre l&apos;article original.
        </p>
      </div>

      <div className="grid gap-2.5">
        {news.map((n) => (
          <article
            key={n.link}
            className="card-glass flex flex-col gap-1.5 p-3.5"
          >
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-3"
            >
              <span className="text-sm font-semibold text-ink group-hover:text-accent">
                {n.title}
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-accent" />
            </a>
            {n.summary ? (
              <p className="text-xs leading-relaxed text-ink-3 line-clamp-2">
                {n.summary}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-ink-3">
                {n.source} · {newsDate(n.publishedAt)}
              </span>
              {n.tickers.map((t) => (
                <Link key={t} href={`/stocks/${t}`}>
                  <Badge tone="accent">{t}</Badge>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="text-[11px] text-ink-3">
        AfriTerminal agrège les titres et renvoie vers les articles
        originaux — le contenu appartient à ses éditeurs.
      </p>
    </div>
  );
}
