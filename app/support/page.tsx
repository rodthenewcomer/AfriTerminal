import type { Metadata } from "next";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <main className="mx-auto max-w-3xl px-5 py-14"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Support</p><h1 className="mt-3 text-3xl font-bold text-ink">Un problème de données, compte ou facturation ?</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-ink-2">Indiquez votre appareil, la page concernée et la date du dernier bulletin visible. Ne transmettez jamais votre mot de passe, code OTP, clé API, donnée de portefeuille ou numéro de carte dans un ticket public.</p><a className="mt-7 inline-flex rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent" href="https://github.com/rodthenewcomer/WARIBA/issues/new">Ouvrir un ticket GitHub</a></main>;
}
