import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/**
 * PWA installable : l'app s'ajoute à l'écran d'accueil Android/iOS.
 * Manifest commun au domaine web et à l'installation PWA.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WARIBA — La BRVM, clairement",
    short_name: "WARIBA",
    description:
      "Terminal BRVM : cours officiels, carte du marché, alertes et actualités des 48 sociétés cotées.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06110d",
    theme_color: "#06110d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
