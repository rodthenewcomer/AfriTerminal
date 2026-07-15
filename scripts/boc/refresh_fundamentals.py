#!/usr/bin/env python3
"""Actualise automatiquement les fondamentaux depuis les publications BRVM.

Le pipeline est volontairement fail-closed : une nouvelle publication annuelle
est détectée pour chacun des 48 tickers, mais elle ne remplace les données
existantes que si CA/PNB et résultat net sont extraits avec deux colonnes N/N-1
et si la colonne N-1 recoupe les données déjà validées. Cette concordance sert
à déterminer automatiquement l'ordre des colonnes et l'unité (FCFA, milliers,
millions ou milliards).

Les PDF texte passent par pdftotext. Les scans passent par pdftoppm puis
Tesseract. Un document ambigu reste visible dans documents.json et dans le
statut, sans écraser un chiffre fiable.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import tempfile
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

USER_AGENT = "WARIBA-fundamentals-auto/1.0 (publication officielle BRVM)"
ANNUAL_TERMS = (
    "rapport annuel",
    "rapport dactivites annuel",
    "rapport d activites annuel",
    "rapport de gestion",
    "etats financiers",
    "comptes annuels",
    "resultats annuels",
)
PERIODIC_TERMS = ("trimestre", "semestr", "mensuel")
UNITS = (1, 1_000, 1_000_000, 1_000_000_000)
MAX_OCR_PAGES = 12


def normalized(text: str) -> str:
    text = "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )
    return re.sub(r"\s+", " ", text.lower().replace("’", "'")).strip()


def document_year(title: str) -> int | None:
    years = [int(value) for value in re.findall(r"20\d{2}", title)]
    return max(years) if years else None


def is_annual_document(document: dict) -> bool:
    title = normalized(str(document.get("title", "")))
    return (
        any(term in title for term in ANNUAL_TERMS)
        and not any(term in title for term in PERIODIC_TERMS)
        and document_year(title) is not None
    )


def latest_annual_documents(documents: list[dict]) -> dict[str, dict]:
    latest: dict[str, dict] = {}
    for document in documents:
        if not is_annual_document(document):
            continue
        ticker = document.get("ticker")
        if not ticker:
            continue
        candidate_key = (document_year(document["title"]) or 0, document.get("date", ""))
        current = latest.get(ticker)
        current_key = (
            document_year(current["title"]) or 0,
            current.get("date", ""),
        ) if current else (-1, "")
        if candidate_key > current_key:
            latest[ticker] = document
    return latest


def pending_documents(
    fundamentals: dict[str, dict], documents: list[dict]
) -> dict[str, dict]:
    latest = latest_annual_documents(documents)
    pending: dict[str, dict] = {}
    for ticker, record in fundamentals.items():
        document = latest.get(ticker)
        if not document or document.get("url") == record.get("source"):
            continue
        year = document_year(document["title"])
        if year is not None and year > record["fiscalYear"]:
            pending[ticker] = document
    return pending


NUMBER_RE = re.compile(
    r"(?<!\d)([-−]?\s*(?:\d{1,3}(?:[ .\u00a0]\d{3}){1,5}|\d+(?:[,.]\d+)?))(?!\d)"
)


def parse_number(raw: str) -> float | None:
    value = raw.replace("−", "-").replace("\u00a0", " ").strip()
    sign = -1 if value.startswith("-") else 1
    value = value.lstrip("- ")
    if " " in value or (value.count(".") > 1):
        value = value.replace(" ", "").replace(".", "")
    else:
        value = value.replace(" ", "").replace(",", ".")
    try:
        return sign * float(value)
    except ValueError:
        return None


LABELS = {
    "revenue": ("chiffre d'affaires", "chiffre daffaires"),
    "pnb": ("produit net bancaire", "pnb"),
    "net_income": ("resultat net",),
    "ordinary_income": ("resultat des activites ordinaires",),
    "equity": ("capitaux propres", "fonds propres"),
    "cir": ("coefficient d'exploitation", "cost income ratio"),
    "deposits": (
        "depots de la clientele",
        "depots clientele",
        "ressources clientele",
    ),
    "loans": (
        "credits a la clientele",
        "credits clientele",
        "creances sur la clientele",
    ),
    "cost_of_risk": ("cout du risque",),
}


def extract_pairs(text: str, aliases: tuple[str, ...]) -> list[tuple[float, float]]:
    pairs: list[tuple[float, float]] = []
    lines = text.splitlines()
    for index, raw_line in enumerate(lines):
        line = normalized(raw_line)
        alias = next((item for item in aliases if item in line), None)
        if alias is None:
            continue
        # PSM 3 garde normalement la ligne du tableau. PSM 11 peut isoler
        # le libellé : deux lignes suivantes sont alors incluses.
        window = " ".join(lines[index : index + 3])
        normalized_window = normalized(window)
        start = normalized_window.find(alias) + len(alias)
        values = [parse_number(match) for match in NUMBER_RE.findall(normalized_window[start:])]
        values = [value for value in values if value is not None]
        if len(values) >= 2:
            pair = (values[0], values[1])
            if pair not in pairs:
                pairs.append(pair)

        # Un scan perd souvent les séparateurs de cellules :
        # "180 544 660 176 158 313 246 307" devient une suite continue
        # de groupes de trois chiffres. On énumère les deux premières
        # cellules possibles; le recoupement N-1 choisit ensuite l'unique
        # segmentation et l'unité compatibles avec les données validées.
        tokens = re.findall(r"[-−]?\s*\d+(?:,\d+)?", normalized_window[start:])
        for first_size in range(1, min(5, len(tokens) - 1) + 1):
            first = parse_number("".join(tokens[:first_size]))
            if first is None:
                continue
            remaining = tokens[first_size:]
            for second_size in range(1, min(5, len(remaining)) + 1):
                second = parse_number("".join(remaining[:second_size]))
                if second is None:
                    continue
                pair = (first, second)
                if pair not in pairs:
                    pairs.append(pair)
    return pairs


def to_millions(value: float, unit: int) -> int:
    return round(value * unit / 1_000_000)


def relative_error(value: float, reference: float) -> float:
    return abs(value - reference) / max(abs(reference), 1)


def choose_core_values(
    text: str, previous: dict
) -> tuple[dict[str, int | None], int, bool, float] | None:
    revenue_key = "pnb" if previous.get("revenueLabel") == "PNB" else "revenue"
    revenue_pairs = extract_pairs(text, LABELS[revenue_key])
    income_pairs = extract_pairs(text, LABELS["net_income"])
    if not revenue_pairs or not income_pairs:
        return None

    choices: list[tuple[float, int, bool, tuple[float, float], tuple[float, float]]] = []
    for unit in UNITS:
        for reverse in (False, True):
            for revenue_pair in revenue_pairs:
                for income_pair in income_pairs:
                    revenue_current, revenue_prev = (
                        (revenue_pair[1], revenue_pair[0]) if reverse else revenue_pair
                    )
                    income_current, income_prev = (
                        (income_pair[1], income_pair[0]) if reverse else income_pair
                    )
                    revenue_error = relative_error(
                        to_millions(revenue_prev, unit), previous["revenueM"]
                    )
                    income_error = relative_error(
                        to_millions(income_prev, unit), previous["netIncomeM"]
                    )
                    score = (revenue_error + income_error) / 2
                    if max(revenue_error, income_error) <= 0.08:
                        choices.append(
                            (score, unit, reverse, revenue_pair, income_pair)
                        )
    if not choices:
        return None
    score, unit, reverse, revenue_pair, income_pair = min(choices, key=lambda item: item[0])

    def oriented(pair: tuple[float, float]) -> tuple[int, int]:
        current, prior = (pair[1], pair[0]) if reverse else pair
        return to_millions(current, unit), to_millions(prior, unit)

    revenue_current, revenue_prev = oriented(revenue_pair)
    income_current, income_prev = oriented(income_pair)
    if revenue_current <= 0 or not math.isfinite(revenue_current):
        return None

    values: dict[str, float | int | None] = {
        "revenueM": revenue_current,
        "revenuePrevM": revenue_prev,
        "netIncomeM": income_current,
        "netIncomePrevM": income_prev,
        "ordinaryIncomeM": None,
        "ordinaryIncomePrevM": None,
        "equityM": None,
        "equityPrevM": previous.get("equityM"),
        "cirPct": None,
        "cirPrevPct": None,
        "depositsM": None,
        "depositsPrevM": None,
        "loansM": None,
        "loansPrevM": None,
        "costOfRiskM": None,
        "costOfRiskPrevM": None,
    }

    ordinary_pairs = extract_pairs(text, LABELS["ordinary_income"])
    if ordinary_pairs:
        previous_ordinary = previous.get("ordinaryIncomeM")
        ordinary_valid = True
        if previous_ordinary is not None:
            ranked_ordinary = []
            for pair in ordinary_pairs:
                current, prior = oriented(pair)
                ranked_ordinary.append(
                    (relative_error(prior, previous_ordinary), current, prior)
                )
            ordinary_error, ordinary_current, ordinary_prev = min(ranked_ordinary)
            if ordinary_error > 0.08:
                ordinary_valid = False
        else:
            ordinary_current, ordinary_prev = oriented(ordinary_pairs[0])
        if ordinary_valid and abs(ordinary_current) <= revenue_current * 2:
            values["ordinaryIncomeM"] = ordinary_current
            values["ordinaryIncomePrevM"] = ordinary_prev

    equity_pairs = extract_pairs(text, LABELS["equity"])
    previous_equity = previous.get("equityM")
    if equity_pairs and previous_equity:
        ranked = []
        for pair in equity_pairs:
            current, prior = oriented(pair)
            ranked.append((relative_error(prior, previous_equity), current, prior))
        equity_error, equity_current, equity_prev = min(ranked)
        if equity_error <= 0.08 and equity_current != 0:
            values["equityM"] = equity_current
            values["equityPrevM"] = equity_prev

    for label, current_key, previous_key in (
        ("deposits", "depositsM", "depositsPrevM"),
        ("loans", "loansM", "loansPrevM"),
        ("cost_of_risk", "costOfRiskM", "costOfRiskPrevM"),
    ):
        previous_value = previous.get(current_key)
        pairs = extract_pairs(text, LABELS[label])
        if previous_value is None or not pairs:
            continue
        ranked = []
        for pair in pairs:
            current, prior = oriented(pair)
            ranked.append((relative_error(prior, previous_value), current, prior))
        error, current, prior = min(ranked)
        if error <= 0.08:
            values[current_key] = current
            values[previous_key] = prior

    previous_cir = previous.get("cirPct")
    cir_pairs = extract_pairs(text, LABELS["cir"])
    if previous_cir is not None and cir_pairs:
        ranked_cir = []
        for pair in cir_pairs:
            current, prior = (pair[1], pair[0]) if reverse else pair
            ranked_cir.append((relative_error(prior, previous_cir), current, prior))
        cir_error, cir_current, cir_prev = min(ranked_cir)
        if cir_error <= 0.08:
            values["cirPct"] = cir_current
            values["cirPrevPct"] = cir_prev

    return values, unit, reverse, score


def source_year(text: str, fallback: int) -> int:
    head = normalized(text[:8_000])
    match = re.search(r"(?:exercice|annee)\s+(20\d{2})", head)
    return int(match.group(1)) if match else fallback


def run(command: list[str]) -> str:
    try:
        completed = subprocess.run(
            command,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as error:
        raise RuntimeError(f"outil requis absent: {command[0]}") from error
    except subprocess.CalledProcessError as error:
        raise RuntimeError(error.stderr.strip() or "commande PDF/OCR en échec") from error
    return completed.stdout


def extract_pdf_text(pdf_path: Path, workdir: Path) -> str:
    text_path = workdir / "document.txt"
    run(["pdftotext", "-layout", str(pdf_path), str(text_path)])
    text = text_path.read_text(encoding="utf-8", errors="replace")
    core_labels = normalized(text)
    if len(text.strip()) >= 300 and (
        "resultat net" in core_labels
        and ("chiffre d'affaires" in core_labels or "produit net bancaire" in core_labels)
    ):
        return text

    prefix = workdir / "page"
    run(
        [
            "pdftoppm",
            "-f",
            "1",
            "-l",
            str(MAX_OCR_PAGES),
            "-r",
            "300",
            "-png",
            str(pdf_path),
            str(prefix),
        ]
    )
    pages = sorted(workdir.glob("page-*.png"))
    if not pages:
        raise RuntimeError("rendu PDF vide")
    return "\n".join(
        run(["tesseract", str(page), "stdout", "-l", "fra+eng", "--psm", "3"])
        for page in pages
    )


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        destination.write_bytes(response.read())


def build_record(
    ticker: str, previous: dict, document: dict, text: str
) -> tuple[dict, dict] | None:
    title_year = document_year(document["title"])
    if title_year is None:
        return None
    fiscal_year = source_year(text, title_year)
    if fiscal_year <= previous["fiscalYear"]:
        return None
    chosen = choose_core_values(text, previous)
    if chosen is None:
        return None
    values, unit, reverse, score = chosen
    record = {
        "ticker": ticker,
        "fiscalYear": fiscal_year,
        "revenueLabel": previous["revenueLabel"],
        **values,
        "proposedGrossDividend": None,
        "sharesOutstanding": None,
        "source": document["url"],
        "publishedOn": document["date"],
    }
    audit = {
        "unit": unit,
        "columnsReversed": reverse,
        "previousYearMatchErrorPct": round(score * 100, 3),
    }
    return record, audit


def build_status(
    fundamentals: dict[str, dict], documents: list[dict], results: dict[str, dict]
) -> dict:
    latest = latest_annual_documents(documents)
    tickers = {}
    for ticker, record in sorted(fundamentals.items()):
        document = latest.get(ticker)
        year = document_year(document["title"]) if document else None
        pending = bool(
            document
            and document.get("url") != record.get("source")
            and year is not None
            and year > record["fiscalYear"]
        )
        result = results.get(ticker, {})
        default_detail = "Publication annuelle intégrée ou aucun exercice plus récent détecté."
        if (
            document
            and document.get("url") == record.get("source")
            and year is not None
            and year != record["fiscalYear"]
        ):
            default_detail = (
                f"Source intégrée; exercice {record['fiscalYear']} validé dans le contenu "
                f"malgré le millésime {year} du titre BRVM."
            )
        tickers[ticker] = {
            "fiscalYear": record["fiscalYear"],
            "latestAnnualYear": year,
            "status": "review_required" if pending else "current",
            "detail": result.get("detail", default_detail),
            "source": record["source"],
        }
    pending_count = sum(item["status"] != "current" for item in tickers.values())
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "coverage": len(tickers),
        "current": len(tickers) - pending_count,
        "reviewRequired": pending_count,
        "tickers": tickers,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--documents", default="data/real/documents.json")
    parser.add_argument("--fundamentals", default="data/real/fundamentals.json")
    parser.add_argument("--overrides", default="data/real/fundamentals-auto.json")
    parser.add_argument("--status", default="data/real/fundamentals-status.json")
    parser.add_argument("--pending-count", action="store_true")
    args = parser.parse_args()

    documents = json.loads(Path(args.documents).read_text(encoding="utf-8"))
    fundamentals = json.loads(Path(args.fundamentals).read_text(encoding="utf-8"))
    pending = pending_documents(fundamentals, documents)
    if args.pending_count:
        print(len(pending))
        return

    overrides_path = Path(args.overrides)
    overrides = (
        json.loads(overrides_path.read_text(encoding="utf-8"))
        if overrides_path.exists()
        else {}
    )
    results: dict[str, dict] = {}
    for ticker, document in sorted(pending.items()):
        try:
            with tempfile.TemporaryDirectory(prefix=f"wariba-{ticker.lower()}-") as tmp:
                workdir = Path(tmp)
                pdf_path = workdir / "source.pdf"
                download(document["url"], pdf_path)
                text = extract_pdf_text(pdf_path, workdir)
                built = build_record(ticker, fundamentals[ticker], document, text)
            if built is None:
                results[ticker] = {
                    "detail": "Publication détectée, mais extraction ou recoupement N-1 insuffisant; anciens chiffres préservés."
                }
                print(f"{ticker}: publication ambiguë — données précédentes conservées")
                continue
            record, audit = built
            fundamentals[ticker] = record
            overrides[ticker] = record
            results[ticker] = {
                "detail": (
                    f"Exercice {record['fiscalYear']} intégré automatiquement; "
                    f"recoupement N-1 {audit['previousYearMatchErrorPct']:.3f} %."
                )
            }
            print(
                f"{ticker}: exercice {record['fiscalYear']} · "
                f"{record['revenueLabel']} {record['revenueM']:,} M · "
                f"RN {record['netIncomeM']:,} M"
            )
        except Exception as error:
            results[ticker] = {"detail": f"Extraction automatique en échec: {error}"}
            print(f"{ticker}: erreur {type(error).__name__}: {error}")

    Path(args.fundamentals).write_text(
        json.dumps(fundamentals, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    overrides_path.write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    status = build_status(fundamentals, documents, results)
    Path(args.status).write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Fondamentaux: {status['current']}/{status['coverage']} à jour; "
        f"{status['reviewRequired']} à revoir."
    )


if __name__ == "__main__":
    main()
