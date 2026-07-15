/**
 * URL publique canonique. L'environnement de déploiement la fournit afin
 * que les callbacks Auth, Stripe et les métadonnées partagent la même base.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Origine seule, SANS le basePath — pour metadataBase : Next préfixe
 * lui-même les chemins d'images OG par le basePath, une base incluant
 * Le domaine de production est wariba.app ; aucun basePath n'est requis.
 */
export const SITE_ORIGIN = new URL(SITE_URL).origin;

/**
 * Jeton de vérification Google Search Console (balise HTML
 * « google-site-verification »). Vide = balise absente. Pour vérifier le
 * site : Search Console → Ajouter une propriété (préfixe d'URL) →
 * méthode « Balise HTML » → coller ici le contenu du token → déployer →
 * cliquer Vérifier, puis soumettre le sitemap :
 * https://wariba.app/sitemap.xml
 */
export const GOOGLE_SITE_VERIFICATION = "";
