#!/usr/bin/env python3
"""
Pipeline fondamentaux : télécharge les états financiers épinglés du
REGISTRY, extrait les indicateurs (extracteur SYSCOHADA ou bancaire),
normalise en MILLIONS de FCFA et écrit data/real/fundamentals.json.

Philosophie différente du pipeline BOC quotidien : ce pipeline est
**curé à la main, société par société** — chaque entrée du REGISTRY
épingle un PDF précis (pas « le dernier »), une unité vérifiée
manuellement (les documents mélangent FCFA pleins, milliers et
millions, rarement libellés) et un extracteur validé sur ce gabarit.
Il s'exécute à la main quand de nouveaux états sortent, pas en cron :
ajouter une société = travail de validation, pas de configuration.

Inférence d'unité semi-automatique pour les ajouts du 2026-07-08 :
unité retenue = la seule parmi {FCFA, milliers, millions, milliards}
qui rende à la fois le CA plausible (0,5-2000 Md) ET le nombre
d'actions implicite (PER officiel BOC × RN / cours) réaliste — puis
revue à la main. SNTS/TTLS/SCRC écartés : extractions contradictoires
ou cellules fusionnées ambiguës.

Vérifications d'unités (2026-07-08, exercice 2025) :
- SPHC/ONTBF/SIVC : montants à 11-12 chiffres, FCFA pleins sans ambiguïté.
- CIEC : « en millions de francs CFA » libellé dans le PDF.
- PALC : milliers, déduits (bilan incohérent en FCFA pleins) et
  triangulés par le PER officiel du BOC (8,82 publié vs 8,86 implicite
  avec RN = 15,51 Md et ~15,52 M d'actions).
- NSBC : le communiqué s'exprime en milliards (« s'établit à N
  milliards de FCFA »).

Usage :
    python3 scripts/boc/fundamentals.py --out data/real/fundamentals.json
    (--pdf-cache pour réutiliser des PDF déjà téléchargés)
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import pdfplumber

from parse_fundamentals_bank import extract as extract_bank, extract_columns
from parse_fundamentals_syscohada import extract as extract_syscohada

USER_AGENT = "AfriTerminal-fundamentals/1.0 (usage interne, projet non commercial)"
BASE = "https://www.brvm.org/sites/default/files"

# unit = valeur d'1 unité du document en FCFA ; les sorties de
# l'extracteur bancaire sont déjà en milliards (unit fixé en conséquence).
REGISTRY: dict[str, dict] = {
    "SPHC": {
        "pdf": f"{BASE}/20260318_-_etats_financiers_syscohada_-_exercice_2025_-_saph_ci.pdf",
        "publishedOn": "2026-03-18",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
    },
    "PALC": {
        "pdf": f"{BASE}/20260323_-_etats_financiers_-_exercice_2025_-_palm_ci.pdf",
        "publishedOn": "2026-03-23",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1_000,
    },
    "CIEC": {
        "pdf": f"{BASE}/20260520_-_etats_financiers_syscohada_et_ifrs_-_exercice_2025_-_cie_ci.pdf",
        "publishedOn": "2026-05-20",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1_000_000,
    },
    "ONTBF": {
        "pdf": f"{BASE}/20260611_-_etats_financiers_approuves_-_exercice_2025_-_onatel_bf.pdf",
        "publishedOn": "2026-06-11",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
    },
    "SIVC": {
        "pdf": f"{BASE}/20260626_-_etats_financiers_-_exercice_2025_-_erium_ci.pdf",
        "publishedOn": "2026-06-26",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
    },
    "ORAC": {
        # États financiers en MILLIARDS de FCFA (rare) — triangulé : PER
        # BOC × RN 167,8 Md / cours ≈ 150 M d'actions, le vrai flottant
        # d'Orange CI (~150,4 M).
        "pdf": f"{BASE}/20260217_-_etats_financiers_-_exercice_2025_-_orange_ci.pdf",
        "publishedOn": "2026-02-17",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1_000_000_000,
    },
    "BNBC": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_bernabe_ci.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
    },
    "CABC": {
        "pdf": f"{BASE}/20260311_-_etats_financiers_ifrs_-_exercice_2025_-_sicable_ci.pdf",
        "publishedOn": "2026-03-11",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1_000,
    },
    "CFAC": {
        # Dernier exercice publié : 2024 (pas encore d'états 2025 en ligne).
        "pdf": f"{BASE}/20250516_-_etats_financiers_-_exercice_2024_-_cfao_motors_ci.pdf",
        "publishedOn": "2025-05-16",
        "fiscalYear": 2024,
        "extractor": "syscohada",
        "unit": 1,
    },
    # FTSC écarté : la ligne "Résultat Net 465 981 / 18 595 275" du PDF
    # 2025 impliquerait une marge nette 2024 de ~60 % (impossible pour un
    # emballeur) — colonnes probablement désalignées dans le tableau
    # extrait. À reprendre avec une vérification visuelle du document.
    "LNBB": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_lnb_bn.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
    },
    "SHEC": {
        "pdf": f"{BASE}/20260603_-_etats_financiers_-_exercice_2025_-_vivo_energy.pdf",
        "publishedOn": "2026-06-03",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
    },
    "UNLC": {
        # Derniers états publiés : exercice 2023 (société en restructuration).
        "pdf": f"{BASE}/20240904_-_etats_financiers_-_exercice_2023_-_unilever_ci.pdf",
        "publishedOn": "2024-09-04",
        "fiscalYear": 2023,
        "extractor": "syscohada",
        "unit": 1,
    },
    "NSBC": {
        "pdf": f"{BASE}/20260513_-_etats_financiers_et_communique_-_exercice_2025_-_nsia_banque_ci.pdf",
        "publishedOn": "2026-05-13",
        "fiscalYear": 2025,
        "extractor": "bank",
        "unit": 1_000_000_000,
    },
    # Les 4 entrées ci-dessous (2026-07-09) utilisent extractor="manual" :
    # ni l'extracteur tableau ni un scan ligne-à-ligne générique n'ont
    # fonctionné sur leur gabarit (colonnes BILAN/COMPTE DE RESULTAT
    # côte à côte sur la même ligne visuelle → un scan par position de
    # mot capture parfois les mauvais nombres, voir ex. Résultat net vs
    # Bénéfice net de TTLC). Valeurs relevées à la main sur le PDF,
    # vérifiées par recoupement nombre d'actions implicite (PER officiel
    # BOC × RN / cours) contre nombre d'actions déduit du capital social
    # ÷ valeur nominale — les deux méthodes convergent à <0,1% pour les
    # 4 sociétés, cf. commentaires unitaires ci-dessous.
    "SOGC": {
        "pdf": f"{BASE}/20260422_-_etats_financiers_syscohada_-_exercice_2025_-_sogb_ci.pdf",
        "publishedOn": "2026-04-22",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000,
        # Pas de ligne "Chiffre d'affaires" isolée (présentation
        # DEBIT/CREDIT) : CA reconstruit = Ventes de marchandises +
        # Ventes de produits fabriqués + Travaux/services rendus +
        # Produits accessoires. RN recoupé avec le texte du PDF
        # ("résultat net... s'établit à 12,493 milliards, -5%") et
        # actions implicites (12,49 Md×14,51 / 8390 ≈ 21,61 M) contre
        # capital 21 601 840 000 FCFA ÷ 1 000 FCFA/action = 21 601 840.
        "raw": {
            "revenue": 41_939 + 97_539_777 + 1_035_279 + 362_037,
            "revenue_prev": 479_782 + 87_254_124 + 1_225_545 + 455_826,
            "net_income": 12_492_623,
            "net_income_prev": 13_110_790,
            "ordinary_income": 17_161_525,
            "ordinary_income_prev": 18_040_224,
        },
    },
    "SMBC": {
        "pdf": f"{BASE}/20260512_-_etats_financiers_et_projet_daffectation_du_resultat_-_exercice_2025_-_smb_ci.pdf",
        "publishedOn": "2026-05-12",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000_000,
        # Actions implicites (13,075 Md×10,14 / 17000 ≈ 7,80 M),
        # cohérent avec la taille de la société (petite capitalisation).
        "raw": {
            "revenue": 206_740,
            "revenue_prev": 229_061,
            "net_income": 13_075,
            "net_income_prev": 8_698,
            "ordinary_income": 17_975,
            "ordinary_income_prev": 12_448,
        },
    },
    "NTLC": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_nestle_ci.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1,
        # Montants en FCFA pleins dans le PDF (pas d'ambiguïté d'unité).
        # Actions implicites (18,43 Md×19,7 / 16450 ≈ 22,06 M) contre
        # capital 5 517 600 000 FCFA ÷ 250 FCFA/action = 22 070 400.
        "raw": {
            "revenue": 233_261_162_741,
            "revenue_prev": 220_113_267_165,
            "net_income": 18_426_899_479,
            "net_income_prev": 18_149_967_087,
            "ordinary_income": 29_730_140_706,
            "ordinary_income_prev": 28_968_728_930,
        },
    },
    "TTLC": {
        "pdf": f"{BASE}/20260601_-_etats_financiers_approuves_-_exercice_2025_-_totalenergies_marketing_ci.pdf",
        "publishedOn": "2026-06-01",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000_000,
        # Le PDF labellise le résultat net "Bénéfice net" (pas "Résultat
        # net"). Actions implicites (9,087 Md×19,75 / 2850 ≈ 62,97 M)
        # contre capital 3 148 080 000 FCFA ÷ 50 FCFA/action = 62 961 600.
        "raw": {
            "revenue": 588_709,
            "revenue_prev": 621_042,
            "net_income": 9_087,
            "net_income_prev": 9_374,
            "ordinary_income": 12_597,
            "ordinary_income_prev": 13_178,
        },
    },
}


def to_millions(value: float | None, unit: int) -> float | None:
    """Normalise une valeur du document en millions de FCFA (arrondi entier)."""
    if value is None:
        return None
    return round(value * unit / 1_000_000)


def normalize(ticker: str, raw: dict, meta: dict) -> dict:
    """Convertit la sortie brute d'un extracteur en enregistrement app,
    tout en millions de FCFA. Les champs absents restent absents (None) —
    absence de donnée préférée à une donnée fausse."""
    unit = meta["unit"]
    is_bank = meta["extractor"] == "bank"
    rec: dict = {
        "ticker": ticker,
        "fiscalYear": meta["fiscalYear"],
        "revenueLabel": "PNB" if is_bank else "CA",
        "revenueM": to_millions(raw.get("pnb" if is_bank else "revenue"), unit),
        "revenuePrevM": to_millions(
            raw.get("pnb_prev" if is_bank else "revenue_prev"), unit
        ),
        "netIncomeM": to_millions(raw.get("net_income"), unit),
        "netIncomePrevM": to_millions(raw.get("net_income_prev"), unit),
        "ordinaryIncomeM": to_millions(raw.get("ordinary_income"), unit),
        "ordinaryIncomePrevM": to_millions(raw.get("ordinary_income_prev"), unit),
        "cirPct": raw.get("cir"),
        "cirPrevPct": raw.get("cir_prev"),
        "costOfRiskM": to_millions(raw.get("cost_of_risk"), unit),
        "costOfRiskPrevM": to_millions(raw.get("cost_of_risk_prev"), unit),
        # dividende par action : déjà en FCFA, pas de normalisation
        "proposedGrossDividend": raw.get("proposed_gross_dividend"),
        "source": meta["pdf"],
        "publishedOn": meta["publishedOn"],
    }
    return rec


def fetch(url: str, cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    dest = cache_dir / url.rsplit("/", 1)[-1]
    if not dest.exists():
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
        time.sleep(1)  # courtoisie serveur
    return dest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/real/fundamentals.json")
    parser.add_argument("--pdf-cache", default="data/fundamentals-pdf-cache")
    args = parser.parse_args()

    out: dict[str, dict] = {}
    for ticker, meta in sorted(REGISTRY.items()):
        pdf_path = fetch(meta["pdf"], Path(args.pdf_cache))
        if meta["extractor"] == "manual":
            raw = meta["raw"]
        else:
            with pdfplumber.open(pdf_path) as pdf:
                if meta["extractor"] == "bank":
                    raw = extract_bank(extract_columns(pdf))
                else:
                    raw = extract_syscohada(pdf)
        rec = normalize(ticker, raw, meta)
        if rec["revenueM"] is None or rec["netIncomeM"] is None:
            # Extraction incomplète = document ou gabarit qui a changé :
            # on refuse d'écrire un enregistrement partiel sur les champs
            # essentiels plutôt que d'afficher du faux.
            print(f"{ticker}: extraction incomplète (CA/PNB ou RN manquant) — ignoré")
            continue
        out[ticker] = rec
        growth = (
            (rec["netIncomeM"] / rec["netIncomePrevM"] - 1) * 100
            if rec["netIncomePrevM"]
            else None
        )
        print(
            f"{ticker}: {rec['revenueLabel']} {rec['revenueM']:,} M · RN {rec['netIncomeM']:,} M"
            + (f" ({growth:+.1f}%)" if growth is not None else "")
        )

    Path(args.out).write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{len(out)}/{len(REGISTRY)} sociétés écrites dans {args.out}")


if __name__ == "__main__":
    main()
