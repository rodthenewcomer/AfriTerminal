"use client";

import Link from "next/link";
import { LogIn, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "./auth-provider";

export function AccountControl() {
  const { configured, loading, user } = useAuth();
  if (!user && !loading) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/connexion"
          aria-label={configured ? "Se connecter" : "Connexion — configuration en cours"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface/60 px-2.5 text-[11px] font-semibold text-ink transition-colors hover:border-accent/45 sm:px-3 sm:text-xs"
        >
          <LogIn className="h-3.5 w-3.5" />
          Connexion
        </Link>
        <Link
          href="/inscription"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-[11px] font-bold text-background shadow-lg shadow-accent/15 transition-[filter] hover:brightness-110 sm:px-3 sm:text-xs"
        >
          <UserPlus className="hidden h-3.5 w-3.5 sm:block" />
          S&apos;inscrire
        </Link>
      </div>
    );
  }
  const label = loading ? "Chargement du compte" : user?.email ? `Compte ${user.email}` : "Compte";
  return (
    <Link
      href={user ? "/account" : "/connexion"}
      aria-label={label}
      title={label}
      className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-surface/60 px-2 text-ink-2 transition-colors hover:border-accent/35 hover:text-ink"
    >
      <UserRound className="h-4 w-4" />
      {user?.email ? <span className="ml-2 hidden max-w-28 truncate text-[11px] xl:inline">{user.email}</span> : null}
    </Link>
  );
}
