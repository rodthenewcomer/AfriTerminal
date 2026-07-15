"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Eye,
  FileText,
  Filter,
  Grid3X3,
  LayoutDashboard,
  Briefcase,
  CalendarClock,
  CandlestickChart,
  Newspaper,
  Plus,
  Search as SearchIcon,
  ShieldCheck,
  X,
  Rocket,
  Settings,
} from "lucide-react";
import { cn } from "@wariba/core/utils";
import { LATEST_TRADING_DATE } from "@/lib/real-data";
import { dateFr } from "@wariba/core/format";
import { GlobalSearch, GlobalSearchDialog, useSearchOpen } from "./global-search";
import { WelcomeTour } from "./welcome-tour";
import { MarketStatusBadge } from "./market-status-badge";
import { ThemeToggle } from "./theme-toggle";
import { AccountControl } from "@/components/auth/account-control";

const NAV = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/map", label: "Carte du marché", icon: Grid3X3 },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/charts", label: "Graphiques", icon: CandlestickChart },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/portfolio", label: "Portefeuille", icon: Briefcase },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/dividendes", label: "Dividendes", icon: CalendarClock },
  { href: "/ipo", label: "IPO & Opérations", icon: Rocket },
  { href: "/settings", label: "Réglages", icon: Settings },
] as const;

// Recherche et alertes promues dans la barre (audit produit : gestes
// quotidiens d'un investisseur) ; Carte et Portefeuille migrent dans
// la feuille « + ».
const MOBILE_NAV = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/alerts", label: "Alertes", icon: Bell },
] as const;

/** Toutes les sections restantes, accessibles depuis le bouton « + » de
 * la barre mobile — avant lui, Screener, Graphiques, Alertes, IPO,
 * Documents, Actualités, Statut et Réglages étaient introuvables au
 * doigt (le 5e onglet menait directement aux Réglages). */
const MOBILE_MORE = [
  { href: "/portfolio", label: "Portefeuille", icon: Briefcase },
  { href: "/map", label: "Carte du marché", icon: Grid3X3 },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/charts", label: "Graphiques", icon: CandlestickChart },
  { href: "/dividendes", label: "Dividendes", icon: CalendarClock },
  { href: "/ipo", label: "IPO & Opérations", icon: Rocket },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/news", label: "Actualités", icon: Newspaper },
  { href: "/status", label: "Statut des données", icon: ShieldCheck },
  { href: "/settings", label: "Réglages", icon: Settings },
] as const;

/** Ancrages de la visite guidée première visite (welcome-tour.tsx). */
const TOUR_BY_HREF: Record<string, string> = {
  "/screener": "screener",
  "/alerts": "alerts",
  "/portfolio": "portfolio",
};

function Logo() {
  return (
    <Link href="/dashboard" aria-label="WARIBA — Accueil" className="group flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] bg-[#071612] shadow-lg shadow-accent/15 ring-1 ring-white/10">
        <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7">
          <path d="M5.4 8.4 10 23l6-9.4L22 23l4.6-14.6" fill="none" stroke="#31d690" strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="26.6" cy="8.4" r="1.7" fill="#f4c96b" />
        </svg>
      </span>
      <span className="text-[15px] font-extrabold tracking-[0.08em] text-ink transition-colors group-hover:text-accent">
        WARIBA
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isPublicFlow = ["/connexion", "/inscription", "/pricing", "/privacy", "/terms", "/support"].some(
    (route) => pathname.startsWith(route)
  );

  if (isPublicFlow) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-line bg-surface/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <Logo />
            <nav className="flex items-center gap-1.5 text-xs font-semibold sm:gap-2">
              <Link href="/pricing" className="hidden rounded-lg px-3 py-2 text-ink-2 hover:bg-surface-2 hover:text-ink sm:inline-flex">Tarifs</Link>
              <Link href="/connexion" className="rounded-lg border border-line px-3 py-2 text-ink hover:border-accent/45">Connexion</Link>
              <Link href="/inscription" className="rounded-lg bg-accent px-3 py-2 text-background shadow-lg shadow-accent/15 hover:brightness-110">Créer un compte</Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    );
  }

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
                data-tour={TOUR_BY_HREF[href]}
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
          Cours, indices, dividendes, documents, alertes et opérations sur
          titres : sources officielles BRVM. Seuls les exemples pédagogiques
          d&apos;analyse (page IPO) sont simulés.
          <br />
          Ceci n&apos;est pas un conseil en investissement.{" "}
          <Link href="/methodologie" className="underline hover:text-ink">
            Méthodologie
          </Link>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/75 backdrop-blur-xl lg:pl-60">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden md:block flex-1 max-w-xs" data-tour="search">
            <GlobalSearch trigger="bar" />
          </div>
          <div className="flex-1 md:hidden" />
          <div className="hidden sm:block md:hidden" data-tour="search">
            <GlobalSearch trigger="icon" />
          </div>
          <div className="hidden sm:block"><MarketStatusBadge /></div>
          <Link
            href="/status"
            className="hidden whitespace-nowrap text-[11px] text-ink-3 hover:text-ink sm:inline"
            title="Dernière séance intégrée — cliquer pour le statut détaillé de chaque source de données"
          >
            Bulletin du {dateFr(LATEST_TRADING_DATE)}
          </Link>
          <Link
            href="/alerts"
            aria-label="Alertes"
            className="relative hidden h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink sm:flex"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-down" />
          </Link>
          <div className="hidden md:block"><ThemeToggle /></div>
          <AccountControl />
        </div>
      </header>
      <GlobalSearchDialog />

      {/* Contenu */}
      <main className="px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pl-[264px] xl:pr-8">
        <div className="mx-auto max-w-[1400px]">
          <WelcomeTour />
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {MOBILE_NAV.slice(0, 1).map(({ href, label, icon: Icon }) => {
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
          <button
            onClick={() => useSearchOpen.getState().setOpen(true)}
            aria-label="Rechercher une action"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-ink-3 cursor-pointer"
          >
            <SearchIcon className="h-5 w-5" />
            Recherche
          </button>
          {MOBILE_NAV.slice(1).map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-tour={TOUR_BY_HREF[href]}
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
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Toutes les sections"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium cursor-pointer",
              MOBILE_MORE.some((m) => pathname.startsWith(m.href))
                ? "text-accent"
                : "text-ink-3"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
              <Plus className="h-3.5 w-3.5 text-accent" />
            </span>
            Plus
          </button>
        </div>
      </nav>

      {/* Feuille « toutes les sections » (mobile) */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Toutes les sections">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl fade-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Toutes les sections</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-3 text-xs font-medium",
                    pathname.startsWith(href) ? "text-accent border-accent/30" : "text-ink-2"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
