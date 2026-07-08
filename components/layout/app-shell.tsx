"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  LineChart,
  Menu,
  Rocket,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { MarketStatusBadge } from "./market-status-badge";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Marchés", icon: LineChart },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/ipo", label: "IPO & Opérations", icon: Rocket },
  { href: "/settings", label: "Réglages", icon: Settings },
] as const;

const MOBILE_NAV = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/markets", label: "Marchés", icon: LineChart },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/settings", label: "Menu", icon: Menu },
] as const;

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-gold text-sm font-black text-white shadow-lg shadow-accent/20">
        A
      </span>
      <span className="text-[15px] font-bold tracking-tight text-ink">
        Afri<span className="text-accent">Terminal</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface/50 backdrop-blur-xl lg:flex">
        <div className="px-4 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 text-[10px] leading-relaxed text-ink-3 border-t border-line">
          Données simulées — démo produit.
          <br />
          Ceci n&apos;est pas un conseil en investissement.
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/75 backdrop-blur-xl lg:pl-60">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden md:block flex-1 max-w-xs">
            <GlobalSearch trigger="bar" />
          </div>
          <div className="flex-1 md:hidden" />
          <div className="md:hidden">
            <GlobalSearch trigger="icon" />
          </div>
          <MarketStatusBadge />
          <Link
            href="/alerts"
            aria-label="Alertes"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-down" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenu */}
      <main className="px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pl-[264px] xl:pr-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-accent" : "text-ink-3"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
