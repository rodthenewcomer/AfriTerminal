import type { DividendInfo, StockSnapshot } from "@wariba/core/types";
import { dateFr, fcfa, pct } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const BOND_YIELD = 6.15;

export function DividendPanel({
  stock,
  dividend,
}: {
  stock: StockSnapshot;
  dividend: DividendInfo | undefined;
}) {
  if (!dividend || dividend.gross === 0) {
    return (
      <Card>
        <CardHeader title="Dividendes" />
        <CardBody>
          <p className="text-sm text-ink-3">
            Aucun dividende au titre du dernier exercice.
          </p>
        </CardBody>
      </Card>
    );
  }

  const maxGross = Math.max(...dividend.history.map((h) => h.gross), 1);
  const growth =
    dividend.history.length >= 2
      ? ((dividend.history[dividend.history.length - 1].gross /
          dividend.history[0].gross) **
          (1 / (dividend.history.length - 1)) -
          1) *
        100
      : 0;

  const rows: { label: string; value: string; tone?: "up" | "warn" }[] = [
    { label: "Dividende brut", value: fcfa(dividend.gross) },
    { label: "Dividende net (après IRVM 10 %)", value: fcfa(dividend.net) },
    {
      label: "Rendement brut",
      value: pct(stock.yieldGross, { signed: false, digits: 2 }),
    },
    {
      label: "Rendement net",
      value: pct(stock.yieldNet, { signed: false, digits: 2 }),
      tone: stock.yieldNet >= 6 ? "up" : undefined,
    },
    {
      label: "Payout",
      value: pct(stock.fundamentals.payout, { signed: false, digits: 0 }),
      tone: stock.fundamentals.payout > 90 ? "warn" : undefined,
    },
    {
      label: "Croissance annuelle moyenne (5 ans)",
      value: pct(growth, { digits: 1 }),
    },
  ];
  if (dividend.exDate) {
    rows.push({ label: "Date de détachement", value: dateFr(dividend.exDate) });
  }
  if (dividend.payDate) {
    rows.push({ label: "Mise en paiement", value: dateFr(dividend.payDate) });
  }

  return (
    <Card>
      <CardHeader
        title="Dividendes"
        subtitle={`vs obligation d'État 10 ans : ${pct(BOND_YIELD, { signed: false, digits: 2 })} brut`}
      />
      <CardBody className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-[11px] text-ink-3">{r.label}</dt>
              <dd
                className={`num text-sm font-semibold ${
                  r.tone === "up"
                    ? "text-up"
                    : r.tone === "warn"
                      ? "text-warn"
                      : "text-ink"
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">
            Historique 5 ans (brut / action)
          </p>
          <div className="flex items-end gap-2 h-24">
            {dividend.history.map((h) => (
              <div key={h.year} className="flex flex-1 flex-col items-center gap-1">
                <span className="num text-[10px] text-ink-2">{h.gross >= 100 ? Math.round(h.gross) : h.gross}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-accent"
                  style={{ height: `${Math.max(8, (h.gross / maxGross) * 64)}px` }}
                />
                <span className="text-[10px] text-ink-3">{h.year}</span>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
