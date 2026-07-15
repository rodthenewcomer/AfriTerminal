"use client";

import { useMemo, useState } from "react";
import { getSnapshots } from "@/lib/data";
import { usePortfolio } from "@/hooks/use-portfolio";
import { fcfa } from "@wariba/core/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@wariba/core/utils";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Saisie d'une transaction (achat/vente). Le prix est prérempli avec le
 * dernier cours officiel du titre choisi — modifiable, car le prix
 * d'exécution réel de l'utilisateur peut différer.
 */
export function TransactionDialog({
  open,
  onClose,
  presetTicker,
}: {
  open: boolean;
  onClose: () => void;
  presetTicker?: string;
}) {
  const add = usePortfolio((s) => s.add);
  const snapshots = useMemo(
    () => getSnapshots().slice().sort((a, b) => a.ticker.localeCompare(b.ticker)),
    []
  );

  const [ticker, setTicker] = useState(presetTicker ?? "");
  const [side, setSide] = useState<"achat" | "vente">("achat");
  const [date, setDate] = useState(todayIso());
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectTicker = (t: string) => {
    setTicker(t);
    const snap = snapshots.find((s) => s.ticker === t);
    if (snap && !price) setPrice(String(snap.lastPrice));
  };

  const submit = () => {
    const qty = parseInt(quantity, 10);
    const px = parseFloat(price.replace(",", "."));
    const fee = fees ? parseFloat(fees.replace(",", ".")) : undefined;
    if (!ticker) return setError("Choisissez une valeur.");
    if (!Number.isFinite(qty) || qty <= 0)
      return setError("Quantité invalide (nombre entier positif).");
    if (!Number.isFinite(px) || px <= 0) return setError("Prix invalide.");
    if (fee !== undefined && (!Number.isFinite(fee) || fee < 0))
      return setError("Frais invalides.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayIso())
      return setError("Date invalide (pas dans le futur).");

    add({ ticker, side, date, quantity: qty, price: px, fees: fee });
    setQuantity("");
    setFees("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-5 sm:p-6 space-y-4">
        <header className="pr-8">
          <h2 className="text-base font-semibold text-ink">
            Ajouter une transaction
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Enregistrée uniquement dans ce navigateur — rien n&apos;est envoyé.
          </p>
        </header>

        <div className="flex gap-1 rounded-lg border border-line bg-surface-2/60 p-0.5">
          {(["achat", "vente"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-xs font-semibold capitalize cursor-pointer transition-colors",
                side === s
                  ? s === "achat"
                    ? "bg-up/15 text-up border border-up/30"
                    : "bg-down/15 text-down border border-down/30"
                  : "text-ink-3 hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Valeur</span>
            <Select value={ticker} onChange={(e) => selectTicker(e.target.value)} className="w-full">
              <option value="">Choisir…</option>
              {snapshots.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Date</span>
            <Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Quantité (titres)</span>
            <Input inputMode="numeric" placeholder="ex. 10" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Prix par action (FCFA)</span>
            <Input inputMode="decimal" placeholder="ex. 25 000" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Frais SGI (FCFA, optionnel)</span>
            <Input inputMode="decimal" placeholder="ex. 2 500" value={fees} onChange={(e) => setFees(e.target.value)} />
          </label>
        </div>

        {ticker && quantity && price ? (
          <p className="text-xs text-ink-3">
            Montant : {" "}
            <span className="num font-semibold text-ink">
              {fcfa((parseInt(quantity, 10) || 0) * (parseFloat(price.replace(",", ".")) || 0))}
            </span>
            {fees ? ` + ${fcfa(parseFloat(fees.replace(",", ".")) || 0)} de frais` : ""}
          </p>
        ) : null}

        {error ? <p className="text-xs font-medium text-down">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="accent" size="sm" onClick={submit}>
            Enregistrer la transaction
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
