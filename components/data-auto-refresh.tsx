"use client";

import { useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 60_000;

/** Une nouvelle version Vercel contient un nouveau snapshot JSON et de
 * nouveaux bundles. Un rechargement atomique évite de mélanger données
 * anciennes et composants récents sur un onglet resté ouvert. */
export function DataAutoRefresh() {
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!active || document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/data/version.json?v=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!response.ok) return;
        const payload = await response.json() as { version?: unknown };
        if (typeof payload.version !== "string") return;
        if (versionRef.current && versionRef.current !== payload.version) {
          window.location.reload();
          return;
        }
        versionRef.current = payload.version;
      } catch {
        // Le prochain passage retente ; une panne réseau ne doit pas
        // interrompre l'utilisation des données déjà affichées.
      }
    };

    void check();
    const id = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisibility = () => void check();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
