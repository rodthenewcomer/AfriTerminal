"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  COTE_DIVOIRE_SGIS,
  matchSgis,
  type InvestableAmount,
  type InvestorExperience,
  type SgiContactPreference,
  type SgiPriority,
  type SgiQuestionnaire,
} from "@wariba/core/sgi";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const OPTIONS = {
  contactPreference: [
    ["digital", "E-mail / site"],
    ["phone", "Téléphone"],
    ["office", "Agence physique"],
  ] as [SgiContactPreference, string][],
  experience: [
    ["beginner", "Je débute"],
    ["experienced", "Je connais déjà la BRVM"],
  ] as [InvestorExperience, string][],
  priority: [
    ["fees", "Comprendre tous les frais"],
    ["digital", "Gérer à distance"],
    ["support", "Être accompagné"],
  ] as [SgiPriority, string][],
  amount: [
    ["under-500k", "Moins de 500 000 FCFA"],
    ["500k-5m", "500 000 à 5 M FCFA"],
    ["over-5m", "Plus de 5 M FCFA"],
  ] as [InvestableAmount, string][],
};

type SavedSgiRequest = {
  id: string;
  sgi_id: string;
  status: string;
  created_at: string;
};

export default function SgiPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [questionnaire, setQuestionnaire] = useState<SgiQuestionnaire>({
    contactPreference: "digital",
    experience: "beginner",
    priority: "support",
    amount: "under-500k",
  });
  const [requestState, setRequestState] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [savedRequests, setSavedRequests] = useState<SavedSgiRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const matches = useMemo(() => matchSgis(questionnaire), [questionnaire]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setSavedRequests([]);
      return;
    }
    const controller = new AbortController();
    setRequestsLoading(true);
    void fetch("/api/v1/sgi-requests", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("request_failed");
        const body = await response.json() as { requests?: SavedSgiRequest[] };
        setSavedRequests(body.requests ?? []);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSavedRequests([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRequestsLoading(false);
      });
    return () => controller.abort();
  }, [session?.access_token]);

  const saveRequest = async (sgiId: string) => {
    if (!session) {
      router.push(`/inscription?next=${encodeURIComponent("/sgi")}`);
      return;
    }
    setRequestState((state) => ({ ...state, [sgiId]: "saving" }));
    try {
      const response = await fetch("/api/v1/sgi-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sgiId, questionnaire, consent: true }),
      });
      if (!response.ok) throw new Error("request_failed");
      const body = await response.json() as { request: SavedSgiRequest };
      setSavedRequests((current) => [
        body.request,
        ...current.filter((request) => request.id !== body.request.id),
      ]);
      setRequestState((state) => ({ ...state, [sgiId]: "saved" }));
    } catch {
      setRequestState((state) => ({ ...state, [sgiId]: "error" }));
    }
  };

  return (
    <div className="stagger space-y-6">
      <header className="overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/12 via-surface to-gold/8 p-6 sm:p-9">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <Badge tone="positive">
              <ShieldCheck className="h-3 w-3" /> Répertoire officiel BRVM vérifié
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
              Trouver une SGI en Côte d&apos;Ivoire
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink-2">
              Une SGI est l&apos;intermédiaire agréé qui ouvre votre compte-titres
              et transmet vos ordres à la BRVM. WARIBA compare uniquement les
              coordonnées vérifiées et vous prépare les bonnes questions.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface/85 px-5 py-4 text-center">
            <p className="num text-3xl font-black text-accent">{COTE_DIVOIRE_SGIS.length}</p>
            <p className="text-xs text-ink-3">SGI uniques référencées</p>
          </div>
        </div>
      </header>

      <section className="grid gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-7 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            4 questions simples
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink">Votre orientation de contact</h2>
          <p className="mt-2 text-xs leading-5 text-ink-3">
            Ce résultat n&apos;est ni un classement de qualité ni un conseil
            d&apos;investissement. Les frais, minimums et services restent à confirmer
            directement avec chaque SGI.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["contactPreference", "Comment voulez-vous échanger ?", OPTIONS.contactPreference],
            ["experience", "Votre expérience", OPTIONS.experience],
            ["priority", "Votre priorité", OPTIONS.priority],
            ["amount", "Premier montant envisagé", OPTIONS.amount],
          ] as const).map(([key, label, options]) => (
            <fieldset key={key} className="space-y-2">
              <legend className="text-xs font-semibold text-ink">{label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {options.map(([value, text]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setQuestionnaire((state) => ({ ...state, [key]: value }))}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      questionnaire[key] === value
                        ? "border-accent/40 bg-accent/15 text-accent"
                        : "border-line bg-surface-2/60 text-ink-2"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {session ? (
        <section className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Votre compte</p>
              <h2 className="mt-1 text-lg font-bold text-ink">Mes demandes SGI</h2>
            </div>
            <Badge tone="neutral">{savedRequests.length} enregistrée{savedRequests.length === 1 ? "" : "s"}</Badge>
          </div>
          {requestsLoading ? (
            <p className="mt-4 text-xs text-ink-3">Chargement des demandes…</p>
          ) : savedRequests.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {savedRequests.map((request) => {
                const sgi = COTE_DIVOIRE_SGIS.find((item) => item.id === request.sgi_id);
                return (
                  <div key={request.id} className="rounded-2xl border border-line bg-surface-2/45 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">{sgi?.shortName ?? request.sgi_id}</p>
                        <p className="mt-1 text-[10px] text-ink-3">
                          Enregistrée le {new Intl.DateTimeFormat("fr-CI", { dateStyle: "medium" }).format(new Date(request.created_at))}
                        </p>
                      </div>
                      <Badge tone="accent">{request.status === "pending" ? "À contacter" : request.status}</Badge>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-ink-3">
                      Suivi privé WARIBA. Aucune transmission automatique à la SGI.
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-5 text-ink-3">
              Enregistrez une SGI ci-dessous pour retrouver votre choix ici. Vous la contacterez ensuite avec ses coordonnées officielles.
            </p>
          )}
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-ink">SGI à contacter en premier</h2>
            <p className="mt-1 text-xs text-ink-3">
              Ordre fondé seulement sur vos canaux de contact préférés et les coordonnées vérifiées.
            </p>
          </div>
          <a
            href="https://www.brvm.org/en/pays-sgi/cote-divoire"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
          >
            Répertoire BRVM <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {matches.map(({ sgi, reasons, questionsToAsk }, index) => (
            <article key={sgi.id} className="card-glass overflow-hidden p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">{sgi.shortName}</h3>
                    {index < 3 ? <Badge tone="accent">Contact compatible</Badge> : null}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-3">{sgi.name}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-ink-2">
                {reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" />
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid gap-1.5 text-[11px] text-ink-3">
                <p className="flex gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {sgi.address}</p>
                <p className="flex gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /> {sgi.phones.join(" · ")}</p>
                {sgi.email ? <p className="flex gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /> {sgi.email}</p> : null}
              </div>
              <details className="mt-4 rounded-xl border border-line bg-surface-2/40 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-ink">
                  Questions à poser avant d&apos;ouvrir
                </summary>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] leading-4 text-ink-3">
                  {questionsToAsk.map((question) => <li key={question}>{question}</li>)}
                </ol>
              </details>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/sgi/${sgi.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-ink">
                  Voir la fiche <ArrowRight className="h-3 w-3" />
                </Link>
                <Button
                  size="sm"
                  variant="accent"
                  disabled={
                    requestState[sgi.id] === "saving"
                    || requestState[sgi.id] === "saved"
                    || savedRequests.some((request) => request.sgi_id === sgi.id)
                  }
                  onClick={() => void saveRequest(sgi.id)}
                >
                  {requestState[sgi.id] === "saved" || savedRequests.some((request) => request.sgi_id === sgi.id)
                    ? "Demande enregistrée"
                    : requestState[sgi.id] === "saving"
                      ? "Enregistrement…"
                      : session
                        ? "Enregistrer ma demande"
                        : "Créer un compte pour continuer"}
                </Button>
              </div>
              {requestState[sgi.id] === "saved" ? (
                <p className="mt-2 text-[10px] text-up">
                  Demande suivie dans votre compte. Elle n&apos;a pas encore été transmise à la SGI.
                </p>
              ) : requestState[sgi.id] === "error" ? (
                <p className="mt-2 text-[10px] text-down">Enregistrement impossible. Réessayez.</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <p className="text-[10px] leading-4 text-ink-3">
        Vérification du répertoire : 19 juillet 2026. WARIBA ne reçoit aucune
        rémunération de classement et ne prétend pas comparer les frais ou la
        qualité tant que ces informations ne sont pas publiées et recoupées.
      </p>
    </div>
  );
}
