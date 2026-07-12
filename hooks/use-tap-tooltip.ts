"use client";

import { useEffect, useRef, useState } from "react";

export interface TapTooltipPos {
  x: number;
  y: number;
}

/**
 * Comportement partagé des bulles d'aide (Term, InfoHint) : survol/focus
 * sur desktop, tap pour épingler sur mobile — épinglé car un tap n'a pas
 * de mouseleave pour refermer la bulle. `pinnedRef` (pas un state) évite
 * que le show() du survol et le hide() du clic s'annulent dans le même
 * batch React au clic. Un tap ailleurs sur la page referme la bulle
 * épinglée : sans ça, elle restait bloquée à l'écran jusqu'au prochain
 * tap exact sur le même mot — inutilisable une fois la page défilée.
 */
export function useTapTooltip<T extends HTMLElement>() {
  const [pos, setPos] = useState<TapTooltipPos | null>(null);
  const pinnedRef = useRef(false);
  const ref = useRef<T>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.bottom });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (pos === null) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!pinnedRef.current) return;
      if (ref.current?.contains(e.target as Node)) return;
      pinnedRef.current = false;
      hide();
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [pos]);

  const bind = {
    onMouseEnter: () => {
      if (!pinnedRef.current) show();
    },
    onMouseLeave: () => {
      if (!pinnedRef.current) hide();
    },
    onFocus: () => {
      if (!pinnedRef.current) show();
    },
    onBlur: () => {
      if (!pinnedRef.current) hide();
    },
    onClick: () => {
      pinnedRef.current = !pinnedRef.current;
      if (pinnedRef.current) show();
      else hide();
    },
  };

  return { ref, pos, bind };
}
