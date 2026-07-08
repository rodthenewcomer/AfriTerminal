#!/usr/bin/env python3
"""
Extraction des fondamentaux depuis un compte de résultat SYSCOHADA
"Système Normal" (états financiers PDF publiés sur la fiche société
BRVM, /fr/rapports-societe-cotes/[slug]).

Contrairement au format bancaire (communiqués en texte libre, un gabarit
différent par société — voir parse_fundamentals_bank.py), les libellés
du compte de résultat SYSCOHADA sont fixés par la norme comptable
elle-même et donc identiques d'une société à l'autre, quelle que soit
la mise en page du PDF (tableau structuré multi-pages chez ERIUM CI,
résumé compact une page chez Palm CI). Extraction par TABLEAU (pas texte
brut) : les nombres français groupés par espaces ("10 074 573 973")
sont ambigus une fois aplatis en texte, mais restent des cellules
distinctes dans les tables détectées par pdfplumber.

Validé sur ERIUM CI, Palm CI et CIE CI (CA + résultat net corrects,
vérifiés à la main). Le résultat des activités ordinaires de CIE CI
n'est volontairement PAS extrait : sa ligne partage un fragment de texte
avec "Report à nouveau" d'une colonne voisine (mise en page à 3 sections
côte à côte), ce qui déclenche le garde-fou anti-bilan — préférable à un
faux positif. Absence de donnée plutôt que donnée fausse.

Usage :
    python3 parse_fundamentals_syscohada.py etats_financiers.pdf
"""

from __future__ import annotations

import re
import sys
import unicodedata

import pdfplumber

LABELS = {
    "revenue": r"CHIFFRE D'AFFAIRES",
    "ordinary_income": r"RESULTAT DES ACTIVITES ORDINAIRES",
    "net_income": r"RESULTAT NET",
}


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )

DIVIDEND_RE = re.compile(
    r"dividende brut propos[ée]?\s+est\s+de\s+([\d\s,]+)\s*francs?\s*CFA",
    re.IGNORECASE,
)


def fr_number(raw: str) -> float | None:
    s = (raw or "").replace("\xa0", " ").replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


# Termes qui n'apparaissent QUE dans le bilan, jamais dans le compte de
# résultat — une ligne qui les mentionne ne peut pas être la bonne, même
# si elle matche aussi "resultat net" (ex. bilan PALC : "Résultat net
# 15 508 655 15 861 643" dans la section capitaux propres, en report à
# nouveau — mêmes valeurs que le compte de résultat par coïncidence
# comptable, mais toujours la mauvaise ligne à cibler par principe).
BILAN_ONLY_TERMS = re.compile(
    r"capitaux propres|report à nouveau|primes et réserves|capital social", re.IGNORECASE
)


NUMERIC_RE = re.compile(r"^-?[\d\s,]+$")


def _values_after(row: list[str | None], label_idx: int) -> tuple[float, float] | None:
    """
    Les 2 premières cellules numériques APRÈS le libellé — pas les 2
    dernières de toute la ligne. Certaines mises en page (CIEC) placent
    3 sections côte à côte sur une même ligne de tableau (bilan, compte
    de résultat, flux de trésorerie) : prendre "les 2 dernières cellules
    de la ligne" attrapait les valeurs de la section suivante par erreur.
    On s'arrête à la première cellule non vide et non numérique
    rencontrée après le libellé (= début d'une autre section).
    """
    nums: list[str] = []
    for cell in row[label_idx + 1 :]:
        if cell is None or cell.strip() == "":
            continue
        if NUMERIC_RE.match(cell.strip()):
            nums.append(cell)
            if len(nums) == 2:
                break
        else:
            break
    if len(nums) < 2:
        return None
    a, b = fr_number(nums[0]), fr_number(nums[1])
    if a is None or b is None:
        return None
    return a, b


def find_in_tables(tables: list[list[list[str | None]]], label_pattern: str) -> tuple[float, float] | None:
    """
    Cherche d'abord une correspondance stricte (casse/accents exacts) — le
    cas normal, validé sur ERIUM CI et Palm CI. Si rien ne matche (ex.
    CIEC utilise "Chiffre d'affaires"/"RÉSULTAT NET" au lieu de la casse
    SYSCOHADA standard), retente en ignorant casse/accents mais rejette
    toute ligne qui mentionne aussi un terme propre au bilan — ça évite
    de confondre le "Résultat net" du bilan (report à nouveau) avec celui
    du compte de résultat.
    """
    strict = re.compile(label_pattern)
    loose = re.compile(strip_accents(label_pattern), re.IGNORECASE)

    for regex, guarded in ((strict, False), (loose, True)):
        for table in tables:
            for row in table:
                row_text = " ".join(c for c in row if c)
                if guarded and BILAN_ONLY_TERMS.search(row_text):
                    continue
                for idx, cell in enumerate(row):
                    haystack = strip_accents(cell) if (cell and guarded) else cell
                    if cell and regex.search(haystack):
                        found = _values_after(row, idx)
                        if found:
                            return found
    return None


def extract(pdf: pdfplumber.PDF) -> dict:
    result: dict = {}
    all_tables = [t for page in pdf.pages for t in page.extract_tables()]

    for key, label in LABELS.items():
        found = find_in_tables(all_tables, label)
        if found:
            result[key], result[f"{key}_prev"] = found

    full_text = "\n".join((p.extract_text() or "") for p in pdf.pages)
    m = DIVIDEND_RE.search(full_text)
    if m:
        result["proposed_gross_dividend"] = fr_number(m.group(1))

    return result


def main() -> None:
    path = sys.argv[1]
    with pdfplumber.open(path) as pdf:
        result = extract(pdf)

    if not result:
        print("Aucun champ extrait.")
        sys.exit(1)

    for k, v in result.items():
        print(f"{k}: {v}")

    if result.get("net_income_prev"):
        growth = (result["net_income"] / result["net_income_prev"] - 1) * 100
        print(f"→ croissance résultat net : {growth:+.1f}%")
    if result.get("revenue_prev"):
        growth = (result["revenue"] / result["revenue_prev"] - 1) * 100
        print(f"→ croissance CA : {growth:+.1f}%")


if __name__ == "__main__":
    main()
