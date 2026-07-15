import { Coins } from "lucide-react";
import { dividendHistoryFor } from "@/lib/real-dividends";
import { dateFr, fcfa } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

/**
 * Historique réel des dividendes nets (bulletins officiels) en barres
 * annuelles — grandeur unique, une seule teinte (or), valeur directe
 * au-dessus de chaque barre (≤ ~9 barres, toutes étiquetées).
 */
export function DividendHistory({ ticker }: { ticker: string }) {
  const history = dividendHistoryFor(ticker);
  if (history.length < 2) return null;

  const max = Math.max(...history.map((d) => d.net));
  const last = history[history.length - 1];
  const first = history[0];
  const growth =
    first.net > 0 && history.length > 1
      ? ((last.net / first.net) ** (1 / (history.length - 1)) - 1) * 100
      : null;

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-accent" /> Historique des
            dividendes nets
          </span>
        }
        subtitle={`${history.length} versements depuis ${first.date.slice(0, 4)} (bulletins officiels, nets après IRVM 10 %)${
          growth !== null
            ? ` · croissance moyenne ${growth >= 0 ? "+" : ""}${growth.toFixed(1)} %/versement`
            : ""
        }`}
      />
      <CardBody>
        <div className="flex items-end gap-2 overflow-x-auto pb-1" role="img" aria-label={`Dividendes nets de ${ticker} par versement`}>
          {history.map((d) => (
            <div
              key={d.date}
              className="flex min-w-12 flex-1 flex-col items-center gap-1"
              title={`Payé le ${dateFr(d.date)} : ${fcfa(d.net)} net par action`}
            >
              <span className="num text-[10px] font-medium text-ink-2">
                {fcfa(d.net)}
              </span>
              <div
                className="w-full max-w-14 rounded-t-[3px] bg-gold/70"
                style={{ height: `${Math.max(6, (d.net / max) * 96)}px` }}
              />
              <span className="text-[10px] text-ink-3">{d.date.slice(0, 4)}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
