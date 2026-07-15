#!/usr/bin/env python3
"""Tests unitaires du moteur d'alertes réelles.

Exécution :
    cd scripts/boc && python3 -m unittest test_build_alerts -v
"""

from __future__ import annotations

import unittest

from build_alerts import (
    HIGH_LOW_MIN_HISTORY,
    document_alerts,
    high_low_52w_alert,
    strong_move_alert,
    volume_alert,
)


def rec(**overrides) -> dict:
    base = {
        "time": "2026-07-06",
        "close": 10000.0,
        "volume": 1000,
        "day_change_pct": 1.0,
        "last_dividend_date": None,
        "last_dividend_net": None,
    }
    base.update(overrides)
    return base


class StrongMoveTest(unittest.TestCase):
    def test_seuil_5_pct(self) -> None:
        self.assertIsNone(strong_move_alert("X", "X SA", rec(day_change_pct=4.99), 9500))
        a = strong_move_alert("X", "X SA", rec(day_change_pct=6.38), 9400)
        self.assertIsNotNone(a)
        self.assertEqual(a["severity"], "positive")
        self.assertEqual(a["basis"], "réel")

    def test_baisse_forte_en_warning(self) -> None:
        a = strong_move_alert("X", "X SA", rec(day_change_pct=-5.5), 10600)
        self.assertEqual(a["severity"], "warning")
        self.assertIn("-5,5", a["title"])

    def test_ids_restent_uniques_si_deux_alertes_prix_tombent_le_meme_jour(self) -> None:
        move = strong_move_alert("X", "X SA", rec(day_change_pct=6.38), 9400)
        closes = [100.0] * 299 + [101.0]
        high = high_low_52w_alert("X", "X SA", closes, rec(close=101.0), 299)
        self.assertNotEqual(move["id"], high["id"])


class HighLow52wTest(unittest.TestCase):
    def _closes(self, n: int, last: float) -> list[float]:
        return [100.0] * (n - 1) + [last]

    def test_plus_haut_strict(self) -> None:
        closes = self._closes(300, 101.0)
        a = high_low_52w_alert("X", "X SA", closes, rec(close=101.0), len(closes) - 1)
        self.assertIsNotNone(a)
        self.assertIn("plus haut 52 semaines", a["title"])

    def test_egalite_ne_declenche_pas(self) -> None:
        # clôture ÉGALE au plus haut : pas un nouveau plus haut
        closes = self._closes(300, 100.0)
        self.assertIsNone(
            high_low_52w_alert("X", "X SA", closes, rec(close=100.0), len(closes) - 1)
        )

    def test_historique_insuffisant(self) -> None:
        closes = self._closes(HIGH_LOW_MIN_HISTORY - 1, 200.0)
        self.assertIsNone(
            high_low_52w_alert("X", "X SA", closes, rec(close=200.0), len(closes) - 1)
        )

    def test_plus_bas_en_warning(self) -> None:
        closes = self._closes(300, 99.0)
        a = high_low_52w_alert("X", "X SA", closes, rec(close=99.0), len(closes) - 1)
        self.assertEqual(a["severity"], "warning")


class VolumeTest(unittest.TestCase):
    def test_ratio_et_plancher(self) -> None:
        volumes = [100.0] * 60
        # 3× la moyenne mais sous le plancher de 500 titres : ignoré
        self.assertIsNone(
            volume_alert("X", "X SA", volumes + [300], rec(volume=300), 60)
        )
        # 6× la moyenne et 600 titres : alerte, sévérité warning (>= 5×)
        a = volume_alert("X", "X SA", volumes + [600], rec(volume=600), 60)
        self.assertIsNotNone(a)
        self.assertEqual(a["severity"], "warning")

    def test_sous_le_ratio_min(self) -> None:
        volumes = [500.0] * 60
        self.assertIsNone(
            volume_alert("X", "X SA", volumes + [1000], rec(volume=1000), 60)
        )


class DocumentAlertTest(unittest.TestCase):
    def test_publications_du_meme_jour_restent_distinctes_et_critiques(self) -> None:
        documents = [
            {
                "ticker": "UNXC",
                "title": "États financiers exercice 2025",
                "type": "États financiers",
                "date": "2026-07-13",
                "url": "https://www.brvm.org/a.pdf",
            },
            {
                "ticker": "UNXC",
                "title": "Rapport d'activités 1er semestre 2026",
                "type": "Résultats",
                "date": "2026-07-13",
                "url": "https://www.brvm.org/b.pdf",
            },
        ]
        alerts = document_alerts(documents, "2026-07-15", {"UNXC": "Uniwax CI"})
        self.assertEqual(len(alerts), 2)
        self.assertEqual(len({item["id"] for item in alerts}), 2)
        self.assertTrue(all(item["severity"] == "critical" for item in alerts))
        self.assertEqual(alerts[0]["sourceUrl"], documents[0]["url"])

    def test_publication_ancienne_est_ignoree(self) -> None:
        alerts = document_alerts(
            [{
                "ticker": "UNXC",
                "title": "Ancien résultat",
                "type": "Résultats",
                "date": "2025-01-01",
                "url": "https://www.brvm.org/old.pdf",
            }],
            "2026-07-15",
            {},
        )
        self.assertEqual(alerts, [])

    def test_resume_verifie_uniwax_est_visible(self) -> None:
        alerts = document_alerts(
            [{
                "ticker": "UNXC",
                "title": "Rapport d'activités — 1er semestre 2026",
                "type": "Résultats",
                "date": "2026-07-13",
                "url": "https://www.brvm.org/sites/default/files/20260713_-_rapport_dactivites_-_1er_semestre_2026_-_uniwax_ci.pdf",
            }],
            "2026-07-15",
            {"UNXC": "Uniwax CI"},
        )
        self.assertIn("résultat opérationnel +771 M", alerts[0]["detail"])
        self.assertIn("cession d'actif exceptionnelle", alerts[0]["detail"])


if __name__ == "__main__":
    unittest.main()
