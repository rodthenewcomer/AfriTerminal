import Link from "next/link";
import { Check, Crown, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BillingButton } from "@/components/billing/billing-button";

const PRO_FEATURES = [
  "Laboratoire 48 et classement multi-facteurs",
  "Comparaison détaillée de plusieurs sociétés",
  "Exports de recherche et filtres sans limite",
  "Alertes avancées et seuils étendus",
] as const;

const ACCESS_LAYERS = [
  {
    layer: "Public",
    price: "Accès libre",
    items: "Explorez le marché, les 48 actions, leurs graphiques, fondamentaux, actualités, documents, dividendes et le screener.",
  },
  {
    layer: "Compte gratuit",
    price: "Gratuit",
    items: "Suivez vos actions, votre portefeuille et vos alertes sur tous vos appareils.",
  },
  {
    layer: "WARIBA Pro",
    price: "3 000 FCFA / mois",
    items: "Comparez toute la cote, classez par facteurs, utilisez les filtres avancés et exportez vos recherches.",
  },
] as const;

export function ProAccessGate({
  authenticated,
  checkoutAvailable,
}: {
  authenticated: boolean;
  checkoutAvailable: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4 sm:py-8">
      <section className="overflow-hidden rounded-2xl border border-accent/35 bg-surface">
        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">WARIBA Pro</Badge>
              <Badge tone="neutral"><LockKeyhole className="h-3 w-3" /> Analyse avancée</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.04em] text-ink sm:text-4xl">
              Comparez les 48 actions en profondeur.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
              Classez les sociétés, confrontez leurs forces et leurs risques, puis exportez votre travail dans un seul espace.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/55 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <Crown className="h-4 w-4 text-accent" /> 3 000 FCFA / mois
            </p>
            <p className="mt-1 text-xs text-ink-3">30 000 FCFA / an lors de l’ouverture du forfait annuel.</p>
            <div className="mt-4">
              {authenticated ? (
                checkoutAvailable ? (
                  <BillingButton kind="checkout">Activer WARIBA Pro</BillingButton>
                ) : (
                  <Link href="/account" className="flex h-10 items-center justify-center rounded-lg bg-accent px-3 text-xs font-semibold text-background">
                    Voir mon forfait
                  </Link>
                )
              ) : (
                <div className="grid gap-2">
                  <Link href="/inscription?next=/pro" className="flex h-10 items-center justify-center rounded-lg bg-accent px-3 text-xs font-semibold text-background">
                    Créer un compte
                  </Link>
                  <Link href="/connexion?next=/pro" className="flex h-10 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-ink">
                    Se connecter
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {PRO_FEATURES.map((feature) => (
          <div key={feature} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {feature}
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-ink">Choisissez votre expérience</h2>
          <p className="mt-1 text-xs text-ink-3">
            Commencez librement, créez un compte pour suivre vos placements, puis passez à Pro lorsque vous avez besoin de comparer plus vite.
          </p>
        </div>
        <div className="divide-y divide-line">
          {ACCESS_LAYERS.map((layer) => (
            <div key={layer.layer} className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_140px_1fr] sm:items-start">
              <p className="text-sm font-bold text-ink">{layer.layer}</p>
              <p className="text-xs font-semibold text-accent">{layer.price}</p>
              <p className="text-xs leading-5 text-ink-2">{layer.items}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface/60 p-4 text-xs leading-5 text-ink-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
        Aucun score Pro n’est un ordre, une recommandation personnalisée ou une promesse de rendement. Méthode, date, exercice, couverture et confiance restent visibles dans chaque analyse.
      </p>
    </div>
  );
}
