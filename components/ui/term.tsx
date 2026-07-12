"use client";

import type { ReactNode } from "react";
import { GLOSSARY } from "@/lib/glossary";
import { TooltipBubble } from "@/components/ui/tooltip-bubble";
import { useTapTooltip } from "@/hooks/use-tap-tooltip";

/**
 * Terme de glossaire : soulignement pointillé + bulle de définition au
 * survol, au focus clavier ou au tap (mobile, épinglé — voir useTapTooltip).
 */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const { ref, pos, bind } = useTapTooltip<HTMLButtonElement>();
  const entry = GLOSSARY[id];
  if (!entry) return <>{children}</>;

  return (
    <>
      <button
        ref={ref}
        type="button"
        {...bind}
        aria-label={`Définition : ${entry.label}`}
        className="cursor-help underline decoration-ink-3/60 decoration-dotted underline-offset-2 uppercase"
      >
        {children}
      </button>
      <TooltipBubble pos={pos} label={entry.label} text={entry.def} />
    </>
  );
}
