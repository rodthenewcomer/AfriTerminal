"use client";

import { useState, type ReactNode } from "react";
import { FileText, GraduationCap, Landmark } from "lucide-react";
import { cn } from "@wariba/core/utils";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { id: "avis", label: "Avis officiels", icon: FileText, real: true },
  { id: "operations", label: "Opérations sur capital", icon: Landmark, real: true },
  { id: "apprendre", label: "Apprendre", icon: GraduationCap, real: false },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Trois sections → trois onglets : la page IPO empilait avis + historique
 * + pédagogie en un long défilement. Le badge distingue le réel des
 * scénarios pédagogiques.
 */
export function IpoTabs({
  avis,
  operations,
  apprendre,
}: {
  avis: ReactNode;
  operations: ReactNode;
  apprendre: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("avis");
  const content: Record<TabId, ReactNode> = { avis, operations, apprendre };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/60 p-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium cursor-pointer transition-colors",
                tab === id
                  ? "bg-surface text-ink shadow-sm border border-line"
                  : "text-ink-3 hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <Badge tone={TABS.find((t) => t.id === tab)?.real ? "positive" : "gold"}>
          {TABS.find((t) => t.id === tab)?.real ? "Données réelles" : "Scénarios pédagogiques"}
        </Badge>
      </div>
      <div className="fade-in" key={tab}>
        {content[tab]}
      </div>
    </div>
  );
}
