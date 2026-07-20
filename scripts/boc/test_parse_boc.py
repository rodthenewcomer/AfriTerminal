#!/usr/bin/env python3
"""Golden test du parseur BOC sur un bulletin réel committé en fixture.

Le bulletin du 2023-06-05 (ère « 16 colonnes », validé à la main — voir
README.md) sert de référence : si un changement du parseur altère la
moindre valeur extraite, ces assertions cassent. C'est la protection
contre les régressions silencieuses — le pipeline tourne sans
surveillance en CI et corromprait sinon les séries sans bruit.

Nota : la nomenclature secteur du BOC a changé entre 2023 et 2026
(SNTS était codé SPU, PALC était AGR) — les assertions ci-dessous
figent ce que dit CE bulletin, pas la nomenclature actuelle.

Exécution :
    cd scripts/boc && python3 -m unittest test_parse_boc -v
"""

from __future__ import annotations

import unittest
from pathlib import Path

from parse_boc import equity_integer, fr_date, parse_bulletin, to_payload

FIXTURE = Path(__file__).parent / "fixtures" / "boc_20230605_2.pdf"


class ParseBocGoldenTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.payload = to_payload(parse_bulletin(str(FIXTURE)))
        cls.by_ticker = {s["ticker"]: s for s in cls.payload["stocks"]}

    def test_date_et_volumetrie(self) -> None:
        self.assertEqual(self.payload["date"], "2023-06-05")
        self.assertEqual(len(self.payload["stocks"]), 42)

    def test_indices(self) -> None:
        indices = {i["code"]: i for i in self.payload["indices"]}
        self.assertEqual(set(indices), {"BRVMC", "BRVM30", "BRVMPRES"})
        self.assertEqual(indices["BRVMC"]["level"], 195.6)
        self.assertEqual(indices["BRVMC"]["day_change_pct"], 0.29)
        self.assertEqual(indices["BRVM30"]["level"], 98.27)
        self.assertEqual(indices["BRVMPRES"]["year_change_pct"], 0.66)

    def test_ligne_sonatel(self) -> None:
        snts = self.by_ticker["SNTS"]
        self.assertEqual(snts["name"], "SONATEL SN")
        self.assertEqual(snts["open"], 14900.0)
        self.assertEqual(snts["close"], 14995.0)
        self.assertEqual(snts["volume"], 1190)
        self.assertEqual(snts["per"], 5.38)
        self.assertEqual(snts["last_dividend_net"], 1500.0)
        self.assertEqual(snts["last_dividend_date"], "2023-05-30")

    def test_ligne_palm_ci(self) -> None:
        palc = self.by_ticker["PALC"]
        self.assertEqual(palc["open"], 9800.0)
        self.assertEqual(palc["close"], 9795.0)
        self.assertEqual(palc["volume"], 701)
        # nombre français à décimales ("1 236,34") correctement converti
        self.assertEqual(palc["last_dividend_net"], 1236.34)

    def test_ligne_ecobank_cours_sous_100(self) -> None:
        # ETIT cote sous 100 FCFA : vérifie que les petits nombres à
        # décimales ne sont pas confondus avec des milliers.
        etit = self.by_ticker["ETIT"]
        self.assertEqual(etit["close"], 18.0)
        self.assertEqual(etit["volume"], 130089)
        self.assertEqual(etit["last_dividend_net"], 0.6)

    def test_nomenclature_secteur_2023(self) -> None:
        self.assertEqual(self.by_ticker["SNTS"]["sector_code"], "SPU")
        self.assertEqual(self.by_ticker["PALC"]["sector_code"], "AGR")
        self.assertEqual(self.by_ticker["ETIT"]["sector_code"], "FIN")

    def test_annee_de_dividende_1999_ne_devient_pas_2099(self) -> None:
        self.assertEqual(fr_date("05-juil-99"), "1999-07-05")
        self.assertEqual(fr_date("30-mai-23"), "2023-05-30")

    def test_anciens_separateurs_de_milliers_ne_deviennent_pas_decimaux(self) -> None:
        self.assertEqual(equity_integer("1,900"), 1900.0)
        self.assertEqual(equity_integer("1.900"), 1900.0)
        self.assertEqual(equity_integer("503,755"), 503755.0)
        self.assertEqual(equity_integer("503.755"), 503755.0)
        self.assertEqual(equity_integer("18"), 18.0)


if __name__ == "__main__":
    unittest.main()
