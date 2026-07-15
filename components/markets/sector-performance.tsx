import { getSectorPerformance } from "@/lib/data";
import { pct } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";

/**
 * Barres divergentes de performance sectorielle (moyenne des variations
 * du jour, séance officielle). Barres autour d'un axe zéro central :
 * la polarité est portée par la couleur up/down de l'app ET par la
 * valeur signée à droite — jamais par la couleur seule (CVD).
 */
export function SectorPerformance() {
  const rows = getSectorPerformance();
  if (rows.length === 0) return null;
  const maxAbs = Math.max(0.1, ...rows.map((r) => Math.abs(r.avgDayChange)));

  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const widthPct = (Math.abs(r.avgDayChange) / maxAbs) * 50;
        const up = r.avgDayChange >= 0;
        return (
          <div
            key={r.sector}
            className="flex items-center gap-2"
            title={`${r.sector} : ${pct(r.avgDayChange, { digits: 2 })} en moyenne sur ${r.count} valeur${r.count > 1 ? "s" : ""}`}
          >
            <span className="w-28 shrink-0 truncate text-[11px] text-ink-2">
              {r.sector}
            </span>
            {/* Piste divergente : zéro au centre, gauche = baisse, droite = hausse */}
            <div className="relative h-3.5 min-w-0 flex-1 rounded bg-surface-2/60">
              <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
              <span
                className={cn(
                  "absolute inset-y-0.5 rounded-[3px]",
                  up ? "left-1/2 bg-up/70" : "right-1/2 bg-down/70"
                )}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span
              className={cn(
                "num w-16 shrink-0 text-right text-[11px] font-medium",
                up ? "text-up" : "text-down"
              )}
            >
              {pct(r.avgDayChange, { digits: 2 })}
            </span>
            <span className="num hidden w-8 shrink-0 text-right text-[10px] text-ink-3 sm:block">
              {r.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
