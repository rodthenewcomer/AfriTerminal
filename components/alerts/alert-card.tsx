import Link from "next/link";
import {
  Bell,
  FileText,
  Landmark,
  Sparkles,
  TrendingUp,
  Volume2,
  ExternalLink,
} from "lucide-react";
import type { AlertItem } from "@wariba/core/types";
import { cn } from "@wariba/core/utils";
import { Badge } from "@/components/ui/badge";
import { DataBasisBadge } from "@/components/ui/data-basis-badge";

const TYPE_META: Record<
  AlertItem["type"],
  { label: string; icon: typeof Bell }
> = {
  prix: { label: "Prix", icon: TrendingUp },
  volume: { label: "Volume", icon: Volume2 },
  dividende: { label: "Dividende", icon: Landmark },
  document: { label: "Document", icon: FileText },
  fondamental: { label: "Fondamental", icon: Landmark },
  ia: { label: "Signal IA", icon: Sparkles },
};

const SEVERITY_STYLES: Record<AlertItem["severity"], string> = {
  critical: "border-down/30 bg-down/5",
  warning: "border-warn/25 bg-warn/5",
  positive: "border-up/25 bg-up/5",
  info: "border-line bg-surface/60",
};

const SEVERITY_ICON: Record<AlertItem["severity"], string> = {
  critical: "bg-down/15 text-down",
  warning: "bg-warn/15 text-warn",
  positive: "bg-up/15 text-up",
  info: "bg-accent/15 text-accent",
};

function timeFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });
}

export function AlertCard({ alert }: { alert: AlertItem }) {
  const meta = TYPE_META[alert.type];
  const Icon = meta.icon;
  return (
    <article
      className={cn(
        "rounded-2xl border p-3.5 flex gap-3",
        SEVERITY_STYLES[alert.severity],
        !alert.active && "opacity-55"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          SEVERITY_ICON[alert.severity]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-ink">{alert.title}</h3>
          <Badge tone="neutral">{meta.label}</Badge>
          <DataBasisBadge basis={alert.basis} />
          {alert.ticker ? (
            <Link
              href={`/stocks/${alert.ticker}`}
              className="text-[11px] font-bold text-accent hover:underline"
            >
              {alert.ticker}
            </Link>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">{alert.detail}</p>
        <p className="mt-1.5 text-[10px] text-ink-3">
          {timeFr(alert.time)} · Abidjan {alert.active ? "" : "· désactivée"}
        </p>
        {alert.sourceUrl ? (
          <a
            href={alert.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
          >
            Publication officielle <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
