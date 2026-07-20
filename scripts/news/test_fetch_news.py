#!/usr/bin/env python3
"""Tests unitaires du pipeline actualités.

Exécution :
    cd scripts/news && python3 -m unittest test_fetch_news -v
"""

from __future__ import annotations

import unittest

from fetch_news import match_tickers, parse_feed, sanitize_xml

FEED = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item>
  <title>BRVM : Ecobank C&ocirc;te d'Ivoire s'envole</title>
  <link>https://exemple.com/a</link>
  <description>Le titre Ecobank CI progresse &agrave; la BRVM. L'&Eac...</description>
  <pubDate>Wed, 08 Jul 2026 07:35:00 +0000</pubDate>
</item>
<item>
  <title>Nigeria : hors sujet r&eacute;gional</title>
  <link>https://exemple.com/b</link>
  <description>Rien sur la zone.</description>
  <pubDate>Tue, 07 Jul 2026 10:00:00 +0000</pubDate>
</item>
</channel></rss>"""


class SanitizeXmlTest(unittest.TestCase):
    def test_entites_html_converties(self) -> None:
        self.assertIn("Côte", sanitize_xml("C&ocirc;te"))

    def test_entites_xml_preservees(self) -> None:
        self.assertEqual(sanitize_xml("A &amp; B &lt;c&gt;"), "A &amp; B &lt;c&gt;")

    def test_entite_tronquee_echappee(self) -> None:
        # Sika tronque ses résumés au milieu d'une entité : le & orphelin
        # doit devenir &amp; pour rester du XML valide.
        self.assertEqual(sanitize_xml("L'&Eac..."), "L'&amp;Eac...")


class MatchTickersTest(unittest.TestCase):
    def test_ecobank_ci_avant_le_groupe(self) -> None:
        self.assertEqual(match_tickers("Ecobank Côte d'Ivoire en hausse")[0], "ECOC")
        self.assertEqual(match_tickers("Le groupe Ecobank (ETI) publie"), ["ETIT"])

    def test_pas_de_faux_positif_generique(self) -> None:
        # « Orange » et « Total » seuls sont trop ambigus : jamais matchés.
        self.assertEqual(match_tickers("Orange lance une offre en France"), [])
        self.assertEqual(match_tickers("Total des émissions obligataires"), [])

    def test_sonatel(self) -> None:
        self.assertEqual(match_tickers("Sonatel annonce un dividende"), ["SNTS"])


class ParseFeedTest(unittest.TestCase):
    def test_flux_complet_sans_filtre(self) -> None:
        items = parse_feed(FEED, "Sika Finance", relevance_filter=False)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "BRVM : Ecobank Côte d'Ivoire s'envole")
        self.assertEqual(items[0]["tickers"], ["ECOC", "ETIT"])
        self.assertTrue(items[0]["publishedAt"].startswith("2026-07-08T07:35"))

    def test_filtre_de_pertinence(self) -> None:
        items = parse_feed(FEED, "Financial Afrik", relevance_filter=True)
        self.assertEqual(len(items), 1)  # l'article sans action BRVM est écarté
        self.assertIn("BRVM", items[0]["title"])


if __name__ == "__main__":
    unittest.main()
