import type { Metadata } from "next";
import { IPOS } from "@/lib/mock/ipos";
import { CAPITAL_OPERATIONS, MARKET_NOTICES } from "@/lib/real-operations";
import { dateFr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { IPOCard } from "@/components/ipo/ipo-card";
import { IpoTabs } from "@/components/ipo/ipo-tabs";

export const metadata: Metadata = { title: "IPO & Opérations" };

export default function IPOPage() {
  const [featured, ...rest] = IPOS;
  const notices = MARKET_NOTICES.slice(0, 12);
  const operations = CAPITAL_OPERATIONS.slice(0, 12);

  return (
    <div className="stagger space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          IPO & opérations sur titres
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-3">
          Quand une société entre en bourse (IPO), émet de nouvelles actions
          (augmentation de capital) ou divise son titre (fractionnement), cela
          change le nombre d&apos;actions en circulation — et donc la valeur de
          chacune. Avis officiels de la BRVM, historique des opérations, et
          scénarios pédagogiques séparés pour apprendre à les analyser.
        </p>
      </div>

      <IpoTabs
        avis={
          <div className="space-y-2.5">
            <p className="text-xs text-ink-3">
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
          </div>
        }
        operations={
          <div className="space-y-2.5">
            <p className="text-xs text-ink-3">
              Augmentations de capital, fractionnements et réductions actés à
              la BRVM, avec l&apos;avis officiel de chaque opération.
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
          </div>
        }
        apprendre={
          <div className="space-y-3">
            <p className="text-xs text-ink-3">
              Des scénarios pédagogiques simulés, séparés des avis officiels,
              pour apprendre à lire une opération avant de souscrire :
              valorisation, dilution, risques et opportunités.
            </p>
            <IPOCard ipo={featured} featured />
            <div className="grid gap-3 lg:grid-cols-2">
              {rest.map((ipo) => (
                <IPOCard key={ipo.id} ipo={ipo} />
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
