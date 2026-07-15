import type { SectorStats, StockSnapshot } from "@wariba/core/types";
import { pct, ratio } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

function Row({
  label,
  value,
  avg,
  higherIsBetter,
  format,
}: {
  label: string;
  value: number;
  avg: number;
  higherIsBetter: boolean;
  format: (n: number) => string;
}) {
  const better = higherIsBetter ? value >= avg : value <= avg;
  const span = Math.max(Math.abs(value), Math.abs(avg), 0.001);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-ink-3">{label}</span>
        <span>
          <span className={cn("num font-semibold", better ? "text-up" : "text-warn")}>
            {format(value)}
          </span>
          <span className="num text-ink-3"> / secteur {format(avg)}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", better ? "bg-up/70" : "bg-warn/70")}
          style={{ width: `${Math.min(100, (Math.abs(value) / span) * 100)}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-ink-3"
          style={{ left: `${Math.min(100, (Math.abs(avg) / span) * 100)}%` }}
          title="Moyenne secteur"
        />
      </div>
    </div>
  );
}

export function SectorComparison({
  stock,
  stats,
}: {
  stock: StockSnapshot;
  stats: SectorStats | undefined;
}) {
  if (!stats) return null;
  return (
    <Card>
      <CardHeader
        title={`Comparaison secteur — ${stock.sector}`}
        subtitle={`${stats.count} sociétés cotées dans le secteur`}
      />
      <CardBody className="space-y-3.5">
        {stock.per > 0 ? (
          <Row
            label="PER (plus bas = moins cher)"
            value={stock.per}
            avg={stats.avgPer}
            higherIsBetter={false}
            format={(n) => ratio(n)}
          />
        ) : null}
        <Row
          label="ROE"
          value={stock.fundamentals.roe}
          avg={stats.avgRoe}
          higherIsBetter
          format={(n) => pct(n, { signed: false, digits: 1 })}
        />
        <Row
          label="Rendement net"
          value={stock.yieldNet}
          avg={stats.avgYieldNet}
          higherIsBetter
          format={(n) => pct(n, { signed: false, digits: 1 })}
        />
        <Row
          label="Croissance du résultat net"
          value={stock.netIncomeGrowth}
          avg={stats.avgNetIncomeGrowth}
          higherIsBetter
          format={(n) => pct(n, { digits: 0 })}
        />
      </CardBody>
    </Card>
  );
}
