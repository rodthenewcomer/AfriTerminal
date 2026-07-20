#!/usr/bin/env python3
"""Contrats de qualité sur les artefacts réellement committés.

Ces tests relient les blocs d'accueil aux séries BOC sources : ils évitent
qu'un snapshot valide au niveau du schéma mais faux au niveau du calcul soit
publié sur le web et les apps mobiles.
"""

from __future__ import annotations

from datetime import date, timedelta
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
REAL = ROOT / "data" / "real"
SERIES = ROOT / "data" / "boc" / "series"
sys.path.insert(0, str(ROOT / "scripts" / "boc"))

from build_app_data import clean_series


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class CommittedDataQualityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.snapshot = load(REAL / "snapshot.json")
        cls.fundamentals = load(REAL / "fundamentals.json")
        cls.documents = load(REAL / "documents.json")
        cls.alerts = load(REAL / "alerts.json")
        cls.live = load(REAL / "live.json")
        cls.fundamentals_status = load(REAL / "fundamentals-status.json")

    def test_full_universe_is_covered_everywhere(self) -> None:
        tickers = set(self.snapshot)
        self.assertEqual(len(tickers), 48)
        self.assertEqual(set(self.fundamentals), tickers)
        self.assertEqual({item["ticker"] for item in self.documents}, tickers)
        self.assertEqual({path.stem for path in SERIES.glob("*.json")}, tickers)
        self.assertEqual(set(self.live["quotes"]), tickers - {"SVOC"})
        self.assertEqual(set(self.fundamentals_status["tickers"]), tickers)

    def test_every_latest_annual_publication_is_integrated_or_explicitly_blocked(self) -> None:
        status = self.fundamentals_status
        self.assertEqual(status["coverage"], 48)
        self.assertEqual(status["current"] + status["reviewRequired"], 48)
        for ticker, item in status["tickers"].items():
            with self.subTest(ticker=ticker):
                self.assertEqual(item["fiscalYear"], self.fundamentals[ticker]["fiscalYear"])
                self.assertIn(item["status"], {"current", "review_required"})
                self.assertTrue(item["detail"])

    def test_cfao_2025_annual_report_is_the_active_fundamental_source(self) -> None:
        cfao = self.fundamentals["CFAC"]
        self.assertEqual(cfao["fiscalYear"], 2025)
        self.assertEqual(cfao["revenueM"], 180_545)
        self.assertEqual(cfao["netIncomeM"], 8_416)
        self.assertEqual(cfao["ordinaryIncomeM"], 11_413)
        self.assertIsNone(cfao["equityM"])
        self.assertIn("20260713_-_rapport_annuel", cfao["source"])

    def test_snapshot_fields_match_source_series(self) -> None:
        for ticker, snapshot in self.snapshot.items():
            rows, repairs = clean_series(load(SERIES / f"{ticker}.json"), ticker)
            last = rows[-1]
            previous = rows[-2]
            prior_volumes = [row["volume"] for row in rows[-31:-1]]
            average = sum(prior_volumes) / len(prior_volumes)
            cutoff = (date.fromisoformat(last["time"]) - timedelta(days=364)).isoformat()
            window = [row for row in rows if row["time"] >= cutoff]

            with self.subTest(ticker=ticker):
                repaired_dates = {
                    item.split()[1].rstrip(":")
                    for item in repairs
                    if "non réparable" not in item
                }
                self.assertTrue(repaired_dates.issubset({row["time"] for row in rows}))
                self.assertEqual(snapshot["asOfDate"], last["time"])
                self.assertEqual(snapshot["lastClose"], last["close"])
                self.assertEqual(snapshot["prevClose"], last["prev_close"])
                self.assertEqual(snapshot["dayChangePct"], last["day_change_pct"])
                self.assertEqual(snapshot["dayVolume"], last["volume"])
                self.assertEqual(snapshot["avgVolume30d"], round(average, 1))
                self.assertEqual(
                    snapshot["volumeRatio"],
                    round(last["volume"] / average, 2) if average else 1.0,
                )
                self.assertEqual(snapshot["week52High"], max(row["close"] for row in window))
                self.assertEqual(snapshot["week52Low"], min(row["close"] for row in window))
                self.assertGreaterEqual(snapshot["dayHigh"], max(last["open"], last["close"]))
                self.assertLessEqual(snapshot["dayLow"], min(last["open"], last["close"]))
                self.assertEqual(previous["close"], last["prev_close"])

    def test_current_session_has_47_active_quotes_and_one_explicit_stale_quote(self) -> None:
        latest = max(item["asOfDate"] for item in self.snapshot.values())
        active = {
            ticker
            for ticker, item in self.snapshot.items()
            if item["asOfDate"] == latest
        }
        stale = set(self.snapshot) - active
        self.assertEqual(len(active), 47)
        self.assertEqual(stale, {"SVOC"})

    def test_every_recent_financial_document_has_an_alert(self) -> None:
        latest = date.fromisoformat(max(item["asOfDate"] for item in self.snapshot.values()))
        expected = {
            item["url"]
            for item in self.documents
            if item["type"] in {"Résultats", "États financiers"}
            and 0 <= (latest - date.fromisoformat(item["date"])).days <= 30
        }
        actual = {
            item["sourceUrl"]
            for item in self.alerts
            if item["type"] == "document"
        }
        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
