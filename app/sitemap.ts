import type { MetadataRoute } from "next";
import { getSnapshots } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { COTE_DIVOIRE_SGIS } from "@wariba/core/sgi";

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
    "/map",
    "/screener",
    "/charts",
    "/portfolio",
    "/watchlist",
    "/dividendes",
    "/news",
    "/operations",
    "/alerts",
    "/sgi",
    "/pro",
    "/pricing",
    "/status",
    "/methodologie",
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

  const sgis = COTE_DIVOIRE_SGIS.map((sgi) => ({
    url: `${SITE_URL}/sgi/${sgi.id}/`,
    lastModified: new Date(`${sgi.verifiedOn}T12:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...sections, ...stocks, ...sgis];
}
