import type { RealQuote } from "@wariba/core/types";
import type { RealFundamentals } from "@/lib/real-fundamentals";
import { compactFcfa, dateFr, fcfa, pct } from "@wariba/core/format";
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
  const ownership = fundamental.ownership;
  const marketCap = shares ? shares * quote.lastClose : null;
  const dividendPerShare = fundamental.proposedGrossDividend ?? quote.lastDividendNet;
  const payout =
    shares && dividendPerShare !== null && fundamental.netIncomeM > 0
      ? (dividendPerShare * shares) / (fundamental.netIncomeM * 1e6) * 100
      : null;
  if (!shares && !ownership) return null;
  const rows = [
    shares
      ? { label: "Actions en circulation", value: shares.toLocaleString("fr-FR"), status: "Vérifié" as const }
      : null,
    marketCap
      ? { label: "Capitalisation", value: compactFcfa(marketCap), status: "Calculé" as const }
      : null,
    ownership
      ? { label: "Capital social", value: compactFcfa(ownership.capitalSocialFcfa), status: "Vérifié" as const }
      : null,
    ownership
      ? { label: "Flottant", value: pct(ownership.freeFloatPct, { signed: false, digits: 1 }), status: "Vérifié" as const }
      : null,
    ownership?.principalShareholders.length
      ? {
          label: "Principaux actionnaires",
          value: ownership.principalShareholders
            .map((holder) => `${holder.name} ${pct(holder.pct, { signed: false, digits: 1 })}`)
            .join(" · "),
          status: "Vérifié" as const,
        }
      : null,
    ownership?.change
      ? { label: "Évolution de l'actionnariat", value: ownership.change, status: "Vérifié" as const }
      : null,
    dividendPerShare !== null
      ? {
          label: fundamental.proposedGrossDividend !== null ? "Dividende brut proposé" : "Dernier dividende net",
          value: fcfa(dividendPerShare),
          status: "Vérifié" as const,
        }
      : null,
    payout !== null
      ? {
          label: fundamental.proposedGrossDividend !== null
            ? "Taux de distribution brut indicatif"
            : "Taux de distribution net indicatif",
          value: pct(payout, { signed: false, digits: 1 }),
          status: "Calculé" as const,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return null;

  return (
    <Card className="mt-4">
      <CardHeader
        title="Capital & actionnariat"
        subtitle={ownership
          ? `Structure publiée au ${dateFr(ownership.asOfDate)}`
          : "Seules les données officielles disponibles sont affichées"}
      />
      <CardBody>
        <dl className="grid gap-x-8 text-[11px] sm:grid-cols-2">
          {rows.map((row) => <Row key={row.label} {...row} />)}
        </dl>
        <p className="mt-3 border-t border-line pt-3 text-[10px] leading-4 text-ink-3">
          Les champs non publiés sont masqués. Source :{" "}
          <a href={ownership?.source ?? fundamental.source} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            publication officielle
          </a>.
        </p>
      </CardBody>
    </Card>
  );
}
