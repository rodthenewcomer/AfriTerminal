#!/usr/bin/env python3
"""
Parseur du Bulletin Officiel de la Cote (BOC) de la BRVM.

Le BOC est un PDF quotidien publié sur brvm.org. Ce script extrait le
marché des actions (pages "MARCHE DES ACTIONS") en JSON structuré, prêt
à remplacer les données mockées de lib/mock/stocks.ts et lib/mock/series.ts.

Couverture validée : ~2019 -> aujourd'hui (deux schémas de table gérés
automatiquement selon le nombre de colonnes détecté, voir README.md).
Hors scope volontairement : marché des obligations, marché des droits,
OPCVM, avis divers, et l'ère ~2016-2018 (schéma de table différent).

Usage :
    python3 parse_boc.py bulletin.pdf [--out sortie.json]

Dépendance : pdfplumber (`pip install pdfplumber`).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime

import pdfplumber

# Légende des secteurs telle qu'imprimée en bas de la table des actions.
SECTOR_LABELS = {
    "TEL": "Télécommunications",
    "FIN": "Services financiers",
    "CD": "Consommation discrétionnaire",
    "CB": "Consommation de base",
    "IND": "Industriels",
    "ENE": "Énergie",
    "SPU": "Services publics",
}

# Deux schémas de table observés dans les BOC réels :
#  - 16 colonnes, avec code secteur en tête : ~2022 -> aujourd'hui.
#  - 15 colonnes, identique mais SANS le code secteur : ~2019 -> nov. 2021.
# Le schéma le plus ancien (~2016-2018, 18 colonnes, ordre différent,
# secteur en ligne bannière) n'est pas géré ici — voir README.md.
EQUITY_TABLE_COLS_MODERN = 16
EQUITY_TABLE_COLS_LEGACY = 15
EQUITY_TABLE_COLS = {EQUITY_TABLE_COLS_MODERN, EQUITY_TABLE_COLS_LEGACY}
MONTH_FR = {
    "janv": 1, "févr": 2, "mars": 3, "avr": 4, "mai": 5, "juin": 6,
    "juil": 7, "août": 8, "sept": 9, "oct": 10, "nov": 11, "déc": 12,
}


@dataclass
class BocIndex:
    code: str
    level: float
    day_change_pct: float
    year_change_pct: float


@dataclass
class BocStock:
    sector_code: str
    ticker: str
    name: str
    prev_close: float
    open: float | None
    close: float
    day_change_pct: float
    volume: int
    value: float
    ref_price: float
    ytd_change_pct: float
    last_dividend_net: float | None
    last_dividend_date: str | None
    net_yield_pct: float | None
    per: float | None


@dataclass
class BocBulletin:
    date: str
    bulletin_number: str | None
    indices: list[BocIndex]
    stocks: list[BocStock]


def fr_number(raw: str) -> float | None:
    """'16 500', '-3,58 %', '441,04' -> float. '' / None -> None."""
    if raw is None:
        return None
    s = raw.strip().replace("\xa0", " ").replace(" ", "").replace("%", "")
    if s == "":
        return None
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def equity_integer(raw: str) -> float | None:
    """Prix, volume ou valeur entière, même si le PDF utilise `1,900`.

    Les pourcentages et ratios continuent d'utiliser ``fr_number`` car leur
    virgule est décimale. Les cours BRVM et quantités sont publiés en unités
    entières ; trois chiffres après une virgule sont donc un séparateur de
    milliers provenant de certains anciens bulletins.
    """
    if raw is None:
        return None
    value = raw.strip().replace("\xa0", " ").replace(" ", "").replace("%", "")
    if value == "":
        return None
    if re.fullmatch(r"-?\d{1,3}(,\d{3})+", value):
        value = value.replace(",", "")
    else:
        value = value.replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return None


def fr_date(raw: str) -> str | None:
    """'18-août-25' -> '2025-08-18'. Returns None if unparsable."""
    if not raw or not raw.strip():
        return None
    m = re.match(r"(\d{1,2})-([a-zéû.]+)-(\d{2})", raw.strip(), re.IGNORECASE)
    if not m:
        return None
    day, month_raw, year2 = m.groups()
    month_key = month_raw.rstrip(".").lower()
    month = MONTH_FR.get(month_key)
    if month is None:
        return None
    yy = int(year2)
    # Le BOC imprime les années sur 2 chiffres. Utiliser 2000+yy ferait
    # passer '99' en 2099 ; pivot POSIX classique, suffisant pour BRVM.
    year = 2000 + yy if yy <= 68 else 1900 + yy
    return f"{year:04d}-{month:02d}-{int(day):02d}"


def parse_indices(first_page_text: str) -> list[BocIndex]:
    """Parse les 3 indices de tête (BRVM COMPOSITE / BRVM 30 / BRVM PRESTIGE)."""
    indices: list[BocIndex] = []
    header = re.search(
        r"BRVM COMPOSITE\s+([\d\s,]+)\s+BRVM 30\s+([\d\s,]+)\s+BRVM PRESTIGE\s+([\d\s,]+)",
        first_page_text,
    )
    day_changes = re.search(
        r"Variation Jour\s+([-\d,]+)\s*%\s+Variation Jour\s+([-\d,]+)\s*%\s+Variation Jour\s+([-\d,]+)\s*%",
        first_page_text,
    )
    year_changes = re.search(
        r"Variation annuelle\s+([-\d,]+)\s*%\s+Variation annuelle\s+([-\d,]+)\s*%\s+Variation annuelle\s+([-\d,]+)\s*%",
        first_page_text,
    )
    if not (header and day_changes and year_changes):
        return indices
    codes = ["BRVMC", "BRVM30", "BRVMPRES"]
    for i, code in enumerate(codes):
        indices.append(
            BocIndex(
                code=code,
                level=fr_number(header.group(i + 1)) or 0.0,
                day_change_pct=fr_number(day_changes.group(i + 1)) or 0.0,
                year_change_pct=fr_number(year_changes.group(i + 1)) or 0.0,
            )
        )
    return indices


def find_equity_pages(pdf: pdfplumber.PDF) -> list[int]:
    """Pages contenant des tables actions (15 ou 16 col.), avant 'TOTAL - MARCHE DES ACTIONS'."""
    pages = []
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        has_equity_table = any(
            len(t[0]) in EQUITY_TABLE_COLS for t in page.extract_tables() if t
        )
        if has_equity_table:
            pages.append(i)
        if "TOTAL - MARCHE DES ACTIONS" in text:
            break
    return pages


def parse_equity_row(row: list[str | None]) -> BocStock | None:
    ncols = len(row)
    if ncols == EQUITY_TABLE_COLS_MODERN:
        sector, ticker, name = row[0], row[1], row[2]
        rest = row[4:]  # row[3] est une colonne vide (fusion de cellule)
    elif ncols == EQUITY_TABLE_COLS_LEGACY:
        sector, ticker, name = "", row[0], row[1]
        rest = row[3:]  # même schéma, sans la colonne code secteur
    else:
        return None

    if not ticker or not re.match(r"^[A-Z0-9]{3,6}$", ticker):
        return None
    (
        prev_close,
        open_,
        close,
        day_change,
        volume,
        value,
        ref_price,
        ytd_change,
        div_amount,
        div_date,
        net_yield,
        per,
    ) = rest

    close_v = equity_integer(close)
    if close_v is None:
        return None

    return BocStock(
        sector_code=(sector or "").strip(),
        ticker=ticker.strip(),
        name=" ".join((name or "").split()),
        prev_close=equity_integer(prev_close) or 0.0,
        open=equity_integer(open_),
        close=close_v,
        day_change_pct=fr_number(day_change) or 0.0,
        volume=int(equity_integer(volume) or 0),
        value=equity_integer(value) or 0.0,
        ref_price=equity_integer(ref_price) or close_v,
        ytd_change_pct=fr_number(ytd_change) or 0.0,
        last_dividend_net=fr_number(div_amount),
        last_dividend_date=fr_date(div_date or ""),
        net_yield_pct=fr_number(net_yield),
        per=fr_number(per),
    )


def parse_bulletin(pdf_path: str) -> BocBulletin:
    with pdfplumber.open(pdf_path) as pdf:
        first_page_text = pdf.pages[0].extract_text() or ""

        date_match = re.search(
            r"(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+"
            r"(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})",
            first_page_text,
            re.IGNORECASE,
        )
        num_match = re.search(r"N°\s*(\d+)", first_page_text)

        months_full = [
            "janvier", "février", "mars", "avril", "mai", "juin", "juillet",
            "août", "septembre", "octobre", "novembre", "décembre",
        ]
        if date_match:
            day, month_name, year = date_match.group(2), date_match.group(3), date_match.group(4)
            month = months_full.index(month_name.lower()) + 1
            date_str = f"{year}-{month:02d}-{int(day):02d}"
        else:
            # Repli sur la date système — trompeur pour un usage batch (voir
            # backfill.py, qui impose la vraie date de calendrier plutôt que
            # de faire confiance à ce regex). Signalé pour l'usage CLI direct.
            date_str = datetime.now().strftime("%Y-%m-%d")
            print(
                f"AVERTISSEMENT: date introuvable dans le texte du PDF, "
                f"repli sur la date système ({date_str}) — probablement incorrect.",
                file=sys.stderr,
            )

        indices = parse_indices(first_page_text)

        stocks: list[BocStock] = []
        seen_tickers: set[str] = set()
        for page_idx in find_equity_pages(pdf):
            for table in pdf.pages[page_idx].extract_tables():
                if not table or len(table[0]) not in EQUITY_TABLE_COLS:
                    continue
                for row in table:
                    stock = parse_equity_row(row)
                    if stock and stock.ticker not in seen_tickers:
                        stocks.append(stock)
                        seen_tickers.add(stock.ticker)

        return BocBulletin(
            date=date_str,
            bulletin_number=num_match.group(1) if num_match else None,
            indices=indices,
            stocks=stocks,
        )


def to_payload(bulletin: BocBulletin) -> dict:
    return {
        "date": bulletin.date,
        "bulletinNumber": bulletin.bulletin_number,
        "indices": [asdict(i) for i in bulletin.indices],
        "stockCount": len(bulletin.stocks),
        "stocks": [asdict(s) for s in bulletin.stocks],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", help="Chemin vers le BOC (PDF)")
    parser.add_argument("--out", help="Fichier JSON de sortie (défaut: stdout)")
    args = parser.parse_args()

    bulletin = parse_bulletin(args.pdf)
    payload = to_payload(bulletin)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"OK — {len(bulletin.stocks)} actions écrites dans {args.out}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
