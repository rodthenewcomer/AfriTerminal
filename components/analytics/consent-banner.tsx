"use client";

import { Button } from "@/components/ui/button";

interface ConsentBannerProps {
  saving: boolean;
  onChoose: (granted: boolean) => void;
}

export function ConsentBanner({ saving, onChoose }: ConsentBannerProps) {
  return (
    <aside
      aria-label="Choix de mesure d'audience"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-xl border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur sm:flex sm:items-center sm:gap-4"
    >
      <p className="flex-1 text-xs leading-relaxed text-ink-2">
        Aidez-nous à améliorer WARIBA avec des statistiques d&apos;usage internes,
        sans publicité, sans IP stockée et conservées 90 jours. Votre choix reste modifiable dans Réglages.
      </p>
      <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
        <Button variant="outline" size="sm" disabled={saving} onClick={() => onChoose(false)}>
          Refuser
        </Button>
        <Button variant="accent" size="sm" disabled={saving} onClick={() => onChoose(true)}>
          Accepter
        </Button>
      </div>
    </aside>
  );
}
