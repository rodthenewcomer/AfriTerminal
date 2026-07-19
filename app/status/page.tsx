import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { MARKET_DATA_LABEL, REAL_INDICES } from "@/lib/real-data";
import { REAL_ALERTS } from "@/lib/real-alerts";
import { REAL_DOCUMENTS } from "@/lib/real-documents";
import { latestNews, newsDate } from "@/lib/news";
import fundamentalsJson from "@/data/real/fundamentals.json";
import fundamentalsStatusJson from "@/data/real/fundamentals-status.json";
import { dateFr } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Statut des données",
  description:
    "Fraîcheur et provenance de chaque source de données WARIBA : bulletins officiels BRVM, indices, actualités, fondamentaux, documents.",
};

/** Figé au build : le site étant statique, cette date EST celle du dernier déploiement. */
const BUILT_AT = new Date().toISOString();

export default function StatusPage() {
  const snapshots = getSnapshots();
  const fundamentals = Object.values(
    fundamentalsJson as Record<string, { publishedOn: string }>
  );
  const lastFundamental = fundamentals
    .map((f) => f.publishedOn)
    .sort()
    .at(-1);
  const lastNews = latestNews(1)[0];
  const lastAlert = REAL_ALERTS[0];
  const lastDoc = REAL_DOCUMENTS[0];
  const fundamentalsStatus = fundamentalsStatusJson as {
    coverage: number;
    current: number;
    reviewRequired: number;
  };

  const rows: { source: string; freshness: string; detail: string }[] = [
    {
      source: "Cours & volumes",
      freshness: MARKET_DATA_LABEL,
      detail: `${snapshots.length} sociétés cotées · cours différés relevés toutes les 5 min en séance · clôtures et volumes officiels consolidés chaque soir`,
    },
    {
      source: "Indices BRVM",
      freshness: `${REAL_INDICES.length} indices (Composite, 30, Prestige)`,
      detail: "Niveaux officiels quotidiens depuis janvier 2023, mis à jour avec le bulletin",
    },
    {
      source: "Plus haut / plus bas intraday",
      freshness: "Collecte toutes les 5 min en séance",
      detail: "Cours différés de 15 min relevés pendant la séance (10h00–15h15 UTC) — les bougies gagnent de vraies mèches depuis le 8 juil. 2026",
    },
    {
      source: "Actualités",
      freshness: lastNews ? `Dernier article : ${newsDate(lastNews.publishedAt)}` : "—",
      detail: "Sika Finance + Financial Afrik, agrégées toutes les 5 min en journée",
    },
    {
      source: "Alertes",
      freshness: lastAlert ? `${REAL_ALERTS.length} alertes · dernière le ${dateFr(lastAlert.time.slice(0, 10))}` : "—",
      detail: "Régénérées à chaque bulletin et publication : variations ≥ 5 %, extrêmes 52 semaines, volumes inhabituels, dividendes, résultats",
    },
    {
      source: "États financiers",
      freshness: `${fundamentalsStatus.current}/${fundamentalsStatus.coverage} à jour`,
      detail: `Détection sur 48 sociétés, extraction PDF/OCR avec recoupement automatique N-1 et blocage des cas ambigus · ${fundamentalsStatus.reviewRequired} à revoir · dernière publication intégrée : ${lastFundamental ? dateFr(lastFundamental) : "—"}`,
    },
    {
      source: "Documents officiels",
      freshness: lastDoc ? `${REAL_DOCUMENTS.length} publications · dernière du ${dateFr(lastDoc.date)}` : "—",
      detail: "48 fiches actions surveillées toutes les 5 min sur brvm.org (liens directs vers les PDF originaux)",
    },
  ];

  return (
    <div className="space-y-4 stagger">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Statut des données
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          D&apos;où viennent les chiffres et quand ils ont été mis à jour —
          site régénéré le {dateFr(BUILT_AT.slice(0, 10))}.
        </p>
      </div>

      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={r.source}>
            <CardBody className="flex items-start gap-3 py-3.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-up" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {r.source}{" "}
                  <span className="ml-1 font-medium text-accent">{r.freshness}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{r.detail}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Une erreur dans une donnée ?" />
        <CardBody>
          <p className="text-xs leading-relaxed text-ink-2">
            La crédibilité d&apos;un terminal se joue sur l&apos;exactitude.
            Si un cours, un dividende ou un chiffre vous semble faux,
            signalez-le :{" "}
            <a
              href="mailto:support@wariba.app?subject=Signalement%20donnée%20WARIBA"
              className="text-accent underline hover:no-underline"
            >
              contacter le support
            </a>{" "}
            en précisant la valeur, la date et la source attendue. Tous les
            signalements sont recoupés avec le document officiel avant correction.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
