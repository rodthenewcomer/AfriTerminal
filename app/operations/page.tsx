"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  Landmark,
} from "lucide-react";
import { REAL_DOCUMENTS, type RealDocument } from "@/lib/real-documents";
import { CAPITAL_OPERATIONS, MARKET_NOTICES } from "@/lib/real-operations";
import { dateFr } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type HubTab = "documents" | "notices" | "operations" | "learn";
const TABS: { id: HubTab; label: string; icon: typeof FileText }[] = [
  { id: "documents", label: "Publications", icon: FileText },
  { id: "notices", label: "Avis du marché", icon: Landmark },
  { id: "operations", label: "Opérations sur titres", icon: Building2 },
  { id: "learn", label: "Comprendre", icon: GraduationCap },
];
const TYPES: (RealDocument["type"] | "Tous")[] = [
  "Tous",
  "États financiers",
  "Résultats",
  "Dividende",
  "AGO",
  "Communiqué",
];
const PAGE_SIZE = 30;

export default function OperationsPage() {
  const [tab, setTab] = useState<HubTab>("documents");
  const [type, setType] = useState<(typeof TYPES)[number]>("Tous");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const documents = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return REAL_DOCUMENTS.filter(
      (document) =>
        (type === "Tous" || document.type === type) &&
        (!needle ||
          document.ticker.includes(needle) ||
          document.title.toUpperCase().includes(needle))
    );
  }, [query, type]);

  return (
    <div className="stagger space-y-5">
      <header className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-accent/10 via-surface to-gold/8 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Centre officiel BRVM
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
              Opérations & documents
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-3">
              Un seul endroit pour lire les publications des sociétés, les avis du
              marché et les opérations qui modifient le nombre ou les droits des
              actions. Chaque lien ouvre la source originale sur brvm.org.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [REAL_DOCUMENTS.length, "publications"],
              [MARKET_NOTICES.length, "avis"],
              [CAPITAL_OPERATIONS.length, "opérations"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-line bg-surface/80 px-3 py-2.5">
                <p className="num text-lg font-bold text-ink">{value}</p>
                <p className="text-[10px] text-ink-3">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="overflow-x-auto pb-1" role="tablist" aria-label="Contenu du centre officiel">
        <div className="inline-flex min-w-max gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition",
                tab === id ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "documents" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {TYPES.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setType(item);
                    setLimit(PAGE_SIZE);
                  }}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                    type === item
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-line bg-surface text-ink-2"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Ticker ou titre…"
              className="max-w-xs"
            />
          </div>
          <p className="text-xs text-ink-3">
            <strong className="text-ink">{documents.length}</strong> document
            {documents.length > 1 ? "s" : ""} officiel{documents.length > 1 ? "s" : ""}
          </p>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {documents.slice(0, limit).map((document) => (
              <article key={document.url} className="card-glass flex min-w-0 gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <FileCheck2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-2"
                  >
                    <span className="line-clamp-2 flex-1 text-xs font-semibold leading-5 text-ink group-hover:text-accent">
                      {document.title}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  </a>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link href={`/stocks/${document.ticker}`} className="text-[11px] font-bold text-accent">
                      {document.ticker}
                    </Link>
                    <Badge tone="neutral">{document.type}</Badge>
                    <time className="text-[10px] text-ink-3">{dateFr(document.date)}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {documents.length > limit ? (
            <button
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
              className="mx-auto block rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink-2"
            >
              Afficher {Math.min(PAGE_SIZE, documents.length - limit)} documents de plus
            </button>
          ) : null}
        </section>
      ) : null}

      {tab === "notices" ? (
        <section className="space-y-3">
          <p className="text-sm text-ink-3">
            Calendriers, admissions, radiations et décisions publiées par la BRVM.
          </p>
          <div className="grid gap-2.5 md:grid-cols-2">
            {MARKET_NOTICES.map((notice) => (
              <a
                key={notice.pdf}
                href={notice.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="card-glass group flex gap-3 p-4"
              >
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  <span className="block text-xs font-semibold leading-5 text-ink group-hover:text-accent">
                    {notice.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-3">
                    {dateFr(notice.date)} · PDF officiel
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "operations" ? (
        <section className="space-y-3">
          <p className="text-sm text-ink-3">
            Augmentations ou réductions de capital, fractionnements et autres
            événements confirmés par un avis officiel.
          </p>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {CAPITAL_OPERATIONS.map((operation, index) => (
              <article key={`${operation.issuer}-${operation.date}-${index}`} className="card-glass p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-ink">{operation.issuer}</p>
                    {operation.ticker ? (
                      <Link href={`/stocks/${operation.ticker}`} className="mt-1 inline-block text-[11px] font-bold text-accent">
                        {operation.ticker}
                      </Link>
                    ) : null}
                  </div>
                  <Badge tone="accent">{operation.kind}</Badge>
                </div>
                {operation.parity ? <p className="mt-3 text-xs leading-5 text-ink-2">{operation.parity}</p> : null}
                <p className="mt-3 text-[11px] text-ink-3">
                  {operation.date ? dateFr(operation.date) : "Date dans l'avis"}
                  {operation.avisPdf ? (
                    <> · <a href={operation.avisPdf} target="_blank" rel="noopener noreferrer" className="underline">Avis officiel</a></>
                  ) : null}
                  {operation.communiquePdf ? (
                    <> · <a href={operation.communiquePdf} target="_blank" rel="noopener noreferrer" className="underline">Communiqué</a></>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "learn" ? (
        <section className="grid gap-3 md:grid-cols-3">
          {[
            ["IPO", "Première vente d'actions au public avant l'admission en bourse. Vérifiez prix, nombre d'actions, usage des fonds et calendrier dans le document officiel."],
            ["Augmentation de capital", "Création de nouvelles actions. Un actionnaire qui ne participe pas peut voir son pourcentage de détention diminuer : c'est la dilution."],
            ["Fractionnement", "Une action est divisée en plusieurs actions. Le prix unitaire baisse mécaniquement, mais la valeur totale détenue ne change pas au moment de l'opération."],
          ].map(([title, detail]) => (
            <article key={title} className="rounded-2xl border border-line bg-surface p-5">
              <GraduationCap className="h-5 w-5 text-gold" />
              <h2 className="mt-3 text-sm font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-ink-3">{detail}</p>
            </article>
          ))}
        </section>
      ) : null}

      <p className="text-[10px] text-ink-3">
        WARIBA référence les sources officielles et ne remplace ni le prospectus,
        ni l&apos;avis de la BRVM, ni le conseil d&apos;une SGI agréée.
      </p>
    </div>
  );
}
