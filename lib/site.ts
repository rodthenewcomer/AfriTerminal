/**
 * URL publique canonique du site (GitHub Pages). À changer ici (et dans
 * NEXT_PUBLIC_BASE_PATH du workflow deploy.yml) le jour d'un domaine
 * propre — le sitemap et les métadonnées la consomment.
 */
export const SITE_URL = "https://rodthenewcomer.github.io/AfriTerminal";

/**
 * Origine seule, SANS le basePath — pour metadataBase : Next préfixe
 * lui-même les chemins d'images OG par le basePath, une base incluant
 * /AfriTerminal doublait le segment dans les URLs og:image.
 */
export const SITE_ORIGIN = "https://rodthenewcomer.github.io";

/**
 * Jeton de vérification Google Search Console (balise HTML
 * « google-site-verification »). Vide = balise absente. Pour vérifier le
 * site : Search Console → Ajouter une propriété (préfixe d'URL) →
 * méthode « Balise HTML » → coller ici le contenu du token → déployer →
 * cliquer Vérifier, puis soumettre le sitemap :
 * https://rodthenewcomer.github.io/AfriTerminal/sitemap.xml
 */
export const GOOGLE_SITE_VERIFICATION = "";
