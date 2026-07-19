import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Crown, GitCompareArrows, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Tarifs" };

const free = ["Cours, actualités et 48 fiches actions", "Portefeuille local et synchronisé", "5 watchlists", "3 alertes de prix", "3 filtres enregistrés"];
const pro = ["Laboratoire 48 et comparaison multi-facteurs", "Exports du classement et de la recherche", "Watchlists et filtres sans limite", "100 alertes avancées", "Même droit sur web, iOS et Android"];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div className="max-w-3xl">
          <Badge tone="accent">Tarification simple</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-ink sm:text-5xl">Le marché reste public.<br />Pro accélère la recherche.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-2">Les cours, fondamentaux, actualités et fiches restent accessibles. WARIBA Pro finance les comparaisons, exports, alertes et workflows avancés — jamais une promesse de gain ni un conseil personnalisé.</p>
        </div>
        <Link href="/pro" className="group rounded-2xl border border-accent/30 bg-accent/7 p-5 transition-colors hover:bg-accent/10">
          <div className="flex items-center justify-between"><Crown className="h-5 w-5 text-accent" /><ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-1" /></div>
          <p className="mt-6 text-lg font-semibold text-ink">Accéder au Laboratoire 48</p>
          <p className="mt-1 text-xs leading-5 text-ink-3">Compte Pro requis pour le classement, les filtres, l’export et la comparaison.</p>
        </Link>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-7">
          <p className="text-sm font-semibold text-ink">Essentiel</p>
          <p className="num mt-3 text-4xl font-bold tracking-tight text-ink">0 FCFA</p>
          <p className="mt-1 text-xs text-ink-3">Sans carte bancaire</p>
          <ul className="mt-7 space-y-3 text-sm text-ink-2">{free.map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-up" />{item}</li>)}</ul>
          <Link href="/inscription" className="mt-8 flex h-11 items-center justify-center rounded-lg border border-line text-sm font-semibold text-ink hover:border-accent/40">Créer un espace gratuit</Link>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-accent/45 bg-surface p-6 shadow-xl shadow-accent/5 sm:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-up to-gold" />
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><Crown className="h-4 w-4 text-accent" /> WARIBA Pro</p><Badge tone="accent">Pro</Badge></div>
          <p className="num mt-3 text-3xl font-bold tracking-tight text-ink">3 000 FCFA <span className="text-sm font-medium text-ink-3">/ mois</span></p>
          <p className="mt-1 text-xs text-ink-3">30 000 FCFA / an lorsque le forfait annuel sera ouvert</p>
          <ul className="mt-7 space-y-3 text-sm text-ink-2">{pro.map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{item}</li>)}</ul>
          <div className="mt-8"><Link href="/pro" className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-semibold text-background hover:brightness-110">Activer WARIBA Pro <ArrowRight className="h-4 w-4" /></Link></div>
        </section>
      </div>

      <section className="mt-6 grid gap-3 rounded-2xl border border-line bg-surface p-5 text-xs leading-5 text-ink-3 sm:grid-cols-3">
        <div><GitCompareArrows className="h-4 w-4 text-accent" /><p className="mt-2 font-semibold text-ink">Comparer sans opacité</p><p className="mt-1">Même modèle, mêmes facteurs, confiance et exercice visibles.</p></div>
        <div><ShieldCheck className="h-4 w-4 text-accent" /><p className="mt-2 font-semibold text-ink">Aucune recommandation</p><p className="mt-1">Le score décrit une position relative ; il ne prédit pas le marché.</p></div>
        <div><Crown className="h-4 w-4 text-accent" /><p className="mt-2 font-semibold text-ink">Pensé Côte d’Ivoire</p><p className="mt-1">FCFA, français, paiements stores et exigences locales documentées.</p></div>
      </section>
      <p className="mt-5 text-[11px] leading-5 text-ink-3">Un même droit Pro est reconnu sur le web, iOS et Android lorsqu’il est rattaché au même compte. Les achats mobiles passent par l’App Store ou Google Play ; le web utilise Stripe.</p>
    </main>
  );
}
