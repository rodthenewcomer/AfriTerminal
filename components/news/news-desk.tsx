"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Clock3, Newspaper, Search } from "lucide-react";
import { type NewsItem } from "@/lib/news";
import { cn } from "@wariba/core/utils";

type NewsFilter = "all" | "results";

const FILTERS: { id: NewsFilter; label: string }[] = [
  { id: "all", label: "Toutes les actions" },
  { id: "results", label: "Résultats & dividendes" },
];

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Abidjan",
});

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(value));
}

function matchesFilter(item: NewsItem, filter: NewsFilter) {
  if (filter === "results") {
    return /résultat|rapport annuel|chiffre d.affaires|bénéfice|dividende|publication financière/i.test(`${item.title} ${item.summary}`);
  }
  return true;
}

function TickerLinks({ tickers }: { tickers: string[] }) {
  if (!tickers.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tickers.slice(0, 6).map((ticker) => (
        <Link
          key={ticker}
          href={`/stocks/${ticker}`}
          className="rounded-md border border-accent/25 bg-accent/8 px-2 py-1 text-[10px] font-bold tracking-wide text-accent transition-colors hover:border-accent/50 hover:bg-accent/15"
        >
          {ticker}
        </Link>
      ))}
    </div>
  );
}

export function NewsDesk({ news }: { news: NewsItem[] }) {
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("fr"));
  const companyNews = useMemo(
    () => news.filter((item) => item.tickers.length > 0),
    [news],
  );

  const sources = useMemo(
    () => [...new Set(companyNews.map((item) => item.source))].sort((a, b) => a.localeCompare(b, "fr")),
    [companyNews],
  );
  const linkedTickers = useMemo(
    () => new Set(companyNews.flatMap((item) => item.tickers)).size,
    [companyNews],
  );
  const filtered = useMemo(() => companyNews.filter((item) => {
    if (!matchesFilter(item, filter)) return false;
    if (source !== "all" && item.source !== source) return false;
    if (!deferredQuery) return true;
    const haystack = `${item.title} ${item.summary} ${item.source} ${item.tickers.join(" ")}`.toLocaleLowerCase("fr");
    return haystack.includes(deferredQuery);
  }), [companyNews, deferredQuery, filter, source]);

  const lead = filtered[0];
  const stream = filtered.filter((item) => item.link !== lead?.link).slice(0, Math.max(0, limit - 1));

  const selectFilter = (next: NewsFilter) => {
    setFilter(next);
    setLimit(24);
  };

  return (
    <div className="space-y-5">
      <header className="border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Sociétés cotées BRVM · heure d&apos;Abidjan
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Actualités</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-3">
              Résultats, communiqués, contrats et dividendes directement reliés aux actions concernées.
            </p>
          </div>
          <Link
            href="/operations"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
          >
            Publications officielles <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface/55 py-3">
          <div className="px-3 sm:px-4">
            <p className="text-[10px] uppercase tracking-wide text-ink-3">Articles</p>
            <p className="num mt-1 text-base font-bold text-ink">{companyNews.length}</p>
          </div>
          <div className="px-3 sm:px-4">
            <p className="text-[10px] uppercase tracking-wide text-ink-3">Valeurs liées</p>
            <p className="num mt-1 text-base font-bold text-ink">{linkedTickers}</p>
          </div>
          <div className="px-3 sm:px-4">
            <p className="text-[10px] uppercase tracking-wide text-ink-3">Sources</p>
            <p className="num mt-1 text-base font-bold text-ink">{sources.length}</p>
          </div>
        </div>
      </header>

      <section aria-label="Filtrer les actualités" className="space-y-3 rounded-xl border border-line bg-surface/45 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <span className="sr-only">Rechercher dans les actualités</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setLimit(24); }}
              placeholder="Société, ticker, résultat, contrat…"
              className="h-11 w-full rounded-lg border border-line bg-background pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/55"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par source</span>
            <select
              value={source}
              onChange={(event) => { setSource(event.target.value); setLimit(24); }}
              className="h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-ink outline-none focus:border-accent/55"
            >
              <option value="all">Toutes les sources</option>
              {sources.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5" role="tablist" aria-label="Type d'actualité">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => selectFilter(item.id)}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors",
                filter === item.id
                  ? "border-accent bg-accent text-background"
                  : "border-line bg-background text-ink-2 hover:border-accent/35 hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {lead ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <main className="space-y-3">
            <article className="relative overflow-hidden rounded-2xl border border-accent/25 bg-surface p-5 sm:p-7">
              <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">
                <span className="text-accent">À la une</span>
                <span>·</span>
                <span>{lead.source}</span>
                <span>·</span>
                <time dateTime={lead.publishedAt}>{formatDate(lead.publishedAt)}</time>
              </div>
              <a href={lead.link} target="_blank" rel="noopener noreferrer" className="group mt-3 block">
                <h2 className="max-w-4xl text-xl font-extrabold leading-tight tracking-tight text-ink transition-colors group-hover:text-accent sm:text-2xl">
                  {lead.title}
                </h2>
                {lead.summary ? <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-2">{lead.summary}</p> : null}
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent">
                  Lire la source <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
              <div className="mt-4"><TickerLinks tickers={lead.tickers} /></div>
            </article>

            <div className="divide-y divide-line rounded-2xl border border-line bg-surface/55">
              {stream.map((item, index) => (
                <article key={item.link} className="grid gap-3 p-4 transition-colors hover:bg-surface-2/45 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:p-5">
                  <span className="num hidden text-xs font-semibold text-ink-3 sm:block">{String(index + 2).padStart(2, "0")}</span>
                  <div>
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">
                      <span className="font-bold text-ink-2">{item.source}</span><span>·</span>
                      <span className="font-semibold text-accent">{item.tickers.join(" · ")}</span><span>·</span>
                      <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
                    </div>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-2">
                      <h3 className="text-sm font-bold leading-5 text-ink transition-colors group-hover:text-accent sm:text-[15px]">{item.title}</h3>
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3 group-hover:text-accent" />
                    </a>
                    {item.summary ? <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-3">{item.summary}</p> : null}
                    <div className="mt-2.5"><TickerLinks tickers={item.tickers} /></div>
                  </div>
                </article>
              ))}
            </div>

            {limit < filtered.length ? (
              <button
                type="button"
                onClick={() => setLimit((value) => value + 24)}
                className="min-h-11 w-full rounded-xl border border-line bg-surface text-xs font-bold text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
              >
                Afficher 24 articles de plus
              </button>
            ) : null}
          </main>

          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-line bg-surface/55 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink"><Building2 className="h-4 w-4 text-accent" /> Couverture sociétés</div>
              <p className="mt-2 text-xs leading-5 text-ink-3">Chaque article possède au moins un ticker vérifié. Les badges ouvrent directement la fiche concernée.</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/55 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink"><Clock3 className="h-4 w-4 text-accent" /> Mise à jour</div>
              <p className="mt-2 text-xs leading-5 text-ink-3">Collecte automatique toutes les 5 minutes. L&apos;heure affichée est celle d&apos;Abidjan.</p>
            </div>
            <p className="px-1 text-[10px] leading-4 text-ink-3">WARIBA agrège les titres et renvoie vers les éditeurs. Le contenu reste la propriété de sa source.</p>
          </aside>
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 text-center">
          <Newspaper className="h-7 w-7 text-ink-3" />
          <p className="mt-3 text-sm font-bold text-ink">Aucun article ne correspond</p>
          <p className="mt-1 text-xs text-ink-3">Modifiez la recherche ou les filtres.</p>
        </div>
      )}
    </div>
  );
}
