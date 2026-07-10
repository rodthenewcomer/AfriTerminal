#!/usr/bin/env python3
"""Tests des fonctions pures du pipeline opérations (réseau exclu)."""

from __future__ import annotations

import unittest

from fetch_operations import clean, main_tables, parse_fr_date


class TestParseFrDate(unittest.TestCase):
    def test_format_slash(self) -> None:
        self.assertEqual(parse_fr_date("09/07/2026"), "2026-07-09")

    def test_format_long(self) -> None:
        self.assertEqual(parse_fr_date("19 novembre 2024"), "2024-11-19")

    def test_premier_du_mois(self) -> None:
        self.assertEqual(parse_fr_date("1er février 2025"), "2025-02-01")

    def test_accents(self) -> None:
        self.assertEqual(parse_fr_date("6 août 2024"), "2024-08-06")
        self.assertEqual(parse_fr_date("24 décembre 2018"), "2018-12-24")

    def test_sans_date(self) -> None:
        self.assertIsNone(parse_fr_date("Télécharger"))


class TestMainTables(unittest.TestCase):
    def test_ecarte_le_widget_top5(self) -> None:
        html = (
            "<table><tr><th>Top 5</th><th>Cours</th><th>Variation</th></tr></table>"
            "<table><tr><th>Emetteur</th><th>Parité</th></tr>"
            "<tr><td>SIB</td><td>1 pour 1</td></tr></table>"
        )
        tables = main_tables(html)
        self.assertEqual(len(tables), 1)
        self.assertIn("Emetteur", tables[0])


class TestClean(unittest.TestCase):
    def test_balises_et_entites(self) -> None:
        self.assertEqual(clean("<a href='x'>Droit d&#039;attribution</a>"), "Droit d'attribution")


if __name__ == "__main__":
    unittest.main()
