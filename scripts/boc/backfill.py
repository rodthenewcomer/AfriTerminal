#!/usr/bin/env python3
"""
Backfill de l'historique BRVM à partir des bulletins BOC quotidiens.

Boucle sur tous les jours ouvrés (lun-ven) entre --start et --end,
télécharge le bulletin correspondant (essaie l'URL avec suffixe "_2",
puis sans suffixe — voir README.md pour les deux formats), le parse
avec parse_boc.parse_bulletin, et écrit un JSON par jour dans
--out-dir. Reprise possible : les jours déjà présents sont ignorés, on
peut donc interrompre et relancer sans perdre le travail fait.

Un jour sans bulletin (jour férié, aucune des deux URLs ne répond) est
noté et sauté, pas une erreur. Un jour dont le PDF existe mais dont le
format n'est pas encore supporté (0 action extraite, cf. ère
~2016-2018) est également noté et sauté — le journal en fin d'exécution
sert à repérer où la couverture réelle commence.

Usage :
    python3 backfill.py --start 2019-01-01 --end 2026-07-07 \
        --out-dir ../../data/boc/raw --delay 0.8
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from parse_boc import parse_bulletin, to_payload

BOC_URL = "https://www.brvm.org/sites/default/files/boc_{date}{suffix}.pdf"
USER_AGENT = "WARIBA-backfill/1.0 (usage interne, projet non commercial)"


def fetch_pdf(d: date, dest: Path) -> bool:
    """Essaie les deux conventions de nommage connues. True si un PDF a été récupéré.

    OSError couvre TimeoutError/ConnectionError et tout ce qu'URLError peut
    envelopper — un simple timeout réseau ne doit jamais faire planter tout
    le backfill (vécu : un TimeoutError non catché a arrêté le process après
    ~155 jours lors du premier run). Un essai de plus par suffixe absorbe les
    timeouts transitoires avant de passer au suffixe suivant / à l'échec.
    """
    for suffix in ("_2", ""):
        url = BOC_URL.format(date=d.strftime("%Y%m%d"), suffix=suffix)
        for attempt in range(2):
            try:
                req = Request(url, headers={"User-Agent": USER_AGENT})
                with urlopen(req, timeout=20) as resp:
                    dest.write_bytes(resp.read())
                    return True
            except HTTPError:
                break  # 404 etc. : inutile de réessayer, on passe au suffixe suivant
            except (URLError, OSError):
                if attempt == 0:
                    time.sleep(2)
                continue
    return False


def business_days(start: date, end: date):
    d = start
    while d <= end:
        if d.weekday() < 5:
            yield d
        d += timedelta(days=1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", required=True, help="AAAA-MM-JJ")
    parser.add_argument("--end", required=True, help="AAAA-MM-JJ")
    parser.add_argument("--out-dir", default="data/boc/raw")
    parser.add_argument(
        "--delay", type=float, default=0.8,
        help="Pause en secondes entre requêtes (courtoisie serveur)",
    )
    args = parser.parse_args()

    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_pdf = Path("/tmp/wariba-backfill-current.pdf")

    ok = missing = unsupported = errors = skipped_existing = 0

    for d in business_days(start, end):
        out_path = out_dir / f"{d.isoformat()}.json"
        if out_path.exists():
            skipped_existing += 1
            continue

        # Filet de sécurité : une exception vraiment imprévue sur un jour ne
        # doit plus jamais arrêter tout le backfill (cf. le crash du premier
        # run après 155 jours à cause d'un TimeoutError non catché ailleurs).
        try:
            if not fetch_pdf(d, tmp_pdf):
                missing += 1
                print(f"{d} — aucun bulletin trouvé (jour férié probable)", file=sys.stderr)
                time.sleep(args.delay)
                continue

            bulletin = parse_bulletin(str(tmp_pdf))
            # La date de calendrier qu'on a explicitement demandée est plus
            # fiable que le regex sur le texte du PDF, qui échoue parfois
            # silencieusement (constaté sur 5/1745 bulletins du premier
            # backfill complet — parse_bulletin retombe alors sur la date
            # système du jour d'exécution, ce qui produit des doublons dans
            # les séries agrégées). d est connu et vérifié : on l'impose.
            bulletin.date = d.isoformat()
            if bulletin.stocks:
                out_path.write_text(
                    json.dumps(to_payload(bulletin), ensure_ascii=False), encoding="utf-8"
                )
                ok += 1
                print(f"{d} — {len(bulletin.stocks)} actions", file=sys.stderr)
            else:
                unsupported += 1
                print(f"{d} — 0 action extraite (format non supporté ?)", file=sys.stderr)
        except Exception as exc:
            errors += 1
            print(f"{d} — erreur inattendue: {exc}", file=sys.stderr)

        time.sleep(args.delay)

    print(
        f"\nTerminé — ok: {ok} · déjà présents: {skipped_existing} · "
        f"sans bulletin: {missing} · format non supporté: {unsupported} · "
        f"erreurs inattendues: {errors}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
