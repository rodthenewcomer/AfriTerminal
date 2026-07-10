#!/usr/bin/env python3
"""Tests unitaires de build_app_data : fusion des fourchettes intraday
observées (data/live/, sortie de live_poll.py) dans les bougies OHLCV.

Exécution :
    cd scripts/boc && python3 -m unittest test_build_app_data -v
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from build_app_data import build_snapshot, last_valid_dividend, load_live_bounds, with_live_bounds


def row(**overrides) -> dict:
    base = {
        "time": "2026-07-08",
        "open": 29000.0,
        "high": 29500.0,
        "low": 29000.0,
        "close": 29500.0,
        "volume": 1200,
    }
    base.update(overrides)
    return base


def snapshot_row(**overrides) -> dict:
    base = {
        "time": "2026-07-08",
        "name": "TEST CI",
        "sector_code": "FIN",
        "open": 1000.0,
        "high": 1000.0,
        "low": 1000.0,
        "close": 1000.0,
        "volume": 100,
        "prev_close": 995.0,
        "day_change_pct": 0.5,
        "per": 10.0,
        "net_yield_pct": 4.0,
        "last_dividend_net": None,
        "last_dividend_date": None,
    }
    base.update(overrides)
    return base


class WithLiveBoundsTest(unittest.TestCase):
    def test_elargit_la_fourchette(self) -> None:
        out = with_live_bounds(row(), {"high": 29800.0, "low": 28700.0})
        self.assertEqual(out["high"], 29800.0)
        self.assertEqual(out["low"], 28700.0)
        # open/close : le BOC reste la vérité
        self.assertEqual(out["open"], 29000.0)
        self.assertEqual(out["close"], 29500.0)

    def test_ne_retrecit_jamais(self) -> None:
        # Une fourchette observée plus étroite que open/close (peu
        # d'échantillons en séance) ne doit pas rétrécir la bougie.
        out = with_live_bounds(row(), {"high": 29200.0, "low": 29100.0})
        self.assertEqual(out["high"], 29500.0)
        self.assertEqual(out["low"], 29000.0)

    def test_sans_donnee_live_bougie_inchangee(self) -> None:
        self.assertEqual(with_live_bounds(row(), None), row())

    def test_ne_mute_pas_la_bougie_d_origine(self) -> None:
        original = row()
        with_live_bounds(original, {"high": 30000.0, "low": 28000.0})
        self.assertEqual(original, row())


class LoadLiveBoundsTest(unittest.TestCase):
    def test_indexe_par_date_puis_ticker(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            live = Path(tmp)
            (live / "2026-07-08.json").write_text(
                json.dumps(
                    {
                        "SNTS": {"open": 29400, "high": 29800, "low": 29300,
                                 "close": 29500, "samples": 12,
                                 "first_seen": "x", "last_seen": "y"},
                    }
                ),
                encoding="utf-8",
            )
            bounds = load_live_bounds(live)
            self.assertEqual(
                bounds, {"2026-07-08": {"SNTS": {"high": 29800, "low": 29300}}}
            )

    def test_repertoire_absent(self) -> None:
        self.assertEqual(load_live_bounds(Path("/nonexistent-dir-xyz")), {})


class DividendDateGuardTest(unittest.TestCase):
    def test_ignore_les_dividendes_dates_apres_la_seance(self) -> None:
        records = [
            snapshot_row(time="2026-07-07", last_dividend_net=270.0, last_dividend_date="2099-07-05"),
            snapshot_row(time="2026-07-08", last_dividend_net=270.0, last_dividend_date="2099-07-05"),
        ]
        self.assertEqual(last_valid_dividend(records), (None, None))
        out = build_snapshot(records)
        self.assertIsNone(out["lastDividendNet"])
        self.assertIsNone(out["lastDividendDate"])

    def test_conserve_le_dernier_dividende_reel(self) -> None:
        records = [
            snapshot_row(time="2026-07-07", last_dividend_net=100.0, last_dividend_date="2026-06-30"),
            snapshot_row(time="2026-07-08", last_dividend_net=200.0, last_dividend_date="2026-07-06"),
        ]
        self.assertEqual(last_valid_dividend(records), (200.0, "2026-07-06"))


if __name__ == "__main__":
    unittest.main()


class TestDividendHistory(unittest.TestCase):
    def rec(self, time, net, date):
        return {"time": time, "last_dividend_net": net, "last_dividend_date": date}

    def test_chaque_changement_est_un_versement(self) -> None:
        from build_app_data import dividend_history
        records = [
            self.rec("2025-06-01", 1500.0, "2025-05-20"),
            self.rec("2025-06-02", 1500.0, "2025-05-20"),  # doublon ignoré
            self.rec("2026-06-01", 1740.0, "2026-05-26"),
        ]
        self.assertEqual(
            dividend_history(records),
            [
                {"date": "2025-05-20", "net": 1500.0},
                {"date": "2026-05-26", "net": 1740.0},
            ],
        )

    def test_annonce_future_ignoree_puis_retenue(self) -> None:
        from build_app_data import dividend_history
        records = [
            # bulletin du 01/06 annonce un paiement au 15/06 (futur) : ignoré
            self.rec("2025-06-01", 900.0, "2025-06-15"),
            # bulletin du 16/06 : la date est passée, versement retenu
            self.rec("2025-06-16", 900.0, "2025-06-15"),
        ]
        self.assertEqual(dividend_history(records), [{"date": "2025-06-15", "net": 900.0}])

    def test_sans_dividende(self) -> None:
        from build_app_data import dividend_history
        records = [{"time": "2025-06-01", "last_dividend_net": None, "last_dividend_date": None}]
        self.assertEqual(dividend_history(records), [])
