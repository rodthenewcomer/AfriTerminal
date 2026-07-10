#!/usr/bin/env python3
"""
Pipeline opérations sur titres : agrège deux sources officielles brvm.org
en data/real/operations.json — liens vers les PDF sources, on ne copie rien.

1. Avis officiels du marché (/fr/marche/avis-et-publications/avis) :
   flux quasi quotidien (calendriers de dividendes, transactions sur
   dossier, radiations, admissions...). Premières pages seulement.
2. Événements sur valeurs (/fr/esv/<type>) : tables structurées par type
   d'opération (augmentation de capital, fractionnement, réduction de
   capital, consolidation) — émetteur, dates, parité, avis/communiqué PDF.

Remplace les opérations IPO fictives de la démo par du réel. Même
philosophie que fetch_documents.py : stdlib uniquement, exécution en CI.

Usage :
    python3 scripts/boc/fetch_operations.py --out data/real/operations.json
"""

from __future__ import annotations

import argparse
import html as htmllib
import json
import re
import time
import urllib.request
from pathlib import Path

USER_AGENT = "AfriTerminal-operations/1.0 (agrégateur non commercial, liens vers la source)"
BASE = "https://www.brvm.org"
AVIS_PAGES = 3  # ~10 avis/page, 3 pages ≈ 2-3 mois d'historique
ESV_TYPES = {
    "augmentation-de-capital": "Augmentation de capital",
    "fractionnement": "Fractionnement (split)",
    "reduction-de-capital": "Réduction de capital",
    "consolidation": "Consolidation",
}

TABLE_RE = re.compile(r"<table[^>]*>(.*?)</table>", re.S)
ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S)
PDF_HREF_RE = re.compile(r'href="(https://www\.brvm\.org/sites/default/files/[^"]+\.pdf)"')
TAG_RE = re.compile(r"<[^>]+>")

FR_MONTHS = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8, "aout": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12,
    "decembre": 12,
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def clean(cell: str) -> str:
    return htmllib.unescape(TAG_RE.sub(" ", cell)).strip().replace("\xa0", " ")


def cell_pdf(cell: str) -> str | None:
    m = PDF_HREF_RE.search(cell)
    return m.group(1) if m else None


def main_tables(page_html: str) -> list[str]:
    """Tables de la zone de contenu — la sidebar contient aussi une table
    (Top 5) qu'il faut ignorer : on écarte les tables dont l'en-tête
    ressemble au widget cours."""
    tables = TABLE_RE.findall(page_html)
    out = []
    for t in tables:
        header = clean(ROW_RE.findall(t)[0]) if ROW_RE.findall(t) else ""
        if "Top 5" in header or "Variation" in header:
            continue
        out.append(t)
    return out


def parse_fr_date(text: str) -> str | None:
    """'19 novembre 2024' ou '09/07/2026' -> ISO, sinon None."""
    m = re.search(r"(\d{1,2})/(\d{2})/(\d{4})", text)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{int(m.group(1)):02d}"
    m = re.search(r"(\d{1,2})(?:er)?\s+([a-zéûôè]+)\s+(\d{4})", text, re.I)
    if m and m.group(2).lower() in FR_MONTHS:
        return f"{m.group(3)}-{FR_MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    return None


def scrape_avis() -> list[dict]:
    """Avis officiels du marché, {title, date, pdf}."""
    out: list[dict] = []
    for page in range(AVIS_PAGES):
        url = f"{BASE}/fr/marche/avis-et-publications/avis"
        if page:
            url += f"?page={page}"
        page_html = fetch(url)
        for table in main_tables(page_html):
            for row in ROW_RE.findall(table):
                cells = CELL_RE.findall(row)
                if len(cells) < 3:
                    continue
                title = clean(cells[0])
                date = parse_fr_date(clean(cells[1]))
                pdf = next((cell_pdf(c) for c in cells if cell_pdf(c)), None)
                if not title or not date or not pdf:
                    continue
                out.append({"title": title, "date": date, "pdf": pdf})
        time.sleep(1)
    return out


def scrape_esv() -> list[dict]:
    """Événements sur valeurs, {kind, issuer, date, parity, avisPdf, communiquePdf}."""
    out: list[dict] = []
    for slug, kind in ESV_TYPES.items():
        try:
            page_html = fetch(f"{BASE}/fr/esv/{slug}")
        except OSError as e:
            print(f"esv/{slug} : inaccessible ({e}) — ignoré")
            continue
        for table in main_tables(page_html):
            rows = ROW_RE.findall(table)
            if not rows:
                continue
            for row in rows[1:]:  # première ligne = en-têtes
                cells = CELL_RE.findall(row)
                if len(cells) < 4:
                    continue
                issuer = clean(cells[0])
                if not issuer:
                    continue
                texts = [clean(c) for c in cells]
                date = next((d for d in (parse_fr_date(t) for t in texts) if d), None)
                # parité = première cellule contenant "action(s)" ou "pour"
                parity = next(
                    (t for t in texts[1:] if re.search(r"actions?\s|pour", t, re.I)),
                    None,
                )
                pdfs = [p for p in (cell_pdf(c) for c in cells) if p]
                out.append(
                    {
                        "kind": kind,
                        "issuer": issuer,
                        "date": date,
                        "parity": parity,
                        "avisPdf": pdfs[0] if pdfs else None,
                        "communiquePdf": pdfs[1] if len(pdfs) > 1 else None,
                    }
                )
        time.sleep(1)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/real/operations.json")
    args = parser.parse_args()

    avis = scrape_avis()
    esv = scrape_esv()
    avis.sort(key=lambda a: a["date"], reverse=True)
    esv.sort(key=lambda e: e["date"] or "", reverse=True)

    payload = {"avis": avis, "operations": esv}
    Path(args.out).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{len(avis)} avis · {len(esv)} opérations sur valeurs → {args.out}")


if __name__ == "__main__":
    main()
