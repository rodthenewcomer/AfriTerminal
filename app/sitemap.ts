import type { MetadataRoute } from "next";
import { getSnapshots } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Export statique : le sitemap est généré au build, comme tout le site.
export const dynamic = "force-static";

/**
 * Sitemap programmatique : une entrée par société cotée (48 fiches avec
 * cours réels et historique depuis 2019) + les pages de section. C'est le
 * socle du SEO produit (« cours Sonatel BRVM », « dividende SGBC »...).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const sections = [
    "",
    "/dashboard",
    "/markets",
    "/map",
    "/screener",
    "/watchlist",
    "/news",
    "/documents",
    "/alerts",
    "/ipo",
    "/status",
  ].map((path) => ({
    url: `${SITE_URL}${path}/`,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const stocks = getSnapshots().map((s) => ({
    url: `${SITE_URL}/stocks/${s.ticker}/`,
    // La donnée de chaque fiche change à chaque séance.
    lastModified: s.real ? new Date(`${s.real.asOfDate}T18:00:00Z`) : undefined,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...sections, ...stocks];
}
