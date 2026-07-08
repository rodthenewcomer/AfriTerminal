import { AlertTriangle, Eye, Sparkles, ThumbsUp } from "lucide-react";
import type { AIInsight } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Lecture intelligente
          </span>
        }
        subtitle={insight.headline}
      />
      <CardBody className="space-y-4">
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

        <p className="border-t border-line pt-3 text-[10px] text-ink-3">
          Analyse générée automatiquement à partir de données simulées. Ceci
          n&apos;est pas un conseil en investissement.
        </p>
      </CardBody>
    </Card>
  );
}
