import { buildFinancialHistory } from "@wariba/core/financial-history";
import type { RealFundamentalInput } from "@wariba/core/real-analysis";
import { metricEvidenceLabel } from "@wariba/core/financial-language";
import { fcfa, millions, pct } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

function formatValue(
  value: number | null,
  format: "amount" | "percent" | "per-share"
): string {
  if (value === null) return "N/D";
  if (format === "percent") return pct(value, { signed: false, digits: 1 });
  if (format === "per-share") return fcfa(value);
  return millions(value);
}

export function FinancialHistory({
  fundamental,
}: {
  fundamental: RealFundamentalInput;
}) {
  const history = buildFinancialHistory(fundamental);

  return (
    <Card className="mt-4">
      <CardHeader
        title="Historique financier sur 5 exercices"
        subtitle={`${history.coverageYears}/${history.totalYears} exercices couverts · les années absentes restent N/D`}
      />
      <CardBody className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-[11px]">
            <thead>
              <tr className="border-b border-line text-ink-3">
                <th className="sticky left-0 z-10 bg-surface py-2 pr-4 font-medium">Métrique</th>
                {history.years.map((year) => (
                  <th key={year} className="px-3 py-2 text-right font-medium">{year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.rows.map((row) => (
                <tr key={row.id} className="border-b border-line/60">
                  <th className="sticky left-0 z-10 bg-surface py-2.5 pr-4 font-medium text-ink">
                    {row.label}
                  </th>
                  {history.years.map((year) => {
                    const item = row.cells[year];
                    return (
                      <td key={year} className="px-3 py-2.5 text-right">
                        <span className="num block font-medium text-ink-2">
                          {formatValue(item.value, row.format)}
                        </span>
                        <span className="mt-0.5 block text-[8px] uppercase tracking-wide text-ink-3">
                          {metricEvidenceLabel(item.status)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] leading-4 text-ink-3">
          Source : états financiers officiels liés. Les ratios « Calculé » utilisent uniquement les montants vérifiés. Dette et trésorerie restent N/D tant que le pipeline ne dispose pas de postes de bilan normalisés.
        </p>
      </CardBody>
    </Card>
  );
}
