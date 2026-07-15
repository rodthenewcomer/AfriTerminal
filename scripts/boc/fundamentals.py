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
revue à la main. Les cas auparavant écartés pour extraction ambiguë
(SNTS/FTSC/SCRC/TTLS) ont été repris visuellement en 2026-07-11 ; les
valeurs ci-dessous proviennent des cellules rendues, jamais du texte
aplati quand les colonnes y étaient fusionnées.

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

USER_AGENT = "WARIBA-fundamentals/1.0 (usage interne, projet non commercial)"
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
        "raw": {"equity": 137_936_908_394, "equity_prev": 122_370_184_084},
    },
    "PALC": {
        "pdf": f"{BASE}/20260323_-_etats_financiers_-_exercice_2025_-_palm_ci.pdf",
        "publishedOn": "2026-03-23",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1_000,
        "raw": {"equity": 142_638_984, "equity_prev": 135_061_151},
    },
    "CIEC": {
        "pdf": f"{BASE}/20260520_-_etats_financiers_syscohada_et_ifrs_-_exercice_2025_-_cie_ci.pdf",
        "publishedOn": "2026-05-20",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "sharesOutstanding": 56_000_000,
        "unit": 1_000_000,
        "raw": {"equity": 43_024, "equity_prev": 40_037},
    },
    "ONTBF": {
        "pdf": f"{BASE}/20260611_-_etats_financiers_approuves_-_exercice_2025_-_onatel_bf.pdf",
        "publishedOn": "2026-06-11",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": 57_541_603_762, "equity_prev": 62_561_325_597},
    },
    "SIVC": {
        "pdf": f"{BASE}/20260626_-_etats_financiers_-_exercice_2025_-_erium_ci.pdf",
        "publishedOn": "2026-06-26",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": 2_526_541_669, "equity_prev": 3_272_424_840},
    },
    "ORAC": {
        # Version approuvée par l'AGO, en milliards de FCFA. Le nombre
        # d'actions est exact : dividende global 120 524 280 000 / 800 F
        # = 150 655 350 ; il recoupe le BPA groupe (129,1 Md / 857,2 F)
        # et le PER BOC (écarts de 0,04 % et 0,003 %). Identité : P/B
        # 3,51 = PER 14,81 × ROE 23,71 %.
        "pdf": f"{BASE}/20260608_-_etats_financiers_approuves_-_exercice_2025_-_orange_ci.pdf",
        "publishedOn": "2026-06-08",
        "fiscalYear": 2025,
        "extractor": "manual",
        "sharesOutstanding": 150_655_350,
        "unit": 1_000_000_000,
        "raw": {
            "revenue": 1_197.1,
            "revenue_prev": 1_084.1,
            "net_income": 167.8,
            "net_income_prev": 158.2,
            "equity": 707.8,
            "equity_prev": 713.8,
        },
    },
    "BNBC": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_bernabe_ci.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": 17_769_953_951, "equity_prev": 17_747_635_829},
    },
    "CABC": {
        "pdf": f"{BASE}/20260311_-_etats_financiers_ifrs_-_exercice_2025_-_sicable_ci.pdf",
        "publishedOn": "2026-03-11",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1_000,
        "raw": {"equity": 9_345_551, "equity_prev": 8_677_962},
    },
    "CFAC": {
        # Dernier exercice publié : 2024 (pas encore d'états 2025 en ligne).
        "pdf": f"{BASE}/20250516_-_etats_financiers_-_exercice_2024_-_cfao_motors_ci.pdf",
        "publishedOn": "2025-05-16",
        "fiscalYear": 2024,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": 19_452_985_667, "equity_prev": 17_979_153_259},
    },
    "LNBB": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_lnb_bn.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": 21_953_860_132, "equity_prev": 23_614_741_046},
    },
    "SHEC": {
        "pdf": f"{BASE}/20260603_-_etats_financiers_-_exercice_2025_-_vivo_energy.pdf",
        "publishedOn": "2026-06-03",
        "fiscalYear": 2025,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": 27_158_717_963, "equity_prev": 26_520_592_002},
    },
    "UNLC": {
        # Derniers états publiés : exercice 2023 (société en restructuration).
        "pdf": f"{BASE}/20240904_-_etats_financiers_-_exercice_2023_-_unilever_ci.pdf",
        "publishedOn": "2024-09-04",
        "fiscalYear": 2023,
        "extractor": "syscohada",
        "unit": 1,
        "raw": {"equity": -10_658_856_096, "equity_prev": -11_299_190_951},
    },
    "NSBC": {
        "pdf": f"{BASE}/20260513_-_etats_financiers_et_communique_-_exercice_2025_-_nsia_banque_ci.pdf",
        "publishedOn": "2026-05-13",
        "fiscalYear": 2025,
        "extractor": "bank",
        "unit": 1_000_000_000,
        # Le bilan publie les capitaux propres en millions alors que
        # l'extracteur bancaire normalise les autres agrégats en milliards.
        # Bilan 2024/2025 et commentaire de gestion concordants : ressources
        # clientèle 2 242 / 1 701 Md (+32 %) ; créances clientèle au bilan.
        "raw": {
            "deposits": 2_242.218,
            "deposits_prev": 1_700.893,
            "loans": 1_818.671,
            "loans_prev": 1_536.122,
            "equity": 233.303,
            "equity_prev": 211.371,
        },
    },
    "ETIT": {
        "pdf": f"{BASE}/20260413_-_etats_financiers_ifrs_-_exercice_2025_-_eti_tg.pdf",
        "publishedOn": "2026-04-13",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Comptes CONSOLIDÉS IFRS du groupe (colonne FCFA millions du
        # document bilingue $EU/FCFA). RN = résultat net consolidé
        # (345,5 Md ; part du groupe 236,8 Md après minoritaires
        # 104,5 Md — pas de champ dédié, précisé ici). Cohérences
        # vérifiées : CIR calculé 688 426/1 424 261 = 48,3 % = annoncé ;
        # PER BOC 3,35 = 64 F × ~18,09 Md titres / RN consolidé, exact.
        # PAS de sharesOutstanding : le BPA officiel (10 F) est calculé
        # sur la part du groupe et un nombre moyen pondéré (~24 Md) qui
        # ne recoupe pas les ~18,1 Md du référentiel BRVM — les deux
        # sources ne convergent pas, on n'inscrit rien.
        "raw": {
            "pnb": 1_424_261,
            "pnb_prev": 1_266_559,
            "net_income": 345_523,
            "net_income_prev": 299_708,
            "cir": 48.3,
            "cir_prev": 52.8,
            "cost_of_risk": 270_217,
            "cost_of_risk_prev": 195_720,
            # « Dépôts de la clientèle » / « Crédits à la clientèle »
            # (tableau chiffres clés, colonne FCFA millions).
            "deposits": 14_120_139,
            "deposits_prev": 12_895_459,
            "loans": 6_570_385,
            "loans_prev": 6_255_123,
            # Total capitaux propres consolidés (part du groupe :
            # 1 077 652 ; minoritaires : 478 853).
            "equity": 1_597_846,
            "equity_prev": 1_133_230,
        },
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
        # Capital 21 601 840 000 ÷ 1 000 F nominal = 21 601 840, confirmé
        # par le PER BOC (implicite 21,61 M, <0,1 % d'écart).
        "sharesOutstanding": 21_601_840,
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
            # Bilan (milliers) : Capital + Primes et réserves + Résultat —
            # les trois seules lignes de capitaux propres de ce bilan.
            "equity": 21_601_840 + 34_335_898 + 12_492_623,
            "equity_prev": 21_601_840 + 34_186_212 + 13_110_790,
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
            "equity": 42_913,
            "equity_prev": 35_294,
        },
    },
    "NTLC": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_nestle_ci.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1,
        # Capital 5 517 600 000 ÷ 250 F nominal = 22 070 400, confirmé
        # par le PER BOC (implicite 22,06 M).
        "sharesOutstanding": 22_070_400,
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
            # Bilan : capital + prime de fusion + écart de rééval. +
            # réserves indisponibles + report à nouveau + résultat.
            "equity": 5_517_600_000 + 1_043_156_491 + 3_434_584_742
            + 1_103_520_000 + 62_346_453 + 18_426_899_479,
            "equity_prev": 5_517_600_000 + 1_043_156_491 + 3_434_584_742
            + 1_103_520_000 + 10_107_366 + 18_149_967_087,
        },
    },
    "TTLC": {
        "pdf": f"{BASE}/20260601_-_etats_financiers_approuves_-_exercice_2025_-_totalenergies_marketing_ci.pdf",
        "publishedOn": "2026-06-01",
        "fiscalYear": 2025,
        "extractor": "manual",
        # Capital 3 148 080 000 ÷ 50 F = 62 961 600, confirmé PER BOC (62,97 M).
        "sharesOutstanding": 62_961_600,
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
            # Ligne totale explicite du bilan « Capitaux propres » ;
            # composantes recoupées (23 082 + 9 087 + 4 033 = 36 202).
            # Identité vérifiée : P/B 4,96 = PER BOC 19,75 × ROE 25,1 %.
            "equity": 36_202,
            "equity_prev": 41_115,
        },
    },
    "SDCC": {
        "pdf": f"{BASE}/20260427_-_etats_financiers_-_exercice_2025_-_sodeci.pdf",
        "publishedOn": "2026-04-27",
        "fiscalYear": 2025,
        "extractor": "manual",
        # 4,725 Md distribués ÷ 525 F/action = 9 000 000 exactement (communiqué).
        "sharesOutstanding": 9_000_000,
        "unit": 1,
        # Source = communiqué de presse (page 1 du PDF), pas un tableau —
        # chiffres donnés en toutes lettres ("189,4 milliards", "4,663
        # milliards"). Pas de RN/CA de l'exercice précédent en valeur
        # absolue (seulement des %), donc laissés absents plutôt
        # qu'estimés. RAO non extrait : le communiqué ne donne que le
        # "Résultat d'exploitation" (pré-financier), différent du RAO
        # SYSCOHADA (post-financier) — pas le même agrégat.
        # Dividende recoupé : 4,725 Md / 525 FCFA = 9 000 000 actions
        # (nombre rond, cohérent).
        "raw": {
            "revenue": 189_400_000_000,
            "net_income": 4_663_000_000,
            "proposed_gross_dividend": 525,
            # Bilan SYSCOHADA individuel (en milliers, converti ici en FCFA
            # pleins = unité de l'entrée) : capital 4 500 000 + primes/
            # réserves 7 418 903 + résultat 4 662 738 + autres capitaux
            # propres 3 134 154. Le RN du bilan (4 662 738 k) recoupe le
            # communiqué (4,663 Md) — même référentiel. Le capital confirme
            # aussi le nombre d'actions : 4,5 Md ÷ 9 000 000 = 500 F de
            # nominal pile. NB : le PER publié au BOC semble calculé sur le
            # référentiel IFRS consolidé, pas sur ces comptes individuels.
            "equity": (4_500_000 + 7_418_903 + 4_662_738 + 3_134_154) * 1_000,
            "equity_prev": (4_500_000 + 7_458_414 + 3_560_488 + 3_072_525) * 1_000,
        },
    },
    "ABJC": {
        "pdf": f"{BASE}/20260427_-_etats_financiers_ifrs_-_exercice_2025_-_servair_abidjan_ci.pdf",
        "publishedOn": "2026-04-27",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000_000,
        # Nombre d'actions ÉCRIT dans le PDF (10 912 000) et confirmé par
        # le BPA publié (1 331 M / 10 912 000 = 122 F, exact).
        "sharesOutstanding": 10_912_000,
        # Meilleur recoupement de tout le batch : le PDF donne le nombre
        # d'actions (10 912 000) ET le résultat net par action (122 FCFA)
        # en plus du résultat net total — 1 331 M / 10 912 000 = 122,0
        # FCFA, exact. RAO non extrait : présentation IFRS, pas
        # d'équivalent direct au RAO SYSCOHADA (le proche candidat,
        # "Résultat avant impôt", mélange des notions différentes).
        "raw": {
            "revenue": 13_298,
            "revenue_prev": 12_467,
            "net_income": 1_331,
            "net_income_prev": 1_515,
            # "Total capitaux propres" du bilan IFRS, en millions.
            "equity": 5_512,
            "equity_prev": 4_182,
        },
    },
    "SVOC": {
        "pdf": f"{BASE}/20201022_-_etats_financiers_-_exercice_2019_-_movis_ci.pdf",
        "publishedOn": "2020-10-22",
        "fiscalYear": 2019,
        "extractor": "manual",
        "unit": 1_000_000,
        # Dernier exercice publié : 2019 (cf. UNLC, même situation) — le
        # cours réel de MOVIS CI sur le site est lui-même figé au
        # 2019-05-10, la valeur semble inactive depuis. Pas de PER BOC
        # pour recouper (résultat négatif) : confiance basée sur la
        # cohérence interne du document (le résultat net apparaît
        # deux fois, bilan et compte de résultat, valeurs identiques).
        "raw": {
            "revenue": 12_079,
            "revenue_prev": 14_289,
            "net_income": -4_496,
            "net_income_prev": 170,
            "ordinary_income": -4_524,
            "ordinary_income_prev": -776,
            "equity": -3_327,
            "equity_prev": -2_758,
        },
    },
    "STAC": {
        "pdf": f"{BASE}/20260413_-_etats_financiers_-_exercice_2025_-_setao_ci.pdf",
        "publishedOn": "2026-04-13",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000,
        # PDF scanné (aucune couche texte) : valeurs relevées par OCR
        # (tesseract 5, 400 dpi, --psm 6) — voir scripts/boc/README.md
        # section fondamentaux pour la méthode. Confiance : le résultat
        # net (-96 558 / -348 195) apparaît IDENTIQUE sur deux tableaux
        # différents (compte de résultat ET projet d'affectation), sur
        # deux passes OCR indépendantes — recoupement réussi. Pas de PER
        # BOC pour un second recoupement (résultat négatif deux années
        # de suite). CA = "CA, autres produits et transfert de charges"
        # (pas de ligne CA isolée sur ce document).
        "raw": {
            "revenue": 3_878_254,
            "revenue_prev": 1_793_360,
            "net_income": -96_558,
            "net_income_prev": -348_195,
            "ordinary_income": -544_944,
            "ordinary_income_prev": -922_567,
            "equity": 356_746,
            "equity_prev": 453_306,
        },
    },
    # NEIC, SLBC, UNXC (2026-07-10) : relevés via ocrmac (Vision.framework
    # d'Apple, moteur radicalement différent de tesseract) plutôt que la
    # table pdfplumber ou tesseract seul. NEIC avait un encodage de police
    # corrompu au niveau texte — sans effet sur l'OCR, qui lit les pixels
    # rendus, pas les codes caractère. UNXC avait mis tesseract en échec
    # (5+ tentatives, résolutions/PSM/recadrages différents, chaque
    # lecture du résultat net différente) ; ocrmac donne la MÊME valeur
    # sur les deux occurrences du document (compte de résultat ET bilan/
    # capitaux propres), confiance 1.00 les deux fois — recoupement réussi
    # là où tesseract échouait spécifiquement.
    "NEIC": {
        "pdf": f"{BASE}/20260423_-_etats_financiers_syscohada_-_exercice_2025_-_nei_ceda_ci.pdf",
        "publishedOn": "2026-04-23",
        "fiscalYear": 2025,
        "extractor": "manual",
        # Capital 255 316 500 ÷ 20 F = 12 765 825, confirmé PER BOC (<0,01 %).
        "sharesOutstanding": 12_765_825,
        "unit": 1,
        # RN identique sur 2 occurrences (compte de résultat + bilan),
        # conf. 1.00. Recoupé indépendamment : PER officiel BOC (13,29)
        # × RN / cours ≈ 12,77 M actions, contre capital 255 316 500 FCFA
        # ÷ 20 FCFA/action = 12 765 825 — <0,01% d'écart.
        "raw": {
            "revenue": 5_139_206_354,
            "revenue_prev": 6_744_255_774,
            "net_income": 2_036_626_234,
            "net_income_prev": -759_371_358,
            "ordinary_income": 1_335_940_310,
            "ordinary_income_prev": 714_921_778,
            # « TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILEES » (inclut
            # les subventions, convention SYSCOHADA). Identité vérifiée :
            # P/B 4,7 = PER BOC 13,29 × ROE 35,4 % (année de redressement).
            "equity": 5_754_898_260,
            "equity_prev": 3_718_272_026,
        },
    },
    "SLBC": {
        "pdf": f"{BASE}/20260519_-_etats_financiers_-_exercice_2025_-_solibra_ci.pdf",
        "publishedOn": "2026-05-19",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000_000,
        # CA = "Chiffre d'affaires ET autres produits" (pas de ligne CA
        # isolée sur ce document, cf. remarque équivalente pour SOGC).
        # Colonnes 2024/2025 déduites (pas de recoupement PER — pas de
        # nombre d'actions dans le document) par correspondance avec le
        # tableau "Projet d'affectation des résultats... 2025" : le
        # bénéfice net y est redonné en FCFA pleins (45 781 024 496),
        # qui ne correspond qu'à UNE des deux colonnes du compte de
        # résultat (45 781 M) — ça fixe sans ambiguïté quelle colonne
        # est 2025.
        "raw": {
            "revenue": 378_123,
            "revenue_prev": 309_722,
            "net_income": 45_781,
            "net_income_prev": 21_472,
            "ordinary_income": 63_245,
            "ordinary_income_prev": 30_432,
            "equity": 195_142,
            "equity_prev": 169_443,
        },
    },
    "UNXC": {
        "pdf": f"{BASE}/20260713_-_etats_financiers_-_exercice_2025_-_uniwax_ci.pdf",
        "publishedOn": "2026-07-13",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1,
        # PDF texte officiel publié le 13/07/2026. RN 2025 recoupé entre
        # le compte de résultat (-624 111 469) et le bilan (-624 111 470),
        # écart d'arrondi d'1 FCFA. Les colonnes N/N-1 sont explicites.
        "raw": {
            "revenue": 29_031_727_207,
            "revenue_prev": 27_333_349_555,
            "net_income": -624_111_470,
            "net_income_prev": -2_188_937_902,
            "ordinary_income": -436_347_417,
            "ordinary_income_prev": -2_159_167_401,
            "equity": 24_619_180_792,
            "equity_prev": 15_591_475_518,
        },
    },
    # SDSC/SEMC (2026-07-10) : diagnostiqués à tort « sans pages
    # chiffrées » — les états y sont en IMAGES au milieu de pages
    # texte (rapport CAC), invisibles pour pdfplumber mais nets à
    # l'OCR (ocrmac).
    "SDSC": {
        "pdf": f"{BASE}/20250829_-_etats_financiers_et_rapport_des_cac_-_exercice_2024_-_africa_global_logistics_ci.pdf",
        "publishedOn": "2025-08-29",
        "fiscalYear": 2024,
        "extractor": "manual",
        # Capital 10 887 060 000 ÷ 200 F = 54 435 300, confirmé PER BOC (54,39 M).
        "sharesOutstanding": 54_435_300,
        "unit": 1_000,
        # « en milliers de FCFA » libellé sur le document. RN confirmé
        # sur TROIS tableaux (compte de résultat, bilan, affectation).
        # Recoupé : PER BOC (6,08) × RN / cours ≈ 54,39 M actions vs
        # capital 10 887 060 000 ÷ 200 FCFA = 54 435 300 (<0,1%).
        # RAO 2024 relevé sur un recadrage ciblé (lecture pleine page
        # tronquait un chiffre), validé par la valeur 2023 adjacente.
        "raw": {
            "revenue": 85_643_038,
            "revenue_prev": 82_623_385,
            "net_income": 21_068_974,
            "net_income_prev": 17_138_527,
            "ordinary_income": 21_811_731,
            "ordinary_income_prev": 18_614_670,
            # Ligne « Situation nette » du bilan, recoupée à 1 k près avec
            # capital + primes/réserves + résultat. Identité vérifiée :
            # P/B 1,66 = PER BOC 6,08 × ROE 27,3 %.
            "equity": 77_095_183,
            "equity_prev": 61_034_257,
        },
    },
    "SEMC": {
        "pdf": f"{BASE}/20241216_-_etats_financiers_de_synthese_-exercice_2023_-_eviosys_packaging_siem_ci.pdf",
        "publishedOn": "2024-12-16",
        "fiscalYear": 2023,
        "extractor": "manual",
        # PER BOC (implicite 25,19 M) = capital 1 889 220 000 ÷ 75 F exactement.
        "sharesOutstanding": 25_189_600,
        "unit": 1,
        # FCFA pleins (montants à 10-11 chiffres). RN 2023 identique
        # sur TROIS tableaux (compte de résultat, bilan, projet
        # d'affectation) ; RN 2022 sur deux. Dernier exercice publié :
        # 2023 (rien de plus récent sur la fiche BRVM au 2026-07-10).
        "raw": {
            "revenue": 27_874_878_137,
            "revenue_prev": 29_602_761_049,
            "net_income": 1_012_055_129,
            "net_income_prev": 3_857_786_280,
            "ordinary_income": 1_451_037_405,
            "ordinary_income_prev": 4_854_791_298,
            # Capital + primes/réserves + résultat (seules lignes de
            # capitaux propres de ce bilan). Preuve interne : réserves
            # 2023 (10 147 844 890) = réserves 2022 + RN 2022 au franc
            # près. Identité vérifiée : P/B 2,61 = PER 33,6 × ROE 7,8 %.
            "equity": 1_889_220_000 + 10_147_844_890 + 1_012_055_129,
            "equity_prev": 1_889_220_000 + 6_290_058_610 + 3_857_786_280,
        },
    },
    # Lot 2026-07-11 : reprises visuelles à partir des PDF BRVM officiels.
    # Les scans BOA ont été rasterisés à 400 dpi et relus avec Apple Vision ;
    # chaque RN a aussi été contrôlé dans le bilan ou le tableau de flux.
    "SNTS": {
        "pdf": f"{BASE}/20260216_-_etats_financiers_2025_et_attestation_des_cac_-_sonatel_sn.pdf",
        "publishedOn": "2026-02-16",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000_000,
        # Le rapport 2024 donne 393 662 / 331 748 M (2024/2023) ; le
        # rapport 2025 reprend bien 393 662 M en comparatif. Il s'agissait
        # d'une lecture de colonne erronée, pas d'un retraitement. Le rapport
        # annuel BRVM 2024 publie 100 000 000 actions moyennes ; le BPA 2025
        # et le PER BOC impliquent respectivement 99,989 M et 99,984 M.
        "sharesOutstanding": 100_000_000,
        "raw": {
            "revenue": 1_923_122,
            "revenue_prev": 1_776_443,
            "net_income": 413_588,
            "net_income_prev": 393_662,
            "equity": 1_399_263,
            "equity_prev": 1_274_638,
        },
    },
    "BICB": {
        "pdf": f"{BASE}/20260619_-_rapport_dactivites_annuel_et_etats_financiers_ifrs_-_exercice_2025_-_biic.pdf",
        "publishedOn": "2026-06-19",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Comptes IFRS, colonnes 2025 / 2024 retraité. Les chiffres clés
        # des pages 8-10 recoupent les états détaillés des pages 17-19.
        "raw": {
            "pnb": 52_805,
            "pnb_prev": 45_330,
            "net_income": 36_237,
            "net_income_prev": 29_058,
            "cir": 31.1,
            "cir_prev": 31.8,
            "cost_of_risk": 5_075,
            "cost_of_risk_prev": -198,
            "deposits": 1_181_045,
            "deposits_prev": 912_439,
            "loans": 1_151_536,
            "loans_prev": 838_691,
            "equity": 135_118,
            "equity_prev": 114_620,
        },
    },
    "BICC": {
        "pdf": f"{BASE}/20260417_-_etats_financiers_-_exercice_2025_-_bici_ci.pdf",
        "publishedOn": "2026-04-17",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Tableau unique certifié, en millions. CIR recalculé =
        # (charges générales + amortissements) / PNB.
        "raw": {
            "pnb": 79_563,
            "pnb_prev": 68_063,
            "net_income": 36_520,
            "net_income_prev": 26_226,
            "cir": 50.8,
            "cir_prev": 55.8,
            "cost_of_risk": -1_498,
            "cost_of_risk_prev": -1_309,
            "deposits": 952_872,
            "deposits_prev": 819_426,
            "loans": 524_439,
            "loans_prev": 564_928,
            "equity": 120_570,
            "equity_prev": 99_783,
        },
    },
    "BOAB": {
        "pdf": f"{BASE}/20260415_-_etats_financiers_-_exercice_2025_-_boa_bn.pdf",
        "publishedOn": "2026-04-15",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1,
        # Scan sans couche texte, montants en FCFA pleins ; RN identique
        # au compte de résultat et dans la ligne résultat du bilan.
        "raw": {
            "pnb": 51_273_938_002,
            "pnb_prev": 46_526_723_396,
            "net_income": 20_107_229_743,
            "net_income_prev": 19_647_175_711,
            "cir": 49.5,
            "cir_prev": 53.6,
            "cost_of_risk": -4_685_664_328,
            "cost_of_risk_prev": -124_264_109,
            "deposits": 711_642_473_602,
            "deposits_prev": 734_344_110_214,
            "loans": 391_724_415_648,
            "loans_prev": 408_395_955_500,
            "equity": 117_506_988_771,
            "equity_prev": 117_396_355_692,
        },
    },
    "BOABF": {
        "pdf": f"{BASE}/20260323_-_etats_financiers_-_exercice_2025_-_boa_bf.pdf",
        "publishedOn": "2026-03-23",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1,
        # Scan 400 dpi ; capitaux propres recomposés depuis capital,
        # réserves, report à nouveau et résultat, toutes lignes visibles.
        "raw": {
            "pnb": 57_819_599_384,
            "pnb_prev": 57_489_834_311,
            "net_income": 19_252_015_161,
            "net_income_prev": 22_419_223_685,
            "cir": 47.2,
            "cir_prev": 47.8,
            "cost_of_risk": -8_355_052_420,
            "cost_of_risk_prev": -4_302_883_480,
            "deposits": 877_821_961_416,
            "deposits_prev": 813_312_765_906,
            "loans": 474_063_826_349,
            "loans_prev": 587_385_207_702,
            "equity": 126_516_071_556,
            "equity_prev": 129_272_440_868,
        },
    },
    "BOAC": {
        "pdf": f"{BASE}/20260612_-_rapport_des_commissaires_aux_comptes_et_etats_financiers_annuels_-_exercice_2025_-_boa_ci.pdf",
        "publishedOn": "2026-06-12",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # États scannés pages 14-17. Le RN 2024 diffère de 1 M entre bilan
        # (32 044) et compte de résultat (32 045), simple arrondi de
        # présentation ; le compte de résultat fait foi pour ce champ.
        "raw": {
            "pnb": 73_645,
            "pnb_prev": 72_724,
            "net_income": 35_540,
            "net_income_prev": 32_045,
            "cir": 36.6,
            "cir_prev": 37.2,
            "cost_of_risk": -4_902,
            "cost_of_risk_prev": -6_791,
            "deposits": 850_548,
            "deposits_prev": 838_274,
            "loans": 430_433,
            "loans_prev": 432_068,
            "equity": 127_340,
            "equity_prev": 112_644,
        },
    },
    "BOAM": {
        "pdf": f"{BASE}/20260324_-_etats_financiers_-_exercice_2025_-_boa_ml.pdf",
        "publishedOn": "2026-03-24",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1,
        "raw": {
            "pnb": 37_996_330_474,
            "pnb_prev": 36_158_817_499,
            "net_income": 11_081_189_907,
            "net_income_prev": 9_123_471_904,
            "cir": 63.1,
            "cir_prev": 56.1,
            "cost_of_risk": -4_590_037_925,
            "cost_of_risk_prev": -7_303_550_434,
            "deposits": 502_889_695_812,
            "deposits_prev": 420_335_811_508,
            "loans": 253_647_950_745,
            "loans_prev": 276_167_685_919,
            "equity": 49_820_422_180,
            "equity_prev": 46_195_155_867,
        },
    },
    "BOAN": {
        "pdf": f"{BASE}/20260401_-_rapport_des_commissaires_aux_comptes_sur_les_etats_financiers_annuels_-_exercice_2025_-_boa_ng.pdf",
        "publishedOn": "2026-04-01",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        "raw": {
            "pnb": 21_125,
            "pnb_prev": 21_380,
            "net_income": 409,
            "net_income_prev": 5_002,
            "cir": 74.4,
            "cir_prev": 61.4,
            "cost_of_risk": -4_293,
            "cost_of_risk_prev": -2_716,
            "deposits": 183_280,
            "deposits_prev": 170_961,
            "loans": 128_447,
            "loans_prev": 162_488,
            "equity": 36_064,
            "equity_prev": 42_156,
        },
    },
    "BOAS": {
        "pdf": f"{BASE}/20260317_-_etats_financiers_-_exercice_2025_-_boa_sn.pdf",
        "publishedOn": "2026-03-17",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        "raw": {
            "pnb": 51_926,
            "pnb_prev": 49_666,
            "net_income": 21_905,
            "net_income_prev": 19_984,
            "cir": 44.0,
            "cir_prev": 45.4,
            "cost_of_risk": -4_346,
            "cost_of_risk_prev": -4_429,
            "deposits": 686_927,
            "deposits_prev": 585_770,
            "loans": 386_424,
            "loans_prev": 402_460,
            "equity": 96_526,
            "equity_prev": 88_621,
        },
    },
    "CBIBF": {
        "pdf": f"{BASE}/20260707_-_etats_financiers_-_exercice_2025_-_coris_bank_international_bf.pdf",
        "publishedOn": "2026-07-07",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Pages de synthèse 1, 2 et 46, rendues à 400 dpi. Les colonnes
        # sont explicitement exercice N-1 / exercice N.
        "raw": {
            "pnb": 138_986,
            "pnb_prev": 133_723,
            "net_income": 65_495,
            "net_income_prev": 47_937,
            "cir": 36.4,
            "cir_prev": 34.0,
            "cost_of_risk": -16_454,
            "cost_of_risk_prev": -40_514,
            "deposits": 2_015_284,
            "deposits_prev": 1_754_521,
            "loans": 1_326_977,
            "loans_prev": 1_258_929,
            "equity": 330_548,
            "equity_prev": 287_734,
        },
    },
    "ECOC": {
        "pdf": f"{BASE}/20260414_-_rapport_dactivites_et_etats_financiers_-_exercice_2025_-_ecobank_ci.pdf",
        "publishedOn": "2026-04-14",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        "raw": {
            "pnb": 132_725,
            "pnb_prev": 122_316,
            "net_income": 63_482,
            "net_income_prev": 57_477,
            "cir": 42.9,
            "cir_prev": 44.9,
            "cost_of_risk": -1_799,
            "cost_of_risk_prev": -2_935,
            "deposits": 1_626_223,
            "deposits_prev": 1_412_512,
            "loans": 1_050_803,
            "loans_prev": 972_571,
            "equity": 218_573,
            "equity_prev": 199_352,
        },
    },
    "ORGT": {
        "pdf": f"{BASE}/20260504_-_etats_financiers_-_exercice_2025_-_oragroup_tg.pdf",
        "publishedOn": "2026-05-04",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Comptes consolidés IFRS ; RN stocké = ensemble consolidé, le
        # référentiel qui recoupe le PER BOC. CIR = charges d'exploitation / PNB.
        "raw": {
            "pnb": 186_609,
            "pnb_prev": 195_436,
            "net_income": 21_643,
            "net_income_prev": -44_363,
            "cir": 80.6,
            "cir_prev": 87.6,
            "cost_of_risk": -6_971,
            "cost_of_risk_prev": -69_056,
            "deposits": 3_088_698,
            "deposits_prev": 2_933_724,
            "loans": 1_523_765,
            "loans_prev": 1_659_654,
            "equity": 113_165,
            "equity_prev": 96_720,
        },
    },
    "SGBC": {
        "pdf": f"{BASE}/20260421_-_rapport_dactivites_annuel_et_etats_financiers_-_exercice_2025_-_societe_generale_ci_annule_et_remplace_le_precedent.pdf",
        "publishedOn": "2026-04-21",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Publication auditee de quatre pages. Pas de bilan détaillé ni de
        # capitaux propres : ces champs restent absents. CIR 2024 recalculé
        # depuis frais généraux / PNB, comme le 38,8 % 2025 publié.
        "raw": {
            "pnb": 276_048,
            "pnb_prev": 263_207,
            "net_income": 101_352,
            "net_income_prev": 101_228,
            "cir": 38.8,
            "cir_prev": 37.9,
            "cost_of_risk": -46_829,
            "cost_of_risk_prev": -36_235,
            "deposits": 2_907_675,
            "deposits_prev": 2_747_507,
            "loans": 2_546_290,
            "loans_prev": 2_474_604,
        },
    },
    "SIBC": {
        "pdf": f"{BASE}/20260421_-_rapport_dactivites_annuel_et_etats_financiers_-_exercice_2025_-_sib_ci.pdf",
        "publishedOn": "2026-04-21",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        "raw": {
            "pnb": 108_663,
            "pnb_prev": 102_763,
            "net_income": 55_623,
            "net_income_prev": 50_234,
            "cir": 38.59,
            "cir_prev": 39.05,
            "cost_of_risk": -3_639,
            "cost_of_risk_prev": -5_194,
            "deposits": 1_503_441,
            "deposits_prev": 1_398_752,
            "loans": 1_226_720,
            "loans_prev": 1_101_236,
            "equity": 204_765,
            "equity_prev": 187_136,
        },
    },
    "SAFC": {
        "pdf": f"{BASE}/20260609_-_etats_financiers_-_exercice_2025_-_safca_ci_annule_et_remplace_le_precedent.pdf",
        "publishedOn": "2026-06-09",
        "fiscalYear": 2025,
        "extractor": "manual",
        "bank": True,
        "unit": 1_000_000,
        # Établissement financier : le PDF annule-et-remplace donne les
        # comptes résumés complets. CIR recalculé sur les lignes 12-13.
        "raw": {
            "pnb": 5_735,
            "pnb_prev": 3_980,
            "net_income": 701,
            "net_income_prev": -165,
            "cir": 77.6,
            "cir_prev": 93.5,
            "cost_of_risk": -377,
            "cost_of_risk_prev": -333,
            "deposits": 9_112,
            "deposits_prev": 7_821,
            "loans": 60_476,
            "loans_prev": 52_969,
            "equity": 5_916,
            "equity_prev": 5_215,
        },
    },
    "PRSC": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_-_exercice_2025_-_tractafric_motors_ci.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1,
        # Scan SYSCOHADA, pages 2-3. Dividende 2 140 160 000 / 209 F =
        # 10 240 000 actions exactement ; capital 1,28 Md / 125 F donne
        # le même nombre, et le PER BOC l'implique à moins de 0,1 %.
        "sharesOutstanding": 10_240_000,
        "raw": {
            "revenue": 81_126_957_415,
            "revenue_prev": 74_676_306_247,
            "net_income": 2_367_384_402,
            "net_income_prev": 2_346_711_607,
            "ordinary_income": 3_974_897_623,
            "ordinary_income_prev": 1_360_836_540,
            "equity": 11_530_737_895,
            "equity_prev": 11_283_033_493,
            "proposed_gross_dividend": 209,
        },
    },
    "SICC": {
        "pdf": f"{BASE}/20260612_-_rapport_dactivites_annuel_et_etats_financiers_-_exercice_2025_-_sicor_ci.pdf",
        "publishedOn": "2026-06-12",
        # Le nom du fichier BRVM dit 2025, mais le rapport et les états
        # signés indiquent tous deux un arrêté au 31/12/2024.
        "fiscalYear": 2024,
        "extractor": "manual",
        "unit": 1,
        "raw": {
            "revenue": 546_774_960,
            "revenue_prev": 701_091_581,
            "net_income": -128_639_513,
            "net_income_prev": -19_245_083,
            "ordinary_income": -128_639_513,
            "ordinary_income_prev": -19_245_083,
            "equity": 2_975_325_212,
            "equity_prev": 3_103_964_725,
        },
    },
    "STBC": {
        "pdf": f"{BASE}/20260625_-_etats_financiers_-_exercice_2025_-_sitab_ci_annule_et_remplace_le_precedent.pdf",
        "publishedOn": "2026-06-25",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1,
        # Une page certifiée. CA = ventes de marchandises + services +
        # produits accessoires. Le total distribué et 1 940 F/action ne
        # recoupent pas le nombre implicite du PER (actions propres probables),
        # donc sharesOutstanding reste volontairement absent.
        "raw": {
            "revenue": 268_020_013_096 + 54_000_000 + 463_050_000,
            "revenue_prev": 213_794_216_965 + 54_000_000 + 464_400_000,
            "net_income": 36_463_616_375,
            "net_income_prev": 44_173_762_491,
            "ordinary_income": 48_338_093_123,
            "ordinary_income_prev": 58_644_061_379,
            "equity": 45_642_447_915,
            "equity_prev": 51_824_900_452,
            "proposed_gross_dividend": 1_940,
        },
    },
    "FTSC": {
        "pdf": f"{BASE}/20260610_-_etats_financiers_-_exercice_2025_-_filtisac_ci.pdf",
        "publishedOn": "2026-06-10",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000,
        # Vérification visuelle : les colonnes 2025/2024 sont bien alignées.
        # Le RN 2024 élevé vient d'un résultat HAO de 18,863 Md ; ce n'est
        # donc pas une marge opérationnelle de 60 % ni une erreur de colonne.
        "raw": {
            "revenue": 32_108_628,
            "revenue_prev": 30_694_517,
            "net_income": 465_981,
            "net_income_prev": 18_595_275,
            "ordinary_income": 142_325,
            "ordinary_income_prev": 4_340_485,
            "equity": 15_703_201,
            "equity_prev": 43_454_156,
        },
    },
    "SCRC": {
        "pdf": f"{BASE}/20260518_-_etats_financiers_-_exercice_2025_-_sucrivoire_ci_annule_et_remplace_le_precedent.pdf",
        "publishedOn": "2026-05-18",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000,
        # Tableau IFRS à cellules fusionnées relu sur le rendu 300 dpi ; RN
        # identique au compte de résultat, au bilan et au flux de trésorerie.
        "raw": {
            "revenue": 80_568_589,
            "revenue_prev": 87_219_127,
            "net_income": -7_953_932,
            "net_income_prev": 2_473_760,
            "equity": 17_243_172,
            "equity_prev": 24_984_680,
        },
    },
    "TTLS": {
        "pdf": f"{BASE}/20260430_-_etats_financiers_ifrs_-_exercice_2025_-_totalenergies_marketing_sn.pdf",
        "publishedOn": "2026-04-30",
        "fiscalYear": 2025,
        "extractor": "manual",
        "unit": 1_000_000,
        # Comptes consolidés IFRS. RN recoupé au compte de résultat et au
        # tableau de flux ; capitaux propres recoupés au bilan et à la
        # variation des capitaux propres de la page 2.
        "raw": {
            "revenue": 455_209,
            "revenue_prev": 484_945,
            "net_income": 6_779,
            "net_income_prev": 7_140,
            "equity": 28_239,
            "equity_prev": 29_522,
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
    is_bank = meta["extractor"] == "bank" or meta.get("bank") is True
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
        # Banques : les deux agrégats bilanciels fondamentaux. ROTE et
        # CASA volontairement absents — le ROTE annoncé (fonds propres
        # tangibles) n'est pas recalculable depuis le dépôt BRVM, et le
        # CASA n'est publié que par ETI : on n'affiche que du vérifiable.
        "depositsM": to_millions(raw.get("deposits"), unit),
        "depositsPrevM": to_millions(raw.get("deposits_prev"), unit),
        "loansM": to_millions(raw.get("loans"), unit),
        "loansPrevM": to_millions(raw.get("loans_prev"), unit),
        "costOfRiskM": to_millions(raw.get("cost_of_risk"), unit),
        "costOfRiskPrevM": to_millions(raw.get("cost_of_risk_prev"), unit),
        # dividende par action : déjà en FCFA, pas de normalisation
        "proposedGrossDividend": raw.get("proposed_gross_dividend"),
        # Nombre d'actions : n'est inscrit au REGISTRY que si DEUX sources
        # indépendantes convergent (PER officiel BOC × RN / cours d'une
        # part, capital social ÷ valeur nominale d'autre part) — sinon
        # absent. Capitaux propres : lus au bilan quand la ligne est nette.
        "sharesOutstanding": meta.get("sharesOutstanding"),
        "equityM": to_millions(raw.get("equity"), unit),
        "equityPrevM": to_millions(raw.get("equity_prev"), unit),
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
            # Les valeurs relevées sur les états approuvés remplacent seulement
            # les champs explicitement déclarés ; le reste demeure extrait.
            raw.update(meta.get("raw", {}))
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
