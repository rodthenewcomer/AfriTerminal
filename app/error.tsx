"use client";

import { useEffect } from "react";

/**
 * Boundary d'erreur globale. Cas principal visé : le « chunk périmé » —
 * un onglet ouvert sur un ancien déploiement clique vers une page dont
 * le fichier JS haché n'existe plus sur le déploiement actif (chaque version
 * remplace tout). Dans ce cas, recharger suffit : le HTML frais pointe
 * vers les nouveaux fichiers. On recharge automatiquement UNE fois
 * (verrou sessionStorage pour ne jamais boucler), sinon on affiche un
 * écran d'erreur propre en français.
 */

const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk|css chunk|fetch dynamically imported module|Importing a module script failed/i;

const RELOAD_LOCK = "wariba-chunk-reload";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isStaleChunk = CHUNK_ERROR.test(`${error.name} ${error.message}`);

  useEffect(() => {
    if (isStaleChunk && !sessionStorage.getItem(RELOAD_LOCK)) {
      sessionStorage.setItem(RELOAD_LOCK, "1");
      window.location.reload();
    }
  }, [isStaleChunk]);

  useEffect(() => {
    // Un rendu réussi plus tard, le verrou n'a plus lieu d'être.
    const timer = setTimeout(() => sessionStorage.removeItem(RELOAD_LOCK), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-ink">
        {isStaleChunk
          ? "Nouvelle version disponible — rechargement…"
          : "Une erreur est survenue."}
      </p>
      {!isStaleChunk ? (
        <p className="max-w-sm text-xs text-ink-3">
          L&apos;application a rencontré un problème inattendu. Recharger la
          page suffit généralement.
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          Recharger la page
        </button>
        {!isStaleChunk ? (
          <button
            onClick={reset}
            className="rounded-lg border border-line px-3.5 py-2 text-xs font-medium text-ink-2 cursor-pointer hover:bg-surface-2"
          >
            Réessayer
          </button>
        ) : null}
      </div>
    </div>
  );
}
