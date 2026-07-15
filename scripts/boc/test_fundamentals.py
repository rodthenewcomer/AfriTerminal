#!/usr/bin/env python3
"""Tests unitaires du pipeline fondamentaux : normalisation des unités
(FCFA pleins / milliers / millions / milliards) vers les millions de
FCFA consommés par l'app.

Exécution :
    cd scripts/boc && python3 -m unittest test_fundamentals -v
"""

from __future__ import annotations

import unittest

from fundamentals import REGISTRY, normalize, to_millions
from fetch_documents import SLUGS


class ToMillionsTest(unittest.TestCase):
    def test_fcfa_pleins(self) -> None:
        # ERIUM : 10 074 573 973 FCFA -> 10 075 M
        self.assertEqual(to_millions(10_074_573_973, 1), 10_075)

    def test_milliers(self) -> None:
        # PALC : 197 629 996 milliers -> 197 630 M
        self.assertEqual(to_millions(197_629_996, 1_000), 197_630)

    def test_millions(self) -> None:
        # CIEC : déjà en millions, inchangé
        self.assertEqual(to_millions(302_320, 1_000_000), 302_320)

    def test_milliards(self) -> None:
        # NSBC : 112,9 milliards -> 112 900 M
        self.assertEqual(to_millions(112.9, 1_000_000_000), 112_900)

    def test_absent_reste_absent(self) -> None:
        self.assertIsNone(to_millions(None, 1_000))


class NormalizeTest(unittest.TestCase):
    META_SYSCOHADA = {
        "unit": 1_000,
        "extractor": "syscohada",
        "fiscalYear": 2025,
        "pdf": "https://exemple/x.pdf",
        "publishedOn": "2026-03-23",
    }
    META_BANK = {
        "unit": 1_000_000_000,
        "extractor": "bank",
        "fiscalYear": 2025,
        "pdf": "https://exemple/b.pdf",
        "publishedOn": "2026-05-13",
    }

    def test_societe_syscohada(self) -> None:
        rec = normalize(
            "PALC",
            {
                "revenue": 197_629_996,
                "revenue_prev": 172_182_502,
                "net_income": 15_508_655,
                "net_income_prev": 15_861_643,
                "proposed_gross_dividend": 502.0,
            },
            self.META_SYSCOHADA,
        )
        self.assertEqual(rec["revenueLabel"], "CA")
        self.assertEqual(rec["revenueM"], 197_630)
        self.assertEqual(rec["netIncomeM"], 15_509)
        # dividende par action : jamais converti (déjà en FCFA)
        self.assertEqual(rec["proposedGrossDividend"], 502.0)
        # champs bancaires absents -> null, pas 0
        self.assertIsNone(rec["cirPct"])
        self.assertIsNone(rec["ordinaryIncomeM"])

    def test_banque(self) -> None:
        rec = normalize(
            "NSBC",
            {
                "pnb": 112.9,
                "pnb_prev": 97.8,
                "net_income": 40.7,
                "net_income_prev": 38.1,
                "cir": 54.6,
                "cir_prev": 59.7,
                "cost_of_risk": -8.5,
            },
            self.META_BANK,
        )
        self.assertEqual(rec["revenueLabel"], "PNB")
        self.assertEqual(rec["revenueM"], 112_900)
        self.assertEqual(rec["netIncomeM"], 40_700)
        # les ratios (%) ne subissent aucune conversion d'unité
        self.assertEqual(rec["cirPct"], 54.6)
        self.assertEqual(rec["costOfRiskM"], -8_500)
        self.assertEqual(rec["source"], "https://exemple/b.pdf")


class RegistryContractTest(unittest.TestCase):
    def test_full_brvm_universe_is_curated(self) -> None:
        self.assertEqual(len(REGISTRY), 48)
        self.assertEqual(len({meta["pdf"] for meta in REGISTRY.values()}), 48)
        self.assertTrue(
            all(meta["pdf"].startswith("https://www.brvm.org/") for meta in REGISTRY.values())
        )
        self.assertEqual(SLUGS["SGBC"], "sgci")
        self.assertEqual(REGISTRY["UNXC"]["fiscalYear"], 2025)
        self.assertEqual(REGISTRY["UNXC"]["publishedOn"], "2026-07-13")
        self.assertEqual(REGISTRY["UNXC"]["raw"]["net_income"], -624_111_470)

    def test_financial_institutions_have_bank_shape(self) -> None:
        banks = [
            ticker
            for ticker, meta in REGISTRY.items()
            if meta["extractor"] == "bank" or meta.get("bank") is True
        ]
        self.assertEqual(len(banks), 16)
        self.assertEqual(
            {
                key: REGISTRY["NSBC"]["raw"][key]
                for key in ("deposits", "deposits_prev", "loans", "loans_prev")
            },
            {
                "deposits": 2_242.218,
                "deposits_prev": 1_700.893,
                "loans": 1_818.671,
                "loans_prev": 1_536.122,
            },
        )

    def test_equity_and_share_count_confidence_thresholds(self) -> None:
        missing_equity = [
            ticker
            for ticker, meta in REGISTRY.items()
            if "equity" not in meta.get("raw", {})
        ]
        self.assertEqual(missing_equity, ["SGBC"])
        self.assertEqual(
            sum("sharesOutstanding" in meta for meta in REGISTRY.values()),
            12,
        )


if __name__ == "__main__":
    unittest.main()
