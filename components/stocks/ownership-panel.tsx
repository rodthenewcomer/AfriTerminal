import type { RealQuote } from "@wariba/core/types";
import type { RealFundamentals } from "@/lib/real-fundamentals";
import { compactFcfa, fcfa, pct } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

function Row({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "Vérifié" | "Calculé" | "N/D";
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right">
        <span className="num block font-medium text-ink">{value}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wide text-ink-3">{status}</span>
      </dd>
    </div>
  );
}

export function OwnershipPanel({
  quote,
  fundamental,
}: {
  quote: RealQuote;
  fundamental: RealFundamentals;
}) {
  const shares = fundamental.sharesOutstanding;
  const marketCap = shares ? shares * quote.lastClose : null;
  const payout =
    shares && fundamental.proposedGrossDividend !== null && fundamental.netIncomeM > 0
      ? (fundamental.proposedGrossDividend * shares) / (fundamental.netIncomeM * 1e6) * 100
      : null;

  return (
    <Card className="mt-4">
      <CardHeader
        title="Capital & actionnariat"
        subtitle="Structure vérifiée uniquement lorsque la publication officielle fournit la donnée"
      />
      <CardBody>
        <dl className="grid gap-x-8 text-[11px] sm:grid-cols-2">
          <Row
            label="Actions en circulation"
            value={shares ? shares.toLocaleString("fr-FR") : "N/D"}
            status={shares ? "Vérifié" : "N/D"}
          />
          <Row
            label="Capitalisation"
            value={marketCap ? compactFcfa(marketCap) : "N/D"}
            status={marketCap ? "Calculé" : "N/D"}
          />
          <Row label="Capital social" value="N/D" status="N/D" />
          <Row label="Flottant" value="N/D" status="N/D" />
          <Row label="Principaux actionnaires" value="N/D" status="N/D" />
          <Row label="Évolution de l'actionnariat" value="N/D" status="N/D" />
          <Row
            label="Dividende brut proposé"
            value={fundamental.proposedGrossDividend !== null ? fcfa(fundamental.proposedGrossDividend) : "N/D"}
            status={fundamental.proposedGrossDividend !== null ? "Vérifié" : "N/D"}
          />
          <Row
            label="Taux de distribution indicatif"
            value={payout !== null ? pct(payout, { signed: false, digits: 1 }) : "N/D"}
            status={payout !== null ? "Calculé" : "N/D"}
          />
        </dl>
        <p className="mt-3 border-t border-line pt-3 text-[10px] leading-4 text-ink-3">
          WARIBA n&apos;estime ni le flottant ni les actionnaires manquants. Source :{" "}
          <a href={fundamental.source} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            publication officielle
          </a>.
        </p>
      </CardBody>
    </Card>
  );
}
