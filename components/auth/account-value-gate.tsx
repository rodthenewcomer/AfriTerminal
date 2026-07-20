"use client";

import Link from "next/link";
import { BellRing, Cloud, ShieldCheck } from "lucide-react";

const DEFAULT_BENEFITS = [
  "Retrouvez vos actions et votre portefeuille sur web, iPhone et Android.",
  "Recevez les publications, dividendes et mouvements qui concernent vos titres.",
  "Vos données personnelles sont protégées par votre compte et synchronisées dans le cloud.",
];

export function AccountValueGate({
  title,
  description,
  next,
  benefits = DEFAULT_BENEFITS,
}: {
  title: string;
  description: string;
  next: string;
  benefits?: string[];
}) {
  const icons = [Cloud, BellRing, ShieldCheck];
  const target = encodeURIComponent(next);

  return (
    <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/12 via-surface to-gold/8 shadow-xl shadow-accent/5">
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Votre espace WARIBA
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">{description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/inscription?next=${target}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-105"
            >
              Créer mon compte gratuit
            </Link>
            <Link
              href={`/connexion?next=${target}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface/80 px-5 text-sm font-semibold text-ink transition hover:bg-surface-2"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-ink-3">
            Le marché et le screener restent publics. Le compte protège et synchronise ce qui vous appartient.
          </p>
        </div>
        <div className="space-y-3">
          {benefits.map((benefit, index) => {
            const Icon = icons[index % icons.length];
            return (
              <div key={benefit} className="flex gap-3 rounded-2xl border border-line/80 bg-surface/80 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm leading-5 text-ink-2">{benefit}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
