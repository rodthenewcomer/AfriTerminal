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
              <Badge tone="neutral"><LockKeyhole className="h-3 w-3" /> Accès protégé</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.04em] text-ink sm:text-4xl">
              Les faits restent publics. La recherche avancée devient Pro.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
              Cours, fondamentaux sourcés, documents officiels, actualités et graphiques essentiels restent accessibles à tous. Pro protège les calculs comparatifs, exports et workflows intensifs.
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

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface/60 p-4 text-xs leading-5 text-ink-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
        Aucun score Pro n’est un ordre, une recommandation personnalisée ou une promesse de rendement. Méthode, date, exercice, couverture et confiance restent visibles dans chaque analyse.
      </p>
    </div>
  );
}
