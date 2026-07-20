import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { COTE_DIVOIRE_SGIS, getSgi } from "@wariba/core/sgi";
import { Badge } from "@/components/ui/badge";

export function generateStaticParams() {
  return COTE_DIVOIRE_SGIS.map((sgi) => ({ id: sgi.id }));
}

export default async function SgiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sgi = getSgi(id);
  if (!sgi) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/sgi" className="text-xs font-semibold text-accent hover:underline">
        ← Retour au comparateur
      </Link>
      <header className="rounded-3xl border border-line bg-gradient-to-br from-accent/10 via-surface to-gold/8 p-6 sm:p-8">
        <Badge tone="positive"><ShieldCheck className="h-3 w-3" /> Vérifiée dans le répertoire BRVM</Badge>
        <h1 className="mt-4 text-2xl font-bold text-ink">{sgi.shortName}</h1>
        <p className="mt-1 text-sm text-ink-3">{sgi.name}</p>
        <p className="mt-4 text-sm leading-6 text-ink-2">{sgi.verifiedRole}.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold text-ink">Coordonnées vérifiées</h2>
          <div className="mt-4 space-y-3 text-xs leading-5 text-ink-2">
            <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {sgi.address}</p>
            <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {sgi.phones.join(" · ")}</p>
            {sgi.email ? <a href={`mailto:${sgi.email}`} className="flex gap-2 hover:text-accent"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {sgi.email}</a> : <p>E-mail : à confirmer directement.</p>}
            {sgi.website ? <a href={sgi.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent">Site web <ExternalLink className="h-3 w-3" /></a> : <p>Site web : non indiqué par le répertoire consulté.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-warn/25 bg-warn/5 p-5">
          <h2 className="text-sm font-bold text-ink">À confirmer avant d&apos;ouvrir</h2>
          <ul className="mt-4 space-y-2 text-xs text-ink-2">
            {sgi.unknowns.map((item) => <li key={item}>• {item}</li>)}
          </ul>
          <p className="mt-4 text-[11px] leading-4 text-ink-3">
            Ces champs ne sont pas publiés de façon comparable dans la source
            officielle consultée. WARIBA ne les estime pas.
          </p>
        </div>
      </section>
      <a href={sgi.officialDirectoryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
        Vérifier dans le répertoire officiel BRVM <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
