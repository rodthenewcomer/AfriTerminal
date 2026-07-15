"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSignature } from "./brand-signature";
import { migratedStorageKey } from "@/lib/storage-keys";

/**
 * Première visite — bannière discrète (pas de carrousel bloquant sur le
 * web) qui propose une visite guidée en 4 étapes ancrées sur les vrais
 * éléments de l'interface via [data-tour]. Si un ancrage n'est pas
 * visible (ex. Screener replié dans la feuille « + » sur mobile), la
 * carte est centrée sans projecteur. Un seul enregistrement
 * localStorage : vue ou refusée, la bannière ne revient pas.
 */

const STORAGE_KEY = migratedStorageKey("wariba:tour", "tour", ":");
const TOUR_VERSION = "v1";

const STEPS = [
  {
    anchor: "search",
    title: "Trouvez n'importe quelle société",
    body: "Recherchez par ticker (SNTS, ORAC…) ou par nom parmi les 48 sociétés cotées. Chaque fiche réunit cours, dividendes, fondamentaux vérifiés et documents officiels.",
  },
  {
    anchor: "screener",
    title: "Filtrez le marché",
    body: "Le screener classe les valeurs par secteur, rendement du dividende, PER ou liquidité — et vos filtres se sauvegardent pour la prochaine visite.",
  },
  {
    anchor: "alerts",
    title: "Posez des seuils de prix",
    body: "Vos alertes sont évaluées contre le cours officiel de clôture à chaque ouverture — honnête, sans promettre du temps réel.",
  },
  {
    anchor: "portfolio",
    title: "Suivez votre portefeuille",
    body: "Transactions, PRU, plus/moins-values et dividendes perçus, calculés dans votre navigateur. Rien n'est envoyé — pensez à la sauvegarde JSON dans Réglages.",
  },
] as const;

type SpotRect = { top: number; left: number; width: number; height: number };

function findAnchorRect(anchor: string): SpotRect | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`);
  for (const element of candidates) {
    if (!element.offsetParent && element.style.position !== "fixed") continue;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    }
  }
  return null;
}

export function WelcomeTour() {
  const [banner, setBanner] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<SpotRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Après montage seulement (localStorage absent au rendu statique).
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== TOUR_VERSION) setBanner(true);
    } catch {
      // Stockage indisponible (navigation privée stricte) : rien à faire.
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, TOUR_VERSION);
    } catch {
      // Sans stockage, la bannière reviendra — acceptable.
    }
    setBanner(false);
    setStep(null);
  }, []);

  const measure = useCallback(() => {
    if (step === null) return;
    setRect(findAnchorRect(STEPS[step].anchor));
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    measure();
    cardRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
      if (event.key === "ArrowRight" && step < STEPS.length - 1) setStep(step + 1);
      if (event.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [dismiss, measure, step]);

  if (step !== null) {
    const current = STEPS[step];
    const last = step === STEPS.length - 1;
    const pad = 6;
    const cardWidth = Math.min(360, window.innerWidth - 24);
    const cardStyle: React.CSSProperties = rect
      ? {
          width: cardWidth,
          left: Math.min(Math.max(12, rect.left), window.innerWidth - cardWidth - 12),
          ...(rect.top + rect.height + 200 < window.innerHeight
            ? { top: rect.top + rect.height + pad + 12 }
            : { bottom: window.innerHeight - rect.top + pad + 12 }),
        }
      : { width: cardWidth, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

    return (
      <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Visite guidée">
        {rect ? (
          <div
            className="fixed rounded-xl border border-accent/70 transition-all duration-300"
            style={{
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.62)",
            }}
          />
        ) : (
          <div className="fixed inset-0 bg-black/60" onClick={dismiss} />
        )}
        <div
          ref={cardRef}
          tabIndex={-1}
          className="fixed rounded-2xl border border-line bg-surface p-4 shadow-2xl outline-none fade-in"
          style={cardStyle}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              Étape {step + 1} / {STEPS.length}
            </p>
            <button
              onClick={dismiss}
              aria-label="Fermer la visite"
              className="rounded-lg p-1 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <h2 className="text-sm font-semibold text-ink">{current.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{current.body}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1" aria-hidden="true">
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={
                    index === step
                      ? "h-1.5 w-5 rounded-full bg-accent transition-all"
                      : "h-1.5 w-1.5 rounded-full bg-surface-2 transition-all"
                  }
                />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  Précédent
                </Button>
              ) : null}
              <Button
                variant="accent"
                size="sm"
                onClick={() => (last ? dismiss() : setStep(step + 1))}
              >
                {last ? "Terminer" : "Suivant"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!banner) return null;

  return (
    <div className="fade-in mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-nowrap">
      <BrandSignature className="h-12 w-[86px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Nouveau sur la BRVM ?</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
          Visite guidée de 2 minutes : recherche, screener, alertes et portefeuille —
          tout est calculé à partir des publications officielles.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="accent" size="sm" onClick={() => setStep(0)}>
          Commencer la visite
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Plus tard
        </Button>
      </div>
    </div>
  );
}
