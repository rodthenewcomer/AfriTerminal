import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/**
 * PWA installable : l'app s'ajoute à l'écran d'accueil Android/iOS.
 * Chemins absolus avec le basePath GitHub Pages (/AfriTerminal).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfriTerminal — La BRVM devient lisible",
    short_name: "AfriTerminal",
    description:
      "Terminal BRVM : cours officiels, carte du marché, alertes et actualités des 48 sociétés cotées.",
    start_url: "/AfriTerminal/",
    scope: "/AfriTerminal/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/AfriTerminal/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
