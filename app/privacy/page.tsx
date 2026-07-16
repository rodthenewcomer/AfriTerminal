import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14 text-sm leading-7 text-ink-2">
      <h1 className="text-3xl font-bold text-ink">Confidentialité</h1>
      <p className="mt-5">WARIBA fonctionne sans compte. Dans ce mode, watchlists, portefeuille, alertes et préférences restent sur votre appareil.</p>
      <p className="mt-4">Si vous créez un compte et lancez la synchronisation, ces données transitent par TLS vers Supabase et sont stockées dans des lignes privées protégées par Row Level Security. L&apos;adresse e-mail sert à l&apos;authentification et aux alertes explicitement activées. Les jetons Expo de vos appareils servent uniquement aux notifications push et sont désactivés à la déconnexion ou lorsqu&apos;un fournisseur les déclare invalides.</p>
      <p className="mt-4">La mesure d&apos;audience interne reste désactivée sans consentement. Si vous l&apos;acceptez, WARIBA collecte des événements fonctionnels pseudonymisés (pages, fonctions utilisées, surface web/iOS/Android), sans stocker l&apos;adresse IP brute ni contenu de portefeuille. Ces événements sont supprimés après 90 jours. Vous pouvez retirer votre consentement à tout moment dans Réglages.</p>
      <p className="mt-4">Supabase traite l&apos;authentification et les données privées, Stripe la facturation web, RevenueCat les droits d&apos;achat mobile, Expo les push et Resend les e-mails transactionnels. WARIBA ne stocke aucun numéro de carte.</p>
      <p className="mt-4">Vous pouvez exporter vos données locales, désactiver les notifications ou supprimer votre compte depuis Réglages &gt; Compte. La suppression efface les données serveur associées. La procédure web reste accessible sur la page <a className="text-accent underline" href="/account-deletion">Suppression du compte</a>. Les journaux techniques limités nécessaires à la sécurité et à la fiabilité sont conservés séparément.</p>
      <p className="mt-4">Le canal de contact public actuel est la page <a className="text-accent underline" href="https://github.com/rodthenewcomer/WARIBA/issues">GitHub Issues WARIBA</a>. N&apos;y publiez aucune donnée financière personnelle.</p>
      <p className="mt-8 text-xs text-ink-3">Version du 15 juillet 2026. À faire valider par le conseil juridique avant publication commerciale.</p>
    </main>
  );
}
