"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Database, Monitor, Moon, Sun, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BackupCard } from "@/components/settings/backup-card";

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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState("FCFA");
  const [language, setLanguage] = useState("fr");
  const [notifDocs, setNotifDocs] = useState(false);
  const [notifPrice, setNotifPrice] = useState(false);
  const [notifDividends, setNotifDividends] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="stagger space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Réglages</h1>
        <p className="mt-1 text-sm text-ink-3">
          Préférences d&apos;affichage et transparence sur les données —
          aucune n&apos;exige de compte.
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
            <p className="text-sm font-semibold text-ink">Session locale</p>
            <p className="text-xs text-ink-3">
              Watchlists et filtres restent dans ce navigateur.
            </p>
          </div>
          <Badge tone="neutral">Public</Badge>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Affichage" />
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between gap-3">
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
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium cursor-pointer transition-colors",
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
              label="Mode avancé — à venir"
              hint="Prévu pour regrouper les indicateurs pro sans alourdir l'écran par défaut."
              disabled
            />
          </div>
        </CardBody>
      </Card>

      </div>
      <div className="space-y-4">
      <Card>
        <CardHeader
          title="Notifications"
          subtitle="À venir avec comptes utilisateur : aucun email ni push n'est envoyé aujourd'hui."
        />
        <CardBody className="divide-y divide-line/60">
          <Toggle
            checked={notifDocs}
            onChange={setNotifDocs}
            label="Nouveaux documents — à venir"
            hint="Résultats, dividendes, AGO des valeurs suivies."
            disabled
          />
          <Toggle
            checked={notifPrice}
            onChange={setNotifPrice}
            label="Alertes de prix et de volume — à venir"
            hint="Franchissements de seuils et volumes anormaux."
            disabled
          />
          <Toggle
            checked={notifDividends}
            onChange={setNotifDividends}
            label="Calendrier des dividendes — à venir"
            hint="Rappel avant chaque date de détachement."
            disabled
          />
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
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      <BackupCard />
      </div>
      </div>

      <p className="text-[10px] text-ink-3">
        AfriTerminal — version publique. Les informations présentées sont fournies à titre
        éducatif et informatif. Elles ne constituent pas un conseil en
        investissement.
      </p>
    </div>
  );
}
