"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Database, Eraser, Keyboard, Monitor, Moon, Sun, User } from "lucide-react";
import { cn } from "@wariba/core/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackupCard } from "@/components/settings/backup-card";
import { usePortfolio, usePortfolioHydrated } from "@/hooks/use-portfolio";
import { useWatchlist, useWatchlistHydrated } from "@/hooks/use-watchlist";
import { useSavedFilters, useSavedFiltersHydrated } from "@/hooks/use-saved-filters";
import { usePriceAlerts, usePriceAlertsHydrated } from "@/hooks/use-price-alerts";
import { useChartLevels, useChartLevelsHydrated } from "@/hooks/use-chart-levels";
import { useChartPrefs, useChartPrefsHydrated } from "@/hooks/use-chart-prefs";
import { useAuth } from "@/components/auth/auth-provider";
import { useAnalytics } from "@/components/analytics/analytics-provider";

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 py-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block text-[11px] text-ink-3">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-surface-2 border border-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

function ResetRow({
  label,
  hint,
  onReset,
  disabled = false,
}: {
  label: string;
  hint: string;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-[11px] text-ink-3">{hint}</span>
      </span>
      <Button variant="danger" size="sm" onClick={onReset} disabled={disabled}>
        Effacer
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { session, user } = useAuth();
  const { consent, saving: analyticsSaving, setConsent } = useAnalytics();
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState("FCFA");
  const [language, setLanguage] = useState("fr");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setEmailNotifications(false);
      setPushNotifications(false);
      return;
    }
    const controller = new AbortController();
    setPreferencesLoading(true);
    void fetch("/api/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("Préférences indisponibles");
      const body = await response.json() as { profile?: { email_notifications?: boolean; push_notifications?: boolean } };
      setEmailNotifications(body.profile?.email_notifications === true);
      setPushNotifications(body.profile?.push_notifications === true);
      setPreferencesError(null);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPreferencesError("Impossible de charger vos préférences de notification.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setPreferencesLoading(false);
    });
    return () => controller.abort();
  }, [session?.access_token]);

  const portfolioHydrated = usePortfolioHydrated();
  const clearPortfolio = usePortfolio((s) => s.replaceAll);
  const watchlistHydrated = useWatchlistHydrated();
  const resetWatchlists = useWatchlist((s) => s.replaceAll);
  const filtersHydrated = useSavedFiltersHydrated();
  const clearFilters = useSavedFilters((s) => s.replaceAll);
  const alertsHydrated = usePriceAlertsHydrated();
  const clearAlerts = usePriceAlerts((s) => s.clear);
  const levelsHydrated = useChartLevelsHydrated();
  const clearLevels = useChartLevels((s) => s.clearAll);
  const chartPrefsHydrated = useChartPrefsHydrated();
  const resetMaColors = useChartPrefs((s) => s.resetMaColors);

  const confirmAndRun = (question: string, run: () => void) => {
    if (window.confirm(question)) run();
  };

  const updateEmailNotifications = async (enabled: boolean) => {
    const token = session?.access_token;
    if (!token) return;
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      const response = await fetch("/api/v1/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emailNotifications: enabled }),
      });
      if (!response.ok) throw new Error("Preference update failed");
      setEmailNotifications(enabled);
    } catch {
      setPreferencesError("La préférence n'a pas pu être enregistrée. Réessayez.");
    } finally {
      setPreferencesLoading(false);
    }
  };

  return (
    <div className="stagger space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Réglages</h1>
        <p className="mt-1 text-sm text-ink-3">
          Affichage, notifications, confidentialité et données synchronisées.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4">
      <Card>
        <CardHeader title="Profil" />
        <CardBody className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-gold/25 text-accent">
            <User className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{user?.email ?? "Session locale"}</p>
            <p className="text-xs text-ink-3">
              {user ? "Compte connecté : synchronisation et préférences privées disponibles." : "Connectez-vous pour synchroniser vos données et activer les notifications."}
            </p>
          </div>
          {user ? <Badge tone="positive">Connecté</Badge> : (
            <Link href="/connexion" className="text-xs font-medium text-accent hover:underline">Se connecter</Link>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Affichage" />
        <CardBody className="space-y-3">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-ink">Thème</span>
            {mounted ? (
              <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/60 p-0.5" role="radiogroup" aria-label="Thème">
                {(
                  [
                    ["dark", "Sombre", Moon],
                    ["light", "Clair", Sun],
                    ["system", "Système", Monitor],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={(theme ?? "dark") === value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium cursor-pointer transition-colors sm:h-8",
                      (theme ?? "dark") === value
                        ? "bg-surface text-ink shadow-sm border border-line"
                        : "text-ink-3 hover:text-ink"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="h-9 w-56 rounded-lg bg-surface-2" />
            )}
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">Devise d&apos;affichage</span>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="FCFA">FCFA</option>
              <option value="USD" disabled>USD — à venir</option>
              <option value="EUR" disabled>EUR — à venir</option>
            </Select>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">Langue</span>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="fr">Français</option>
              <option value="en" disabled>English — à venir</option>
            </Select>
          </label>
          <div className="border-t border-line pt-1">
            <Toggle
              checked={advanced}
              onChange={setAdvanced}
              label="Mode avancé"
              hint="Les indicateurs avancés sont maintenant regroupés dans WARIBA Pro."
              disabled
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-accent" /> Raccourcis clavier
            </span>
          }
          subtitle="Actifs sur la fiche d'une action, hors champ de saisie."
        />
        <CardBody className="space-y-1.5">
          {(
            [
              ["F", "Plein écran"],
              ["L", "Échelle logarithmique"],
              ["V", "Afficher/masquer le volume"],
              ["⇧ D", "Basculer clair / sombre"],
              ["Double-clic sur le graphique", "Recadrer sur l'historique visible"],
              ["⌘K / Ctrl K", "Ouvrir la recherche"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-ink-2">{label}</span>
              <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                {key}
              </kbd>
            </div>
          ))}
        </CardBody>
      </Card>

      </div>
      <div className="space-y-4">
      <Card>
        <CardHeader
          title="Notifications"
          subtitle="Uniquement pour les alertes synchronisées dont le canal correspondant a été choisi."
        />
        <CardBody className="divide-y divide-line/60">
          <Toggle
            checked={emailNotifications}
            onChange={(value) => void updateEmailNotifications(value)}
            label="Alertes de prix par e-mail"
            hint={user ? "Envoi après franchissement d'un seuil synchronisé avec le canal e-mail." : "Connexion requise."}
            disabled={!user || preferencesLoading}
          />
          <Toggle
            checked={pushNotifications}
            onChange={() => undefined}
            label="Notifications push mobiles"
            hint={pushNotifications ? "Activées depuis un appareil iOS ou Android." : "À activer dans l'application mobile sur l'appareil concerné."}
            disabled
          />
          <Toggle
            checked={consent === "granted"}
            onChange={(value) => void setConsent(value).catch(() => setPreferencesError("Le consentement n'a pas pu être enregistré."))}
            label="Mesure d'audience interne"
            hint="Événements fonctionnels pseudonymisés, sans publicité ni IP stockée, supprimés après 90 jours."
            disabled={analyticsSaving}
          />
          {preferencesError ? <p role="alert" className="py-2 text-xs font-medium text-down">{preferencesError}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-accent" /> Données & sources
            </span>
          }
        />
        <CardBody className="space-y-2 text-xs leading-relaxed text-ink-2">
          <p>
            Cours, volumes, indices, dividendes et PER proviennent des{" "}
            <strong className="font-semibold text-ink">bulletins officiels
            de la cote</strong> (BRVM), mis à jour chaque soir de bourse. Les
            états financiers sont extraits des PDF publiés par les sociétés,
            vérifiés à la main. Actualités : Sika Finance et Financial Afrik,
            liens vers les articles originaux.
          </p>
          <p className="text-ink-3">
            Fraîcheur et provenance détaillées par source :{" "}
            <Link href="/status" className="text-accent underline hover:no-underline">
              statut des données
            </Link>{" "}
            · règles de vérification et formules :{" "}
            <Link href="/methodologie" className="text-accent underline hover:no-underline">
              méthodologie & sources
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      <BackupCard />

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-1.5">
              <Eraser className="h-3.5 w-3.5 text-down" /> Réinitialiser
            </span>
          }
          subtitle="Efface définitivement les données choisies, dans ce navigateur. Téléchargez une sauvegarde avant si besoin."
        />
        <CardBody className="divide-y divide-line/60">
          <ResetRow
            label="Watchlists"
            hint="Revient à une liste unique vide."
            disabled={!watchlistHydrated}
            onReset={() =>
              confirmAndRun("Effacer toutes vos watchlists ?", () =>
                resetWatchlists([{ id: "default", name: "Ma watchlist", tickers: [] }], "default")
              )
            }
          />
          <ResetRow
            label="Portefeuille"
            hint="Supprime toutes les transactions enregistrées."
            disabled={!portfolioHydrated}
            onReset={() =>
              confirmAndRun("Effacer tout votre portefeuille ?", () => clearPortfolio([]))
            }
          />
          <ResetRow
            label="Filtres enregistrés (Screener)"
            hint="Supprime vos combinaisons de filtres sauvegardées."
            disabled={!filtersHydrated}
            onReset={() =>
              confirmAndRun("Effacer tous vos filtres enregistrés ?", () => clearFilters([]))
            }
          />
          <ResetRow
            label="Alertes de prix"
            hint="Supprime toutes vos alertes de seuil."
            disabled={!alertsHydrated}
            onReset={() =>
              confirmAndRun("Effacer toutes vos alertes de prix ?", clearAlerts)
            }
          />
          <ResetRow
            label="Niveaux et couleurs de graphique"
            hint="Supprime vos niveaux tracés et réinitialise les couleurs des moyennes mobiles."
            disabled={!levelsHydrated || !chartPrefsHydrated}
            onReset={() =>
              confirmAndRun("Effacer vos niveaux de graphique et réinitialiser les couleurs ?", () => {
                clearLevels();
                resetMaColors();
              })
            }
          />
        </CardBody>
      </Card>
      </div>
      </div>

      <p className="text-[10px] text-ink-3">
        WARIBA — version publique. Les informations présentées sont fournies à titre
        éducatif et informatif. Elles ne constituent pas un conseil en
        investissement.
      </p>
    </div>
  );
}
