"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, LoaderCircle, LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useCloudSync } from "@/components/auth/cloud-sync-provider";
import { BillingButton } from "@/components/billing/billing-button";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

interface AccountData {
  user: { id: string; email?: string };
  profile: { display_name: string | null; experience_level: string | null; created_at: string };
  subscription: { provider: "stripe" | "apple" | "google"; status: string; plan: "free" | "pro" | "team"; current_period_end: string | null; cancel_at_period_end: boolean };
  entitlements: { key: string; enabled: boolean; numeric_limit: number | null }[];
}

export default function AccountPage() {
  const { configured, loading, user, session, signOut } = useAuth();
  const { status: syncStatus, lastSyncedAt, error: automaticSyncError, syncNow } = useCloudSync();
  const [data, setData] = useState<AccountData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    const response = await fetch("/api/v1/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) throw new Error("Impossible de charger le compte.");
    setData(await response.json());
  }, [session?.access_token]);

  useEffect(() => {
    void refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Compte indisponible"));
  }, [refresh]);

  const sync = async () => {
    if (!session?.access_token) return;
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      await syncNow();
      setMessage("Vos changements web et mobile sont réconciliés dans votre espace privé.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Synchronisation impossible");
    } finally {
      setBusy(null);
    }
  };

  const removeAccount = async () => {
    const storeWarning = data?.subscription.provider === "apple" || data?.subscription.provider === "google"
      ? " Votre abonnement App Store ou Google Play doit être résilié séparément."
      : "";
    if (!session?.access_token || !window.confirm(`Supprimer définitivement votre compte et toutes ses données privées ? Elles seront également retirées de cet appareil après déconnexion.${storeWarning}`)) return;
    setBusy("delete");
    setError(null);
    try {
      const response = await fetch("/api/v1/account", { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}`, "X-Confirm-Account-Deletion": "delete" } });
      if (!response.ok) throw new Error((await response.json()).error ?? "Suppression impossible");
      await signOut();
      window.location.assign("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible");
      setBusy(null);
    }
  };

  if (!configured) return <div className="mx-auto max-w-2xl"><Card><CardHeader title="Compte" /><CardBody className="text-sm text-ink-2">La connexion est temporairement indisponible. Réessayez plus tard ; les données publiques de marché restent accessibles.</CardBody></Card></div>;
  if (loading) return <div className="flex min-h-60 items-center justify-center text-ink-3"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Chargement du compte…</div>;
  if (!user) return <div className="mx-auto max-w-xl"><Card><CardHeader title="Votre espace WARIBA" subtitle="Synchronisez vos données sans bloquer le terminal public." /><CardBody className="flex gap-2"><Link href="/connexion" className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-semibold text-accent">Se connecter</Link><Link href="/inscription" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">Créer un espace</Link></CardBody></Card></div>;

  return (
    <div className="stagger space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace privé</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Compte & synchronisation</h1><p className="mt-1 text-sm text-ink-3">Identité, données et facturation au même endroit.</p></div>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Card><CardHeader title="Identité" /><CardBody className="space-y-3 text-sm"><div><p className="font-semibold text-ink">{data?.profile.display_name || user.email}</p><p className="text-xs text-ink-3">{user.email}</p></div><div className="flex items-center gap-2 text-xs text-ink-2"><ShieldCheck className="h-4 w-4 text-up" />Session sécurisée et vérifiée</div><Button variant="outline" size="sm" onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" />Se déconnecter</Button></CardBody></Card>
          <Card><CardHeader title="Données privées" subtitle="Synchronisation automatique et non destructive entre le web, iOS et Android." /><CardBody className="space-y-3"><div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs leading-5 text-ink-2"><Cloud className="mb-2 h-4 w-4 text-accent" />Watchlists, portefeuille, alertes, filtres et préférences sont isolés par votre identifiant via RLS. Les conflits sont fusionnés sans remplacer silencieusement les données d’un autre appareil.</div><div className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs"><span className="text-ink-3">{syncStatus === "syncing" ? "Synchronisation…" : syncStatus === "offline" ? "Hors ligne · reprise nécessaire" : syncStatus === "error" ? "À resynchroniser" : "Synchronisation active"}</span><span className="num text-ink-2">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</span></div><Button variant="accent" className="w-full" onClick={() => void sync()} disabled={Boolean(busy) || syncStatus === "syncing"}>{busy === "sync" || syncStatus === "syncing" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Synchroniser maintenant</Button>{automaticSyncError && !error ? <p className="text-xs text-down">{automaticSyncError}</p> : null}</CardBody></Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader title="Forfait" /><CardBody className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xl font-bold capitalize text-ink">{data?.subscription.plan ?? "free"}</p><p className="text-xs text-ink-3">Statut : {data?.subscription.status ?? "chargement"}</p></div>{data?.subscription.current_period_end ? <p className="text-[11px] text-ink-3">Jusqu'au {new Date(data.subscription.current_period_end).toLocaleDateString("fr-FR")}</p> : null}</div>{data?.subscription.plan === "pro" ? data.subscription.provider === "stripe" ? <BillingButton kind="portal">Gérer la facturation</BillingButton> : <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">Abonnement géré depuis {data.subscription.provider === "apple" ? "l'App Store" : "Google Play"}.</p> : <><BillingButton kind="checkout">Passer à Pro</BillingButton><Link href="/pricing" className="block text-center text-xs text-accent hover:underline">Comparer les forfaits</Link></>}</CardBody></Card>
          <Card><CardHeader title="Suppression du compte" subtitle="Le compte et ses données privées sont effacés du serveur puis retirés de cet appareil." /><CardBody><Button variant="danger" onClick={() => void removeAccount()} disabled={Boolean(busy)}>{busy === "delete" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Supprimer définitivement</Button></CardBody></Card>
        </div>
      </div>
      {message ? <p role="status" className="rounded-lg border border-up/25 bg-up/10 px-3 py-2 text-xs text-up">{message}</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-down/25 bg-down/10 px-3 py-2 text-xs text-down">{error}</p> : null}
    </div>
  );
}
