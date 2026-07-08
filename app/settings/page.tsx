"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-2 text-left cursor-pointer"
      role="switch"
      aria-checked={checked}
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
  const [notifDocs, setNotifDocs] = useState(true);
  const [notifPrice, setNotifPrice] = useState(true);
  const [notifDividends, setNotifDividends] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-4 fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Réglages</h1>
        <p className="mt-1 text-sm text-ink-3">Préférences de l&apos;application.</p>
      </div>

      <Card>
        <CardHeader title="Profil" />
        <CardBody className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-gold/25 text-accent">
            <User className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Investisseur démo</p>
            <p className="text-xs text-ink-3">demo@afriterminal.app</p>
          </div>
          <Badge tone="gold">Plan Free</Badge>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Affichage" />
        <CardBody className="space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">Thème</span>
            {mounted ? (
              <Select value={theme ?? "dark"} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">Sombre</option>
                <option value="light">Clair</option>
                <option value="system">Système</option>
              </Select>
            ) : (
              <span className="h-9 w-24 rounded-lg bg-surface-2" />
            )}
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">Devise d&apos;affichage</span>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="FCFA">FCFA</option>
              <option value="USD">USD (démo)</option>
              <option value="EUR">EUR (démo)</option>
            </Select>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">Langue</span>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English (démo)</option>
            </Select>
          </label>
          <div className="border-t border-line pt-1">
            <Toggle
              checked={advanced}
              onChange={setAdvanced}
              label="Mode avancé"
              hint="Affiche plus d'indicateurs techniques et de métriques (démo)."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notifications" subtitle="Préférences d'alertes (démo)" />
        <CardBody className="divide-y divide-line/60">
          <Toggle
            checked={notifDocs}
            onChange={setNotifDocs}
            label="Nouveaux documents"
            hint="Résultats, dividendes, AGO des valeurs suivies."
          />
          <Toggle
            checked={notifPrice}
            onChange={setNotifPrice}
            label="Alertes de prix et de volume"
            hint="Franchissements de seuils et volumes anormaux."
          />
          <Toggle
            checked={notifDividends}
            onChange={setNotifDividends}
            label="Calendrier des dividendes"
            hint="Rappel avant chaque date de détachement."
          />
        </CardBody>
      </Card>

      <p className="text-[10px] text-ink-3">
        AfriTerminal — démo. Les informations présentées sont fournies à titre
        éducatif et informatif. Elles ne constituent pas un conseil en
        investissement.
      </p>
    </div>
  );
}
