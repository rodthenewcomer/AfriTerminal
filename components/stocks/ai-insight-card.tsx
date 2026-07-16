import { AlertTriangle, Eye, Sparkles, ThumbsUp } from "lucide-react";
import type { AIInsight } from "@wariba/core/types";
import type { RealEquityAnalysis } from "@wariba/core/real-analysis";
import { dateFr } from "@wariba/core/format";
import Link from "next/link";
import { ScoreBadge } from "./badges";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function AIInsightCard({
  insight,
  analysis,
}: {
  insight: AIInsight;
  analysis?: RealEquityAnalysis;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {analysis ? "Analyse quantitative" : "Lecture intelligente"}
          </span>
        }
        subtitle={insight.headline}
      />
      <CardBody className="space-y-4">
        {analysis ? (
          <div className="grid grid-cols-[88px_1fr] gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
            <div className="flex flex-col items-center justify-center rounded-lg border border-accent/25 bg-surface px-2 py-2">
              <span className="num text-2xl font-black text-accent">{analysis.overallScore}</span>
              <span className="text-[10px] text-ink-3">sur 100</span>
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <ScoreBadge kind="quality" value={analysis.scores.quality} />
                <ScoreBadge kind="valuation" value={analysis.scores.valuation} />
                <ScoreBadge kind="momentum" value={analysis.scores.momentum} />
                <ScoreBadge kind="risk" value={analysis.scores.risk} />
              </div>
              <p className="text-[11px] leading-relaxed text-ink-3">
                Confiance <strong className="text-ink-2">{analysis.confidence.label.toLowerCase()}</strong>
                {" · "}{analysis.confidence.coveragePct} % des pondérations renseignées
                {" · "}cours du {dateFr(analysis.asOfDate)}
                {" · "}comptes {analysis.fiscalYear}
              </p>
            </div>
          </div>
        ) : null}
        <p className="text-sm leading-relaxed text-ink-2">{insight.summary}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-up/20 bg-up/5 p-3">
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-up">
              <ThumbsUp className="h-3.5 w-3.5" /> Points positifs
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-ink-2">
              {insight.positives.map((p, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-up">·</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-warn/20 bg-warn/5 p-3">
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-warn">
              <AlertTriangle className="h-3.5 w-3.5" /> Points de vigilance
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-ink-2">
              {insight.risks.map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-warn">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Eye className="h-3.5 w-3.5" /> À surveiller au prochain rapport
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-ink-2">
            {insight.watchNext.map((w, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-accent">·</span>
                {w}
              </li>
            ))}
          </ul>
        </div>

        {analysis ? (
          <div className="space-y-1.5 border-t border-line pt-3 text-[10px] leading-relaxed text-ink-3">
            <p>
              {analysis.methodologyVersion} · calcul déterministe sur données réelles, médianes et rangs sectoriels.
              Les valeurs manquantes sont omises et les poids restants renormalisés.
            </p>
            <p>{analysis.confidence.reasons.join(" ")}</p>
            <p>
              <Link href="/methodologie#score-factuel" className="text-accent underline hover:no-underline">
                Formule, pondérations et limites
              </Link>
              {" · "}Ce score n&apos;est ni une prévision ni un conseil en investissement.
            </p>
          </div>
        ) : (
          <p className="border-t border-line pt-3 text-[10px] text-ink-3">
            Analyse illustrative générée à partir de données non vérifiées par
            le pipeline réel. Ceci n&apos;est pas un conseil en investissement.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
