"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { fcfa, pct } from "@wariba/core/format";
import { cn } from "@wariba/core/utils";
import { Dialog } from "@/components/ui/dialog";

import { create } from "zustand";

// État partagé : le header monte DEUX déclencheurs (barre desktop +
// icône mobile) — chacun avait sa propre modale et son écouteur ⌘K,
// donc deux modales empilées s'ouvraient. Un seul dialog global
// (GlobalSearchDialog, monté une fois dans AppShell), des déclencheurs
// muets.
export const useSearchOpen = create<{ open: boolean; setOpen: (v: boolean) => void }>(
  (set) => ({ open: false, setOpen: (open) => set({ open }) })
);

export function GlobalSearch({ trigger }: { trigger?: "icon" | "bar" }) {
  const setOpen = useSearchOpen((s) => s.setOpen);
  return trigger === "icon" ? (
    <button
      onClick={() => setOpen(true)}
      aria-label="Rechercher"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink cursor-pointer"
    >
      <Search className="h-4 w-4" />
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 text-sm text-ink-3 hover:bg-surface-2 cursor-pointer"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Rechercher une action…</span>
      <kbd className="hidden sm:inline rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}

export function GlobalSearchDialog() {
  const { open, setOpen } = useSearchOpen();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useSearchOpen.setState((s) => ({ open: !s.open }));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = getSnapshots();
    if (!q) return all.slice(0, 8);
    return all
      .filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query]);

  const go = useCallback(
    (ticker: string) => {
      setOpen(false);
      router.push(`/stocks/${ticker}`);
    },
    [router, setOpen]
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="sm:max-w-lg">
        <div className="p-3 border-b border-line">
          <div className="flex items-center gap-2 pr-8">
            <Search className="h-4 w-4 text-ink-3 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === "Enter" && results[cursor]) {
                  go(results[cursor].ticker);
                }
              }}
              placeholder="Ticker, société, secteur, pays…"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none"
            />
          </div>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-ink-3">
              Aucun résultat pour « {query} »
            </li>
          ) : (
            results.map((s, i) => (
              <li key={s.ticker}>
                <button
                  onClick={() => go(s.ticker)}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left cursor-pointer",
                    i === cursor ? "bg-surface-2" : ""
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-[10px] font-bold text-accent">
                    {s.ticker.slice(0, 4)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {s.name}
                    </span>
                    <span className="block text-xs text-ink-3">
                      {s.sector} · {s.country}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm num font-medium text-ink">
                      {fcfa(s.lastPrice)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center justify-end gap-0.5 text-xs num",
                        s.dayChange >= 0 ? "text-up" : "text-down"
                      )}
                    >
                      {s.dayChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {pct(s.dayChange)}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
    </Dialog>
  );
}
