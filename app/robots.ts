import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Nota : servi sous /WARIBA/robots.txt tant que le site vit sur
 * Le site est servi à la racine de wariba.app, donc respecté par
 * les crawlers en l'état — le sitemap doit être déclaré manuellement
 * dans Search Console. Devient pleinement effectif avec un domaine
 * propre.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
