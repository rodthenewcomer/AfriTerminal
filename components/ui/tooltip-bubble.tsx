"use client";

import { createPortal } from "react-dom";
import type { TapTooltipPos } from "@/hooks/use-tap-tooltip";

/** Bulle d'aide partagée par Term et InfoHint — rendue en portail (position
 * fixed) pour ignorer les overflow/containing blocks des cartes/tableaux. */
export function TooltipBubble({
  pos,
  label,
  text,
}: {
  pos: TapTooltipPos | null;
  label: string;
  text: string;
}) {
  if (pos === null || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[60] w-64 rounded-lg border border-line bg-surface p-2.5 text-left shadow-xl"
      style={{
        left: Math.min(Math.max(pos.x - 128, 8), window.innerWidth - 264),
        top: Math.min(pos.y + 8, window.innerHeight - 140),
      }}
    >
      <p className="text-[11px] font-bold text-ink normal-case">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed normal-case tracking-normal text-ink-2">
        {text}
      </p>
    </div>,
    document.body
  );
}
