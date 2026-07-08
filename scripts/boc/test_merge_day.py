#!/usr/bin/env python3
"""Tests unitaires de la fusion incrémentale (merge_day) et de la
conversion ligne BOC -> enregistrement de série (aggregate.stock_record).

Exécution :
    cd scripts/boc && python3 -m unittest test_merge_day -v
"""

from __future__ import annotations

import unittest

from aggregate import stock_record
from merge_day import merge_records


def raw_stock(**overrides) -> dict:
    """Ligne action minimale telle que produite par parse_boc.py."""
    base = {
        "ticker": "SNTS",
        "name": "SONATEL",
        "open": 29000.0,
        "close": 29500.0,
        "volume": 1200,
        "value": 35_400_000,
        "sector_code": "TELE",
        "prev_close": 28900.0,
        "ref_price": 29000.0,
        "day_change_pct": 2.08,
        "ytd_change_pct": 12.5,
        "last_dividend_net": 1487.0,
        "last_dividend_date": "2026-05-15",
        "net_yield_pct": 5.04,
        "per": 9.8,
    }
    base.update(overrides)
    return base


def record(time: str, **overrides) -> dict:
    return stock_record(time, raw_stock(**overrides))


class StockRecordTest(unittest.TestCase):
    def test_champs_de_base(self) -> None:
        rec = record("2026-07-06")
        self.assertEqual(rec["time"], "2026-07-06")
        self.assertEqual(rec["open"], 29000.0)
        self.assertEqual(rec["close"], 29500.0)
        self.assertEqual(rec["volume"], 1200)

    def test_high_low_encadrent_open_close(self) -> None:
        # Le BOC ne publie pas de fourchette intraday : high/low sont
        # reconstruits comme max/min(open, close).
        rec = record("2026-07-06", open=30000.0, close=29500.0)
        self.assertEqual(rec["high"], 30000.0)
        self.assertEqual(rec["low"], 29500.0)

    def test_open_absent_retombe_sur_close(self) -> None:
        # Jour sans transaction : le BOC peut ne publier aucune ouverture.
        rec = record("2026-07-06", open=None)
        self.assertEqual(rec["open"], 29500.0)
        self.assertEqual(rec["high"], 29500.0)
        self.assertEqual(rec["low"], 29500.0)


class MergeRecordsTest(unittest.TestCase):
    def test_insertion_triee_par_date(self) -> None:
        series = [record("2026-07-02"), record("2026-07-06")]
        merged = merge_records(series, [record("2026-07-03")])
        self.assertEqual(
            [r["time"] for r in merged],
            ["2026-07-02", "2026-07-03", "2026-07-06"],
        )

    def test_remplacement_sans_doublon(self) -> None:
        series = [record("2026-07-06", close=29500.0)]
        merged = merge_records(series, [record("2026-07-06", close=30000.0)])
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["close"], 30000.0)

    def test_idempotence(self) -> None:
        series = [record("2026-07-02"), record("2026-07-06")]
        incoming = [record("2026-07-06")]
        once = merge_records(series, incoming)
        twice = merge_records(once, incoming)
        self.assertEqual(once, twice)
        self.assertEqual(once, series)

    def test_serie_vide(self) -> None:
        merged = merge_records([], [record("2026-07-06")])
        self.assertEqual([r["time"] for r in merged], ["2026-07-06"])

    def test_ne_mute_pas_la_serie_d_origine(self) -> None:
        series = [record("2026-07-02")]
        snapshot = [dict(r) for r in series]
        merge_records(series, [record("2026-07-03")])
        self.assertEqual(series, snapshot)


if __name__ == "__main__":
    unittest.main()
