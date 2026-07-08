"use client";

import { useEffect, type ReactNode } from "react";
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

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
