"use client";

import type { ReactNode } from "react";
import { TooltipBubble } from "@/components/ui/tooltip-bubble";
import { useTapTooltip } from "@/hooks/use-tap-tooltip";

/**
 * Enrobe un élément (badge, en-tête de colonne...) d'une explication
 * accessible au survol, au focus ET au tap — remplace `title=`, invisible
 * sur mobile (pas de survol tactile). `label` est le titre de la bulle,
 * `text` son contenu ; `children` reste visuellement inchangé.
 */
export function InfoHint({
  label,
  text,
  children,
  className = "",
}: {
  label: string;
  text: string;
  children: ReactNode;
  className?: string;
}) {
  const { ref, pos, bind } = useTapTooltip<HTMLButtonElement>();

  return (
    <>
      <button
        ref={ref}
        type="button"
        {...bind}
        aria-label={label}
        className={`cursor-help rounded focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      >
        {children}
      </button>
      <TooltipBubble pos={pos} label={label} text={text} />
    </>
  );
}
