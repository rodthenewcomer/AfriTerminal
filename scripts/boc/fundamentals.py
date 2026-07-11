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
        },
    },
    "UNXC": {
        "pdf": f"{BASE}/20250828_-_etats_financiers_-_exercice_2024_-_uniwax_ci.pdf",
        "publishedOn": "2025-08-28",
        "fiscalYear": 2024,
        "extractor": "manual",
        "unit": 1,
        # RN identique sur 2 occurrences (compte de résultat + capitaux
        # propres du bilan), conf. 1.00 les deux fois. Pas de PER BOC
        # (résultat négatif) pour un second recoupement.
        "raw": {
            "revenue": 27_333_349_555,
            "revenue_prev": 29_686_986_976,
            "net_income": -2_188_937_902,
            "net_income_prev": -2_054_070_779,
            "ordinary_income": -2_159_167_401,
            "ordinary_income_prev": -1_855_715_900,
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
