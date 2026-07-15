"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, Download, LoaderCircle, LogOut, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { BillingButton } from "@/components/billing/billing-button";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { downloadWebData, uploadWebData } from "@/lib/web-cloud-sync";

interface AccountData {
  user: { id: string; email?: string };
  profile: { display_name: string | null; experience_level: string | null; created_at: string };
  subscription: { provider: "stripe" | "apple" | "google"; status: string; plan: "free" | "pro" | "team"; current_period_end: string | null; cancel_at_period_end: boolean };
  entitlements: { key: string; enabled: boolean; numeric_limit: number | null }[];
}

export default function AccountPage() {
  const { configured, loading, user, session, signOut } = useAuth();
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

  const sync = async (direction: "upload" | "download") => {
    if (!session?.access_token) return;
    setBusy(direction);
    setError(null);
    setMessage(null);
    try {
      if (direction === "upload") await uploadWebData(session.access_token);
      else await downloadWebData(session.access_token);
      setMessage(direction === "upload" ? "Les données de ce navigateur sont maintenant dans votre espace privé." : "Les données de votre espace ont été restaurées dans ce navigateur.");
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
    if (!session?.access_token || !window.confirm(`Supprimer définitivement votre compte et toutes ses données serveur ? Vos données locales resteront dans ce navigateur.${storeWarning}`)) return;
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

  if (!configured) return <div className="mx-auto max-w-2xl"><Card><CardHeader title="Compte" /><CardBody className="text-sm text-ink-2">Le code compte est installé. Ajoutez les variables Supabase du fichier <code>.env.example</code> au déploiement pour l'activer.</CardBody></Card></div>;
  if (loading) return <div className="flex min-h-60 items-center justify-center text-ink-3"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Chargement du compte…</div>;
  if (!user) return <div className="mx-auto max-w-xl"><Card><CardHeader title="Votre espace WARIBA" subtitle="Synchronisez vos données sans bloquer le terminal public." /><CardBody className="flex gap-2"><Link href="/connexion" className="rounded-lg bg-accent/15 px-4 py-2 text-sm font-semibold text-accent">Se connecter</Link><Link href="/inscription" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">Créer un espace</Link></CardBody></Card></div>;

  return (
    <div className="stagger space-y-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace privé</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Compte & synchronisation</h1><p className="mt-1 text-sm text-ink-3">Identité, données et facturation au même endroit.</p></div>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Card><CardHeader title="Identité" /><CardBody className="space-y-3 text-sm"><div><p className="font-semibold text-ink">{data?.profile.display_name || user.email}</p><p className="text-xs text-ink-3">{user.email}</p></div><div className="flex items-center gap-2 text-xs text-ink-2"><ShieldCheck className="h-4 w-4 text-up" />Session vérifiée par Supabase Auth</div><Button variant="outline" size="sm" onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" />Se déconnecter</Button></CardBody></Card>
          <Card><CardHeader title="Données privées" subtitle="La synchronisation est toujours déclenchée par vous sur ce premier lancement." /><CardBody className="space-y-3"><div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs leading-5 text-ink-2"><Cloud className="mb-2 h-4 w-4 text-accent" />Watchlists, portefeuille, alertes, filtres et préférences sont isolés par votre identifiant via RLS.</div><Button variant="accent" className="w-full" onClick={() => void sync("upload")} disabled={Boolean(busy)}>{busy === "upload" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Envoyer ce navigateur vers mon espace</Button><Button variant="outline" className="w-full" onClick={() => void sync("download")} disabled={Boolean(busy)}>{busy === "download" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Restaurer mon espace ici</Button></CardBody></Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader title="Forfait" /><CardBody className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xl font-bold capitalize text-ink">{data?.subscription.plan ?? "free"}</p><p className="text-xs text-ink-3">Statut : {data?.subscription.status ?? "chargement"}</p></div>{data?.subscription.current_period_end ? <p className="text-[11px] text-ink-3">Jusqu'au {new Date(data.subscription.current_period_end).toLocaleDateString("fr-FR")}</p> : null}</div>{data?.subscription.plan === "pro" ? data.subscription.provider === "stripe" ? <BillingButton kind="portal">Gérer la facturation</BillingButton> : <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">Abonnement géré depuis {data.subscription.provider === "apple" ? "l'App Store" : "Google Play"}.</p> : <><BillingButton kind="checkout">Passer à Pro</BillingButton><Link href="/pricing" className="block text-center text-xs text-accent hover:underline">Comparer les forfaits</Link></>}</CardBody></Card>
          <Card><CardHeader title="Suppression du compte" subtitle="Le compte et les données serveur sont effacés. Les données locales restent disponibles." /><CardBody><Button variant="danger" onClick={() => void removeAccount()} disabled={Boolean(busy)}>{busy === "delete" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Supprimer définitivement</Button></CardBody></Card>
        </div>
      </div>
      {message ? <p role="status" className="rounded-lg border border-up/25 bg-up/10 px-3 py-2 text-xs text-up">{message}</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-down/25 bg-down/10 px-3 py-2 text-xs text-down">{error}</p> : null}
    </div>
  );
}
