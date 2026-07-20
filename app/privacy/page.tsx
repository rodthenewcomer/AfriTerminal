import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14 text-sm leading-7 text-ink-2">
      <h1 className="text-3xl font-bold text-ink">Confidentialité</h1>
      <p className="mt-5">WARIBA fonctionne sans compte pour consulter les informations publiques. Dans ce mode, aucune watchlist, transaction de portefeuille, alerte ou filtre personnel n&apos;est conservé comme session métier sur l&apos;appareil. Le thème, les réglages de graphique, la visite guidée et un cache de marché public peuvent rester sur l&apos;appareil.</p>
      <p className="mt-4">Si vous créez un compte, les données personnelles transitent par TLS vers Supabase et sont stockées dans des lignes privées protégées par Row Level Security. L&apos;adresse e-mail sert à l&apos;authentification et aux alertes explicitement activées. Les jetons Expo de vos appareils servent uniquement aux notifications push et sont désactivés à la déconnexion ou lorsqu&apos;un fournisseur les déclare invalides.</p>
      <p className="mt-4">La mesure d&apos;audience interne reste désactivée sans consentement. Si vous l&apos;acceptez, WARIBA collecte des événements fonctionnels pseudonymisés (pages, fonctions utilisées, surface web/iOS/Android), sans stocker l&apos;adresse IP brute ni contenu de portefeuille. Ces événements sont supprimés après 90 jours. Vous pouvez retirer votre consentement à tout moment dans Réglages.</p>
      <p className="mt-4">Supabase traite l&apos;authentification et les données privées, Stripe la facturation web, RevenueCat les droits d&apos;achat mobile, Expo les push et Resend les e-mails transactionnels. WARIBA ne stocke aucun numéro de carte.</p>
      <p className="mt-4">Vous pouvez exporter les données chargées depuis votre compte, désactiver les notifications ou supprimer votre compte depuis Réglages &gt; Compte. La suppression efface les données serveur associées et nettoie les données personnelles en mémoire sur l&apos;appareil. La procédure web reste accessible sur la page <a className="text-accent underline" href="/account-deletion">Suppression du compte</a>. Les journaux techniques limités nécessaires à la sécurité et à la fiabilité sont conservés séparément.</p>
      <p className="mt-4">Pour toute demande, utilisez la page <a className="text-accent underline" href="/support">Support WARIBA</a> et ne transmettez aucune donnée financière personnelle non demandée.</p>
      <p className="mt-8 text-xs text-ink-3">Version du 20 juillet 2026. À faire valider par le conseil juridique avant publication commerciale.</p>
    </main>
  );
}
