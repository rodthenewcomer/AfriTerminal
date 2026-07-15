#!/usr/bin/env python3
"""
Pipeline documents : liste les publications officielles (PDF) de chaque
société depuis sa fiche BRVM (/fr/rapports-societe-cotes/[slug]) et
écrit data/real/documents.json — titre lisible, type, date, lien direct
vers le PDF sur brvm.org. On référence, on ne copie pas les fichiers.

Les noms de fichiers BRVM suivent une convention stable :
    YYYYMMDD_-_type_du_document_-_periode_-_societe.pdf
d'où sont dérivés la date, le type et le titre. Exécution hebdomadaire
en CI (documents.yml) + à la main.

Usage :
    python3 scripts/boc/fetch_documents.py --out data/real/documents.json
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from pathlib import Path

USER_AGENT = "WARIBA-documents/1.0 (agrégateur non commercial, liens vers la source)"
BASE = "https://www.brvm.org"
MAX_PER_COMPANY = 8

# Ticker -> slug de la fiche société BRVM (vérifiés sur le listing
# /fr/rapports-societes-cotees, 2026-07). Les slugs non-actions (FCTC,
# TPCI...) sont hors périmètre.
SLUGS: dict[str, str] = {
    "ABJC": "servair-abidjan-ci", "BICB": "biic", "BICC": "bici-ci",
    "BNBC": "bernabe-ci", "BOAB": "bank-africa-bn", "BOABF": "bank-africa-bf",
    "BOAC": "bank-africa-ci", "BOAM": "bank-africa-ml", "BOAN": "bank-africa-ng",
    "BOAS": "bank-africa-sn", "CABC": "sicable", "CBIBF": "coris-bank-international",
    "CFAC": "cfao-motors-ci", "CIEC": "cie-ci", "ECOC": "ecobank-ci",
    "ETIT": "ecobank-tg", "FTSC": "filtisac-ci", "LNBB": "lnb",
    "NEIC": "nei-ceda-ci", "NSBC": "nsbc", "NTLC": "nestle-ci",
    "ONTBF": "onatel-bf", "ORAC": "orange-ci", "ORGT": "oragroup",
    "PALC": "palm-ci", "PRSC": "tractafric-ci", "SAFC": "safca-ci",
    "SCRC": "sucrivoire", "SDCC": "sodeci", "SDSC": "bollore-transport-logistics",
    "SEMC": "crown-siem-ci", "SGBC": "sgci", "SHEC": "vivo-energy-ci",
    "SIBC": "sib", "SICC": "sicor", "SIVC": "air-liquide-ci",
    "SLBC": "solibra", "SMBC": "smb", "SNTS": "sonatel",
    "SOGC": "sogb", "SPHC": "saph-ci", "STAC": "setao-ci",
    "STBC": "sitab", "SVOC": "movis-ci", "TTLC": "total",
    "TTLS": "total-senegal-sa", "UNLC": "unilever-ci", "UNXC": "uniwax-ci",
}

PDF_RE = re.compile(r'href="(https://www\.brvm\.org/sites/default/files/[^"]+\.pdf)"')
DATE_RE = re.compile(r"/(\d{8})_")

TYPE_RULES: list[tuple[str, str]] = [
    (r"etats_financiers|comptes_annuels", "États financiers"),
    (r"rapport_d.?activites|resultats", "Résultats"),
    (r"dividende", "Dividende"),
    (r"assemblee|_ago_|_age_|mixte", "AGO"),
    (r"attestation|commissaires", "États financiers"),
]


def doc_type(filename: str) -> str:
    low = filename.lower()
    for pattern, label in TYPE_RULES:
        if re.search(pattern, low):
            return label
    return "Communiqué"


def prettify(filename: str) -> str:
    """20260318_-_etats_financiers_syscohada_-_exercice_2025_-_saph_ci.pdf
    -> « États financiers syscohada — exercice 2025 »"""
    stem = filename.rsplit("/", 1)[-1].removesuffix(".pdf")
    parts = [p.strip("_") for p in stem.split("_-_")]
    middle = parts[1:-1] if len(parts) >= 3 else parts[1:] or parts
    text = " — ".join(p.replace("_", " ").strip() for p in middle if p)
    return (text[:1].upper() + text[1:]) if text else stem


def parse_page(html: str, ticker: str) -> list[dict]:
    docs = []
    seen: set[str] = set()
    for url in PDF_RE.findall(html):
        if url in seen:
            continue
        seen.add(url)
        m = DATE_RE.search(url)
        if not m:
            continue
        raw = m.group(1)
        date = f"{raw[:4]}-{raw[4:6]}-{raw[6:]}"
        filename = url.rsplit("/", 1)[-1]
        docs.append(
            {
                "ticker": ticker,
                "title": prettify(filename),
                "type": doc_type(filename),
                "date": date,
                "url": url,
            }
        )
    docs.sort(key=lambda d: d["date"], reverse=True)
    return docs[:MAX_PER_COMPANY]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/real/documents.json")
    args = parser.parse_args()

    all_docs: list[dict] = []
    errors = 0
    for ticker, slug in sorted(SLUGS.items()):
        try:
            html = fetch(f"{BASE}/fr/rapports-societe-cotes/{slug}")
            all_docs.extend(parse_page(html, ticker))
        except Exception as e:  # une fiche en panne ne bloque pas les autres
            errors += 1
            print(f"{ticker} ({slug}): erreur {type(e).__name__}: {e}")
        time.sleep(1)  # courtoisie serveur

    all_docs.sort(key=lambda d: d["date"], reverse=True)
    Path(args.out).write_text(
        json.dumps(all_docs, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    by_type: dict[str, int] = {}
    for d in all_docs:
        by_type[d["type"]] = by_type.get(d["type"], 0) + 1
    print(
        f"{len(all_docs)} documents ({len(SLUGS) - errors}/{len(SLUGS)} fiches) "
        f"-> {args.out} {by_type}"
    )


if __name__ == "__main__":
    main()
