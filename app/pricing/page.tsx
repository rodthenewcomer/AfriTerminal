import type { Metadata } from "next";
import { Check } from "lucide-react";
import { BillingButton } from "@/components/billing/billing-button";

export const metadata: Metadata = { title: "Tarifs" };

const free = ["Marché et fiches actions", "Portefeuille local", "5 watchlists synchronisées", "3 alertes de prix", "3 filtres enregistrés"];
const pro = ["Watchlists et filtres sans limite", "100 alertes avancées", "Synchronisation web, iOS et Android", "Exports de recherche", "Support prioritaire"];

export default function PricingPage() {
  const price = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "Tarif de lancement à confirmer";
  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Tarification simple</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">Le marché reste public. Vous payez pour votre workflow.</h1>
        <p className="mt-4 text-sm leading-6 text-ink-2">WARIBA Pro finance la synchronisation, les alertes avancées et les outils de recherche. Aucun plan ne transforme l'information en conseil d'investissement.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface/70 p-6">
          <p className="text-sm font-semibold text-ink">Essentiel</p>
          <p className="mt-3 text-3xl font-bold text-ink">0 FCFA</p>
          <p className="mt-1 text-xs text-ink-3">Sans carte bancaire</p>
          <ul className="mt-6 space-y-3 text-sm text-ink-2">{free.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-up" />{item}</li>)}</ul>
          <a href="/inscription" className="mt-7 flex h-10 items-center justify-center rounded-lg border border-line text-sm font-semibold text-ink hover:border-accent/40">Créer un espace gratuit</a>
        </section>
        <section className="rounded-2xl border border-accent/40 bg-gradient-to-b from-accent/10 to-surface p-6 shadow-xl shadow-accent/5">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-ink">Pro</p><span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent">Pour investisseurs actifs</span></div>
          <p className="mt-3 text-3xl font-bold text-ink">{price}</p>
          <p className="mt-1 text-xs text-ink-3">Annulable depuis le portail client</p>
          <ul className="mt-6 space-y-3 text-sm text-ink-2">{pro.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{item}</li>)}</ul>
          <div className="mt-7"><BillingButton kind="checkout">Passer à Pro</BillingButton></div>
        </section>
      </div>
      <p className="mt-8 text-xs leading-5 text-ink-3">Les achats numériques dans les apps iOS et Android utiliseront les systèmes de facturation des stores lorsque leurs produits seront configurés. Un abonnement web existant reste visible sur tous vos appareils.</p>
    </main>
  );
}
