"use client";

import { useMemo, useState } from "react";
import { getSnapshots } from "@/lib/data";
import type { Country, Sector } from "@/lib/types";
import { cn } from "@/lib/utils";

import { StockTable } from "@/components/stocks/stock-table";

const SECTORS: Sector[] = [
  "Banque",
  "Télécom",
  "Agro-industrie",
  "Industrie",
  "Distribution",
  "Services publics",
  "Autre",
];

const COUNTRIES: Country[] = [
  "Côte d'Ivoire",
  "Sénégal",
  "Burkina Faso",
  "Togo",
  "Bénin",
  "Mali",
  "Niger",
];

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
      )}
    >
      {label}
    </button>
  );
}

export default function MarketsPage() {
  const [sector, setSector] = useState<Sector | null>(null);
  const [country, setCountry] = useState<Country | null>(null);

  const snapshots = getSnapshots();
  const filtered = useMemo(
    () =>
      snapshots.filter(
        (s) =>
          (sector === null || s.sector === sector) &&
          (country === null || s.country === country)
      ),
    [snapshots, sector, country]
  );

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Marchés</h1>
        <p className="mt-1 text-sm text-ink-3">
          {snapshots.length} actions BRVM · cours et volumes réels (bulletins
          officiels de la cote)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-3 w-14">
            Secteur
          </span>
          <FilterChip active={sector === null} label="Tous" onClick={() => setSector(null)} />
          {SECTORS.map((s) => (
            <FilterChip key={s} active={sector === s} label={s} onClick={() => setSector(sector === s ? null : s)} />
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-3 w-14">
            Pays
          </span>
          <FilterChip active={country === null} label="Tous" onClick={() => setCountry(null)} />
          {COUNTRIES.map((c) => (
            <FilterChip key={c} active={country === c} label={c} onClick={() => setCountry(country === c ? null : c)} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucune action ne correspond</p>
          <p className="mt-1 text-xs text-ink-3">
            Aucune société cotée pour cette combinaison secteur / pays.
          </p>
        </div>
      ) : (
        <StockTable stocks={filtered} />
      )}
    </div>
  );
}
