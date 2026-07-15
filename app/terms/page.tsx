import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-5 py-14 text-sm leading-7 text-ink-2"><h1 className="text-3xl font-bold text-ink">Conditions d'utilisation</h1><p className="mt-5">WARIBA fournit des données, graphiques et outils descriptifs à visée informative et éducative. Aucun contenu ne constitue un conseil en investissement, une recommandation personnalisée, une offre d'achat ou de vente, ni une affiliation officielle à la BRVM.</p><p className="mt-4">Les cours proviennent de publications officielles et peuvent être différés, corrigés ou incomplets. Vous restez responsable de vérifier toute information avant une décision financière. Les fonctions payantes améliorent le suivi et l'organisation ; elles ne garantissent ni performance, ni livraison temps réel.</p><p className="mt-4">Un abonnement web peut être annulé depuis le portail de facturation. Les achats numériques effectués dans une app distribuée par un store suivent les conditions et mécanismes de ce store.</p><p className="mt-8 text-xs text-ink-3">Version du 14 juillet 2026. Document opérationnel à faire valider juridiquement avant monétisation publique.</p></main>;
}
