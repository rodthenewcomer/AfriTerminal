#!/usr/bin/env python3
"""
Pipeline actualités : agrège les flux RSS de Sika Finance (BRVM) et
Financial Afrik dans data/news/news.json, avec rattachement aux tickers.

- Sika Finance (rss/actualites_bourse_brvm) : dédié BRVM, tout est gardé.
- Financial Afrik (feed pan-africain) : filtré — gardé seulement si
  l'article mentionne l'écosystème UEMOA/BRVM ou une société cotée.
- Fusion incrémentale : dédoublonné par lien, trié du plus récent au
  plus ancien, plafonné à MAX_ITEMS. Le fichier committé est l'état.
- Rattachement ticker par motif sur le titre (prudent : motifs à faible
  risque de faux positif uniquement — pas de « Orange » seul, pas de
  « Total » seul).

Usage :
    python3 scripts/news/fetch_news.py --out data/news/news.json
"""

from __future__ import annotations

import argparse
import html
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import Request, urlopen

USER_AGENT = "WARIBA-news/1.0 (agrégateur non commercial, liens vers la source)"
MAX_ITEMS = 120
SUMMARY_LEN = 260

FEEDS = [
    {"source": "Sika Finance", "url": "https://www.sikafinance.com/rss/actualites_bourse_brvm", "filter": False},
    {"source": "Financial Afrik", "url": "https://www.financialafrik.com/feed/", "filter": True},
]

# Pertinence UEMOA/BRVM pour les flux généralistes.
RELEVANCE = re.compile(
    r"\bBRVM\b|\bUEMOA\b|\bUMOA\b|\bBCEAO\b|bourse r[ée]gionale|march[ée] financier r[ée]gional",
    re.IGNORECASE,
)

# Motifs -> ticker. Ordre important (Ecobank CI avant le groupe Ecobank).
# Prudence : uniquement des noms non ambigus (pas de « Orange » ni
# « Total » seuls, trop génériques hors contexte BRVM).
TICKER_PATTERNS: list[tuple[str, str]] = [
    (r"ecobank\s+c[ôo]te\s+d.ivoire|ecobank\s+ci\b", "ECOC"),
    (r"\becobank\b|\bETI\b", "ETIT"),
    (r"\bsonatel\b", "SNTS"),
    (r"orange\s+c[ôo]te\s+d.ivoire|orange\s+ci\b", "ORAC"),
    (r"\bonatel\b", "ONTBF"),
    (r"palm\s?ci\b|palm\s+c[ôo]te", "PALC"),
    (r"\bsaph\b", "SPHC"),
    (r"\bsogb\b", "SOGC"),
    (r"\bsolibra\b", "SLBC"),
    (r"nestl[ée]\s+c[ôo]te|nestl[ée]\s+ci\b", "NTLC"),
    (r"\bsucrivoire\b", "SCRC"),
    (r"\bsitab\b", "STBC"),
    (r"\bsicor\b", "SICC"),
    (r"\bunilever\s+c[ôo]te|\bunilever\s+ci\b", "UNLC"),
    (r"\buniwax\b", "UNXC"),
    (r"\bfiltisac\b", "FTSC"),
    (r"\bsicable\b", "CABC"),
    (r"air\s+liquide\s+ci|\berium\b", "SIVC"),
    (r"\bsetao\b", "STAC"),
    (r"crown\s+siem", "SEMC"),
    (r"nei[- ]ceda", "NEIC"),
    (r"\bbernab[ée]\b", "BNBC"),
    (r"\bcfao\b|cfao\s+mobility", "CFAC"),
    (r"\btractafric\b", "PRSC"),
    (r"\bservair\b", "ABJC"),
    (r"\bmovis\b", "SVOC"),
    (r"vivo\s+energy", "SHEC"),
    (r"totalenergies\s+(marketing\s+)?c[ôo]te|total\s+ci\b", "TTLC"),
    (r"totalenergies\s+(marketing\s+)?s[ée]n[ée]gal|total\s+s[ée]n[ée]gal", "TTLS"),
    (r"\bsmb\b|multinationale\s+de\s+bitumes", "SMBC"),
    (r"\bcie\b|compagnie\s+ivoirienne\s+d.[ée]lectricit[ée]", "CIEC"),
    (r"\bsodeci\b", "SDCC"),
    (r"soci[ée]t[ée]\s+g[ée]n[ée]rale\s+c[ôo]te|\bsgci\b|\bsg\s+ci\b", "SGBC"),
    (r"nsia\s+banque", "NSBC"),
    (r"\bbici\b", "BICC"),
    (r"\bbiic\b", "BICB"),
    (r"\bsib\b|soci[ée]t[ée]\s+ivoirienne\s+de\s+banque", "SIBC"),
    (r"coris\s+bank", "CBIBF"),
    (r"\boragroup\b", "ORGT"),
    (r"bank\s+of\s+africa|\bboa\b", "BOAC"),
    (r"bollor[ée]|africa\s+global\s+logistics|\bagl\b", "SDSC"),
    (r"loterie\s+nationale\s+du\s+b[ée]nin|\blnb\b", "LNBB"),
    (r"\bsafca\b", "SAFC"),
]
COMPILED = [(re.compile(pat, re.IGNORECASE), ticker) for pat, ticker in TICKER_PATTERNS]

