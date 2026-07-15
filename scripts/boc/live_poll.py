#!/usr/bin/env python3
"""
Collecteur de cours "temps réel" (en fait différés de 15 min) depuis la
page d'accueil brvm.org, pour reconstruire un vrai plus haut/bas
intraday — donnée que le BOC quotidien ne publie pas (voir README.md).

Un seul appel = un seul point de mesure. Ce script est prévu pour être
exécuté en boucle (cron / tâche planifiée) toutes les quelques minutes
pendant la séance BRVM (09h45–14h45, heure d'Abidjan = GMT, lun-ven).
Chaque exécution met à jour data/live/AAAA-MM-JJ.json : pour chaque
ticker, open (premier prix vu ce jour), high/low (min/max observés),
close (dernier prix vu), et le nombre d'échantillons.

Ce n'est PAS un backfill historique : ça ne construit un vrai intraday
que pour les jours où le collecteur a effectivement tourné. Voir
README.md pour la limite correspondante sur les données passées.

Usage (un seul poll) :
    python3 live_poll.py --out-dir ../../data/live

Usage (boucle locale simple, alternative à un vrai cron) :
    while :; do python3 live_poll.py --out-dir ../../data/live; sleep 180; done
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

HOME_URL = "https://www.brvm.org"
USER_AGENT = "WARIBA-live-poll/1.0 (usage interne, projet non commercial)"

ITEM_RE = re.compile(
    r'<span>([A-Z0-9]{3,6})</span>&nbsp;<span>([\d\s]+)</span>&nbsp;'
    r'<span>(-?[\d,]+)%</span>'
)


def fr_number(raw: str) -> float:
    return float(raw.strip().replace(" ", "").replace("\xa0", "").replace(",", "."))


def fetch_quotes() -> dict[str, float]:
    req = Request(HOME_URL, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    quotes = {}
    for ticker, price_raw, _var_raw in ITEM_RE.findall(html):
        quotes[ticker] = fr_number(price_raw)
    return quotes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", default="data/live")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Heure d'Abidjan = UTC toute l'année (pas d'heure d'été).
    now = datetime.now(timezone.utc)
    out_path = out_dir / f"{now.date().isoformat()}.json"

    state: dict[str, dict] = {}
    if out_path.exists():
        state = json.loads(out_path.read_text(encoding="utf-8"))

    quotes = fetch_quotes()
    if not quotes:
        print("Aucune cotation trouvée — page inaccessible ou format changé.")
        return

    for ticker, price in quotes.items():
        if ticker not in state:
            state[ticker] = {
                "open": price,
                "high": price,
                "low": price,
                "close": price,
                "samples": 1,
                "first_seen": now.isoformat(),
                "last_seen": now.isoformat(),
            }
        else:
            rec = state[ticker]
            rec["high"] = max(rec["high"], price)
            rec["low"] = min(rec["low"], price)
            rec["close"] = price
            rec["samples"] += 1
            rec["last_seen"] = now.isoformat()

    out_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{now.isoformat()} — {len(quotes)} cotations -> {out_path}")


if __name__ == "__main__":
    main()
