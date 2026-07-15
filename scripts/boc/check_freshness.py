#!/usr/bin/env python3
"""
Watchdog de fraîcheur des données : échoue (exit 1) quand le site sert
des cours plus vieux que ce que la BRVM a réellement publié.

Motivation (incident du 2026-07-10) : la BRVM a publié le bulletin du
09/07 après la dernière passe planifiée de boc-daily — le site a servi
« séance du 8 » toute la matinée du 10, détecté à l'œil nu par
l'utilisateur, aucun signal automatique. Ce script transforme la
staleness silencieuse en workflow rouge (→ e-mail GitHub).

Logique : pour chaque jour ouvré manquant entre la dernière séance
ingérée et hier (UTC), on vérifie si le bulletin existe en ligne
(HEAD sur les deux motifs d'URL) :
- bulletin EN LIGNE mais absent de nos données → échec du pipeline
  (parse cassé, format changé, cron raté...) → ALERTE ;
- bulletin ABSENT en ligne → férié ou publication tardive → toléré,
  SAUF si ça dure MAX_SILENT_DAYS jours ouvrés consécutifs (la BRVM ne
  ferme jamais aussi longtemps hors vide d'archive exceptionnel — un
  silence pareil signifie plutôt que le motif d'URL a changé) → ALERTE.

Usage :
    python3 scripts/boc/check_freshness.py --snapshot data/real/snapshot.json
stdlib uniquement (comme live_poll.py) — pas de dépendance en CI.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

USER_AGENT = "WARIBA-freshness/1.0 (usage interne, projet non commercial)"
BULLETIN_URLS = [
    "https://www.brvm.org/sites/default/files/boc_{ymd}_2.pdf",
    "https://www.brvm.org/sites/default/files/boc_{ymd}.pdf",
]
# Au-delà de ce nombre de jours ouvrés consécutifs sans bulletin en
# ligne, on alerte même sans preuve d'échec du pipeline : plus
# probablement un changement de motif d'URL qu'une fermeture BRVM.
MAX_SILENT_DAYS = 3


def latest_trading_date(snapshot: dict) -> str:
    """Dernière séance couverte (max des asOfDate) — même définition que
    LATEST_TRADING_DATE côté app (lib/real-data.ts)."""
    return max(q["asOfDate"] for q in snapshot.values())


def missing_weekdays(latest: str, today: date) -> list[str]:
    """Jours ouvrés strictement entre la dernière séance ingérée et
    aujourd'hui (exclu : le bulletin du jour ne paraît que le soir)."""
    start = datetime.strptime(latest, "%Y-%m-%d").date() + timedelta(days=1)
    out = []
    d = start
    while d < today:
        if d.weekday() < 5:
            out.append(d.isoformat())
        d += timedelta(days=1)
    return out


def bulletin_online(day: str, opener=None) -> bool:
    """HEAD sur les deux motifs d'URL du bulletin de ce jour."""
    ymd = day.replace("-", "")
    for pattern in BULLETIN_URLS:
        req = urllib.request.Request(
            pattern.format(ymd=ymd),
            method="HEAD",
            headers={"User-Agent": USER_AGENT},
        )
        try:
            with (opener or urllib.request).urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    return True
        except urllib.error.HTTPError:
            continue
        except OSError:
            # Erreur réseau transitoire : ne pas conclure à l'absence —
            # on retente au prochain run plutôt que d'alerter à tort.
            continue
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", default="data/real/snapshot.json")
    args = parser.parse_args()

    snapshot = json.loads(Path(args.snapshot).read_text(encoding="utf-8"))
    latest = latest_trading_date(snapshot)
    today = datetime.now(timezone.utc).date()
    missing = missing_weekdays(latest, today)

    print(f"Dernière séance ingérée : {latest} · aujourd'hui (UTC) : {today}")
    if not missing:
        print("OK — aucune séance manquante.")
        return 0

    print(f"Jours ouvrés sans données : {', '.join(missing)}")
    published = [d for d in missing if bulletin_online(d)]

    if published:
        print(
            f"ALERTE — bulletin(s) en ligne sur brvm.org mais absent(s) de nos "
            f"données : {', '.join(published)}. Le pipeline boc-daily n'a pas "
            f"ingéré ces séances (cron raté, parse cassé, ou format changé) — "
            f"relancer boc-daily manuellement et inspecter ses logs."
        )
        return 1

    if len(missing) >= MAX_SILENT_DAYS:
        print(
            f"ALERTE — {len(missing)} jours ouvrés consécutifs sans bulletin "
            f"en ligne (aucun des deux motifs d'URL ne répond). Fermeture BRVM "
            f"aussi longue improbable : vérifier si le motif d'URL des "
            f"bulletins a changé sur brvm.org."
        )
        return 1

    print(
        "OK — bulletin(s) pas encore publié(s) par la BRVM "
        "(férié ou publication tardive), rien à ingérer."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