TAG_RE = re.compile(r"<[^>]+>")

# Le flux Sika Finance contient des entités HTML (&eacute;...) illégales
# en XML strict : on les convertit en caractères avant parsing, en
# préservant les 5 entités XML de base.
XML_ENTITIES = {"amp", "lt", "gt", "quot", "apos"}
ENTITY_RE = re.compile(r"&([a-zA-Z]\w*);")


STRAY_AMP_RE = re.compile(r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)")


def sanitize_xml(text: str) -> str:
    converted = ENTITY_RE.sub(
        lambda m: m.group(0)
        if m.group(1) in XML_ENTITIES
        else html.unescape(m.group(0)),
        text,
    )
    # Sika tronque parfois ses résumés au milieu d'une entité ("&Eac...")
    # : tout & restant qui n'ouvre pas une entité XML valide est échappé.
    return STRAY_AMP_RE.sub("&amp;", converted)


def clean_text(raw: str | None) -> str:
    text = html.unescape(TAG_RE.sub(" ", raw or ""))
    return re.sub(r"\s+", " ", text).strip()


def parse_date(raw: str | None) -> str:
    try:
        return parsedate_to_datetime(raw or "").astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        return datetime.now(timezone.utc).isoformat()


def match_tickers(text: str) -> list[str]:
    found: list[str] = []
    for regex, ticker in COMPILED:
        if ticker not in found and regex.search(text):
            found.append(ticker)
    return found


def parse_feed(xml_text: str, source: str, relevance_filter: bool) -> list[dict]:
    items = []
    root = ET.fromstring(sanitize_xml(xml_text))
    for item in root.iter("item"):
        title = clean_text(item.findtext("title"))
        link = (item.findtext("link") or "").strip()
        if not title or not link:
            continue
        summary = clean_text(item.findtext("description"))[:SUMMARY_LEN]
        haystack = f"{title} {summary}"
        tickers = match_tickers(haystack)
        if relevance_filter and not tickers and not RELEVANCE.search(haystack):
            continue
        items.append(
            {
                "title": title,
                "link": link,
                "source": source,
                "publishedAt": parse_date(item.findtext("pubDate")),
                "summary": summary,
                "tickers": tickers,
            }
        )
    return items


def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="data/news/news.json")
    args = parser.parse_args()
    out_path = Path(args.out)

    existing: list[dict] = (
        json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else []
    )
    by_link = {item["link"]: item for item in existing}

    fetched = 0
    for feed in FEEDS:
        try:
            items = parse_feed(fetch(feed["url"]), feed["source"], feed["filter"])
        except Exception as e:  # un flux en panne ne doit pas bloquer l'autre
            print(f"{feed['source']}: erreur {type(e).__name__}: {e}")
            continue
        fetched += len(items)
        for item in items:
            by_link[item["link"]] = item  # le plus récent remplace

    merged = sorted(by_link.values(), key=lambda x: x["publishedAt"], reverse=True)[
        :MAX_ITEMS
    ]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    tagged = sum(1 for i in merged if i["tickers"])
    print(
        f"{fetched} articles lus -> {len(merged)} conservés "
        f"({tagged} rattachés à un ticker) dans {out_path}"
    )


if __name__ == "__main__":
    main()
