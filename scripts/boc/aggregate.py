#!/usr/bin/env python3
"""
Agrège les JSON journaliers produits par backfill.py en une série
temporelle par ticker.

Lit tous les fichiers data/boc/raw/AAAA-MM-JJ.json, regroupe les
enregistrements par ticker, trie par date, et écrit un fichier par
ticker dans --out-dir (data/boc/series/TICKER.json par défaut).

Limite connue des données sources : le BOC ne publie pas de plus haut
ni de plus bas intrajournalier pour les actions — seulement ouverture
et clôture. Les champs "high"/"low" du JSON de sortie sont donc
max/min(open, close), pas une vraie fourchette intraday. Toute UI
utilisant ces séries doit le savoir (les bougies n'auront jamais de
mèche plus large que le corps).

Usage :
    python3 aggregate.py --raw-dir ../../data/boc/raw --out-dir ../../data/boc/series
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def stock_record(date: str, s: dict) -> dict:
    """Convertit une ligne action d'un JSON journalier en enregistrement de série.

    high/low = max/min(open, close) : le BOC ne publie pas de fourchette
    intraday (voir docstring du module). Réutilisé par merge_day.py.
    """
    open_ = s["open"] if s["open"] is not None else s["close"]
    return {
        "time": date,
        "open": open_,
        "high": max(open_, s["close"]),
        "low": min(open_, s["close"]),
        "close": s["close"],
        "volume": s["volume"],
        "value": s["value"],
        "sector_code": s["sector_code"],
        "name": s["name"],
        "prev_close": s["prev_close"],
        "ref_price": s["ref_price"],
        "day_change_pct": s["day_change_pct"],
        "ytd_change_pct": s["ytd_change_pct"],
        "last_dividend_net": s["last_dividend_net"],
        "last_dividend_date": s["last_dividend_date"],
        "net_yield_pct": s["net_yield_pct"],
        "per": s["per"],
    }


def index_record(date: str, idx: dict) -> dict:
    """Convertit une ligne indice d'un JSON journalier en enregistrement de série.

    Les bulletins d'avant ~2022 ne publient pas les indices sous la forme
    parsée (voir README) : les séries d'indices démarrent donc plus tard
    que les séries d'actions. Réutilisé par merge_day.py.
    """
    return {
        "time": date,
        "level": idx["level"],
        "day_change_pct": idx["day_change_pct"],
        "year_change_pct": idx["year_change_pct"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", default="data/boc/raw")
    parser.add_argument("--out-dir", default="data/boc/series")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    by_ticker: dict[str, list[dict]] = defaultdict(list)
    by_index: dict[str, list[dict]] = defaultdict(list)
    files = sorted(raw_dir.glob("*.json"))

    for f in files:
        day = json.loads(f.read_text(encoding="utf-8"))
        for s in day["stocks"]:
            by_ticker[s["ticker"]].append(stock_record(day["date"], s))
        for idx in day.get("indices", []):
            by_index[idx["code"]].append(index_record(day["date"], idx))

    for ticker, records in by_ticker.items():
        records.sort(key=lambda r: r["time"])
        (out_dir / f"{ticker}.json").write_text(
            json.dumps(records, ensure_ascii=False), encoding="utf-8"
        )

    for records in by_index.values():
        records.sort(key=lambda r: r["time"])
    indices_path = out_dir.parent / "indices.json"
    indices_path.write_text(
        json.dumps(dict(sorted(by_index.items())), ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"{len(files)} jours agrégés -> {len(by_ticker)} tickers dans {out_dir}")
    for code, records in sorted(by_index.items()):
        print(f"  indice {code}: {len(records)} jours, {records[0]['time']} -> {records[-1]['time']}")
    by_length = sorted(by_ticker.items(), key=lambda kv: -len(kv[1]))
    for ticker, records in by_length[:5]:
        print(f"  {ticker}: {len(records)} jours, {records[0]['time']} -> {records[-1]['time']}")
    if by_length:
        shortest = by_length[-1]
        print(f"  ... série la plus courte: {shortest[0]} ({len(shortest[1])} jours)")


if __name__ == "__main__":
    main()
