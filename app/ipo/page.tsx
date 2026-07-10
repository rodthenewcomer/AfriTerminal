import type { Metadata } from "next";
import { FileText, Landmark, Rocket } from "lucide-react";
import { IPOS } from "@/lib/mock/ipos";
import { CAPITAL_OPERATIONS, MARKET_NOTICES } from "@/lib/real-operations";
import { dateFr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { IPOCard } from "@/components/ipo/ipo-card";

export const metadata: Metadata = { title: "IPO & Opérations" };

export default function IPOPage() {
  const [featured, ...rest] = IPOS;
  const notices = MARKET_NOTICES.slice(0, 10);
  const operations = CAPITAL_OPERATIONS.slice(0, 12);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          IPO & opérations sur titres
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-3">
          Quand une société entre en bourse (IPO), émet de nouvelles actions
          (augmentation de capital) ou divise son titre (fractionnement), cela
          change le nombre d&apos;actions en circulation — et donc la valeur de
          chacune. Cette page réunit les avis officiels de la BRVM et
          l&apos;historique de ces opérations.
        </p>
      </div>

      {/* Avis officiels — réels */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <FileText className="h-3.5 w-3.5 text-accent" /> Avis officiels du
            marché
          </h2>
          <Badge tone="positive">Données réelles</Badge>
        </div>
        <p className="mb-2.5 text-xs text-ink-3">
          Les annonces publiées par la BRVM elle-même : calendriers de
          dividendes, admissions, radiations, transactions sur dossier.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {notices.map((n) => (
            <a
              key={n.pdf}
              href={n.pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="group min-w-0 rounded-xl border border-line bg-surface/50 p-3 hover:bg-surface-2 transition-colors"
            >
              <p className="text-xs font-semibold text-ink group-hover:text-accent">
                {n.title}
              </p>
              <p className="mt-1 text-[11px] text-ink-3">
                {dateFr(n.date)} · PDF officiel (brvm.org)
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Opérations sur capital — réelles */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Landmark className="h-3.5 w-3.5 text-accent" /> Opérations sur
            capital — historique officiel
          </h2>
          <Badge tone="positive">Données réelles</Badge>
        </div>
        <p className="mb-2.5 text-xs text-ink-3">
          Augmentations de capital, fractionnements et réductions actés à la
          BRVM, avec l&apos;avis officiel de chaque opération.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {operations.map((op, i) => (
            <Card key={i} className="min-w-0">
              <CardBody className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{op.issuer}</span>
                  <Badge tone="accent">{op.kind}</Badge>
                </div>
                {op.parity ? (
                  <p className="text-[11px] leading-relaxed text-ink-2">{op.parity}</p>
                ) : null}
                <p className="text-[11px] text-ink-3">
                  {op.date ? `${dateFr(op.date)} · ` : ""}
                  {op.avisPdf ? (
                    <a
                      href={op.avisPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-ink"
                    >
                      Avis officiel
                    </a>
                  ) : null}
                  {op.avisPdf && op.communiquePdf ? " · " : ""}
                  {op.communiquePdf ? (
                    <a
                      href={op.communiquePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-ink"
                    >
                      Communiqué
                    </a>
                  ) : null}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Exemples pédagogiques — simulés */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Rocket className="h-3.5 w-3.5 text-accent" /> Apprendre à analyser
            une opération
          </h2>
          <Badge tone="gold">Exemples simulés</Badge>
        </div>
        <p className="mb-2.5 text-xs text-ink-3">
          Des cas fictifs mais réalistes pour apprendre à lire une opération
          avant de souscrire : valorisation, dilution, risques et opportunités.
        </p>
        <div className="space-y-3">
          <IPOCard ipo={featured} featured />
          <div className="grid gap-3 lg:grid-cols-2">
            {rest.map((ipo) => (
              <IPOCard key={ipo.id} ipo={ipo} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
