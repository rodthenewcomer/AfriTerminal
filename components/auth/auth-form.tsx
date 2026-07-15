"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { BrandSignature } from "@/components/layout/brand-signature";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

type Mode = "login" | "signup";

function humanError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (normalized.includes("already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (normalized.includes("password")) return "Le mot de passe doit contenir au moins 8 caractères, avec lettres et chiffres.";
  if (normalized.includes("expired") || normalized.includes("invalid token")) return "Ce code a expiré ou n'est pas valide.";
  if (normalized.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "L'opération n'a pas abouti. Vérifiez vos informations puis réessayez.";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { client, configured } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (awaitingCode) {
        const { error: verifyError } = await client.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          type: "signup",
        });
        if (verifyError) throw verifyError;
        router.replace("/account?welcome=1");
        router.refresh();
      } else if (mode === "signup") {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace("/account?welcome=1");
          router.refresh();
        } else {
          setAwaitingCode(true);
          setMessage("Saisissez le code à 6 chiffres envoyé par e-mail.");
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInError) throw signInError;
        router.replace("/account");
        router.refresh();
      }
    } catch (caught) {
      setError(humanError(caught instanceof Error ? caught.message : "unknown"));
    } finally {
      setPending(false);
    }
  };

  const socialLogin = async (provider: "apple" | "google") => {
    if (!client) return;
    setPending(true);
    setError(null);
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    if (oauthError) {
      setError(humanError(oauthError.message));
      setPending(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-5xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px]">
      <section className="hidden lg:block">
        <BrandSignature className="h-28 w-52" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-accent">La BRVM, clairement</p>
        <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-ink">
          Retrouvez votre portefeuille sur chaque écran, sans fermer l'accès au marché.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-ink-2">
          Le compte reste optionnel. Il protège et synchronise vos watchlists, transactions,
          alertes et filtres ; les cours publics restent accessibles sans connexion.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-2xl shadow-black/20 sm:p-7">
        <div className="mb-6 lg:hidden"><BrandSignature className="h-16 w-28" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {awaitingCode ? "Vérification" : mode === "signup" ? "Nouvel espace" : "Votre espace"}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          {awaitingCode ? "Confirmez votre e-mail" : mode === "signup" ? "Créer votre espace" : "Content de vous revoir"}
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          {awaitingCode ? `Code envoyé à ${email}` : "Vos données privées sont isolées par compte et restent exportables."}
        </p>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-ink-2">
            Le service de compte attend la configuration Supabase du déploiement.
          </div>
        ) : null}

        {!awaitingCode ? (
          <div className="mt-6 grid gap-2">
            <button type="button" onClick={() => void socialLogin("apple")} disabled={pending} className="h-11 rounded-xl border border-line bg-ink px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">
              Continuer avec Apple
            </button>
            <button type="button" onClick={() => void socialLogin("google")} disabled={pending} className="h-11 rounded-xl border border-line bg-surface-2 px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 disabled:opacity-50">
              Continuer avec Google
            </button>
            <div className="my-2 flex items-center gap-3 text-[11px] text-ink-3"><span className="h-px flex-1 bg-line" />ou par e-mail<span className="h-px flex-1 bg-line" /></div>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && !awaitingCode ? (
            <label className="block text-xs font-medium text-ink-2">
              Nom affiché
              <Input className="mt-1.5 h-11" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={80} required />
            </label>
          ) : null}
          {!awaitingCode ? (
            <>
              <label className="block text-xs font-medium text-ink-2">
                E-mail
                <Input className="mt-1.5 h-11" type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label className="block text-xs font-medium text-ink-2">
                Mot de passe
                <span className="relative mt-1.5 block">
                  <Input className="h-11 pr-11" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-3 hover:text-ink">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            </>
          ) : (
            <label className="block text-xs font-medium text-ink-2">
              Code à 6 chiffres
              <Input className="mt-1.5 h-12 text-center font-mono text-xl tracking-[0.35em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required autoFocus />
            </label>
          )}

          {message ? <p role="status" className="text-xs text-up">{message}</p> : null}
          {error ? <p role="alert" className="text-xs text-down">{error}</p> : null}
          <Button type="submit" variant="accent" className="h-11 w-full" disabled={!configured || pending}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {awaitingCode ? "Vérifier le code" : mode === "signup" ? "Créer mon espace" : "Se connecter"}
          </Button>
        </form>

        <div className="mt-5 space-y-3 text-center text-xs text-ink-3">
          <p>{mode === "signup" ? "Déjà un compte ?" : "Nouveau sur WARIBA ?"} <Link className="font-semibold text-accent hover:underline" href={mode === "signup" ? "/connexion" : "/inscription"}>{mode === "signup" ? "Se connecter" : "Créer un espace"}</Link></p>
          <p><Link className="font-semibold text-ink-2 hover:text-ink" href="/dashboard">Continuer sans compte</Link></p>
          <p className="text-[10px]"><Link href="/terms" className="hover:text-ink">Conditions</Link> · <Link href="/privacy" className="hover:text-ink">Confidentialité</Link></p>
        </div>
      </section>
    </div>
  );
}
