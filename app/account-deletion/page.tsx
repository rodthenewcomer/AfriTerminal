import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Suppression du compte" };

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14 text-sm leading-7 text-ink-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Confidentialité</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Supprimer votre compte WARIBA</h1>
      <p className="mt-5">
        Connectez-vous à votre espace WARIBA, ouvrez la section « Suppression du compte », puis confirmez
        « Supprimer définitivement ». La même action est disponible dans l’app mobile sous Réglages → Compte.
      </p>
      <p className="mt-4">
        Cette action supprime le compte et ses données serveur associées. Les données enregistrées uniquement
        sur un appareil restent locales et peuvent être effacées en supprimant les données de l’app ou du navigateur.
      </p>
      <p className="mt-4">
        Un abonnement acheté dans l’App Store ou Google Play doit être résilié séparément dans le store concerné ;
        supprimer le compte WARIBA n’annule pas automatiquement le contrat géré par le store.
      </p>
      <Link className="mt-7 inline-flex rounded-lg bg-accent/15 px-4 py-2.5 font-semibold text-accent" href="/account">
        Se connecter et supprimer le compte
      </Link>
      <p className="mt-8 text-xs text-ink-3">
        Si vous ne pouvez plus vous connecter, utilisez la page Support sans publier de donnée personnelle dans un ticket public.
      </p>
      <Link className="mt-2 inline-flex text-xs font-semibold text-accent underline" href="/support">
        Accéder au support WARIBA
      </Link>
    </main>
  );
}
