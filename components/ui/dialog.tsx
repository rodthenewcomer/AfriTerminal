"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose est souvent une arrow inline : la mettre dans les deps
  // relançait l'effet à chaque render du parent, dont le cleanup
  // renvoyait le focus HORS de la modale à chaque frappe.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // Focus trap : Tab reste dans la modale (accessibilité clavier), le
    // focus revient à l'élément déclencheur à la fermeture.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) ?? [];
    const first = focusables()[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab") return;
      const els = [...focusables()];
      if (els.length === 0) return;
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || !panelRef.current?.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  // Portail vers <body> : rendu en place, un ancêtre avec transform,
  // filter ou backdrop-filter (header flouté, page .fade-in...) devient
  // le référentiel du position:fixed — la modale s'ouvrait décalée en
  // bas et rognée. Le portail échappe à tout containing block.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          "relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto card-glass !bg-surface shadow-2xl fade-in rounded-t-2xl rounded-b-none sm:rounded-2xl",
          className
        )}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
