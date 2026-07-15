#!/usr/bin/env python3
"""
Pipeline documents : liste les publications officielles (PDF) de chaque
société depuis sa fiche BRVM (/fr/rapports-societe-cotes/[slug]) et
écrit data/real/documents.json — titre lisible, type, date, lien direct
vers le PDF sur brvm.org. On référence, on ne copie pas les fichiers.

Les noms de fichiers BRVM suivent une convention stable :
    YYYYMMDD_-_type_du_document_-_periode_-_societe.pdf
d'où sont dérivés la date, le type et le titre. Exécution toutes les
5 minutes en CI (documents.yml) + à la main : une publication de
résultats ne doit jamais attendre le prochain lundi.

Usage :
    python3 scripts/boc/fetch_documents.py --out data/real/documents.json
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re
import urllib.request
from pathlib import Path

USER_AGENT = "WARIBA-documents/1.0 (agrégateur non commercial, liens vers la source)"
BASE = "https://www.brvm.org"
# Conserver assez d'historique pour ne pas perdre un rapport quand plusieurs
# PDF (activité, états, IFRS, SYSCOHADA, attestation) paraissent le même jour.
MAX_PER_COMPANY = 20

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
    (
        r"rapport_d.?activites|resultats|rapport_annuel|rapport_de_gestion|"
        r"informations?_trimestrielles?|commentaires?_sur_l.?activite",
        "Résultats",
    ),
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
    docs.sort(
        key=lambda d: (-int(d["date"].replace("-", "")), d["url"])
    )
    return docs[:MAX_PER_COMPANY]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/real/documents.json")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--snapshot", default="data/real/snapshot.json")
    args = parser.parse_args()

    snapshot_path = Path(args.snapshot)
    if snapshot_path.exists():
        expected = set(json.loads(snapshot_path.read_text(encoding="utf-8")))
        configured = set(SLUGS)
        if configured != expected:
            missing = sorted(expected - configured)
            obsolete = sorted(configured - expected)
            raise SystemExit(
                "Couverture documents incomplète. "
                f"Tickers sans fiche: {missing or 'aucun'}; "
                f"tickers hors snapshot: {obsolete or 'aucun'}."
            )

    out_path = Path(args.out)
    previous: dict[str, list[dict]] = {}
    if out_path.exists():
        for item in json.loads(out_path.read_text(encoding="utf-8")):
            previous.setdefault(item["ticker"], []).append(item)

    def fetch_company(ticker: str, slug: str) -> tuple[str, list[dict]]:
        html = fetch(f"{BASE}/fr/rapports-societe-cotes/{slug}")
        return ticker, parse_page(html, ticker)

    all_docs: list[dict] = []
    errors = 0
    workers = max(1, min(args.workers, 8))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(fetch_company, ticker, slug): (ticker, slug)
            for ticker, slug in sorted(SLUGS.items())
        }
        for future in as_completed(futures):
            ticker, slug = futures[future]
            try:
                _, docs = future.result()
                # Certaines pages BRVM alternent entre plusieurs PDF placés à
                # la même date. L'union avec le dernier état connu empêche un
                # rapport de disparaître puis réapparaître au run suivant.
                merged = {
                    item["url"]: item
                    for item in [*previous.get(ticker, []), *docs]
                }
                stable_docs = sorted(
                    merged.values(),
                    key=lambda d: (
                        -int(d["date"].replace("-", "")),
                        d["url"],
                    ),
                )
                all_docs.extend(stable_docs[:MAX_PER_COMPANY])
            except Exception as e:  # une fiche en panne ne bloque pas les autres
                errors += 1
                # Un incident réseau ne doit jamais supprimer les dernières
                # publications connues de la société dans le fichier public.
                all_docs.extend(previous.get(ticker, []))
                print(f"{ticker} ({slug}): erreur {type(e).__name__}: {e}")

    # Ordre déterministe malgré les réponses concurrentes : sans le ticker et
    # l'URL comme départage, deux documents du même jour changeaient parfois
    # de place et déclenchaient à tort OCR, commit et déploiement.
    all_docs.sort(
        key=lambda d: (-int(d["date"].replace("-", "")), d["ticker"], d["url"])
    )
    out_path.write_text(
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
