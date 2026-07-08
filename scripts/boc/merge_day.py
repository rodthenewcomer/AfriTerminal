#!/usr/bin/env python3
"""
Fusionne les JSON journaliers produits par backfill.py dans les séries
par ticker existantes (data/boc/series/TICKER.json).

Contrairement à aggregate.py, qui reconstruit toutes les séries depuis
l'intégralité de data/boc/raw/ (non committé, donc absent en CI), ce
script est incrémental et idempotent :

- une date déjà présente dans une série est remplacée, jamais dupliquée ;
- les séries existantes ne sont réécrites que si leur contenu change ;
- pensé pour la mise à jour quotidienne en CI, où seul le bulletin du
  jour vient d'être téléchargé dans --raw-dir.

Usage :
    python3 scripts/boc/merge_day.py --raw-dir data/boc/raw --series-dir data/boc/series
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

from aggregate import index_record, stock_record


def merge_records(series: list[dict], incoming: list[dict]) -> list[dict]:
    """Retourne une nouvelle liste : `incoming` inséré dans `series`,
    en remplaçant les enregistrements de même date, trié par date."""
    incoming_dates = {r["time"] for r in incoming}
    merged = [r for r in series if r["time"] not in incoming_dates]
    merged.extend(incoming)
    merged.sort(key=lambda r: r["time"])
    return merged


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", default="data/boc/raw")
    parser.add_argument("--series-dir", default="data/boc/series")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    series_dir = Path(args.series_dir)
    series_dir.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(raw_dir.glob("*.json")) if raw_dir.exists() else []
    if not raw_files:
        print("Aucun fichier brut à fusionner — rien à faire.")
        return

    by_ticker: dict[str, list[dict]] = defaultdict(list)
    by_index: dict[str, list[dict]] = defaultdict(list)
    for f in raw_files:
        day = json.loads(f.read_text(encoding="utf-8"))
        for s in day["stocks"]:
            by_ticker[s["ticker"]].append(stock_record(day["date"], s))
        for idx in day.get("indices", []):
            by_index[idx["code"]].append(index_record(day["date"], idx))

    changed = 0
    for ticker, incoming in sorted(by_ticker.items()):
        path = series_dir / f"{ticker}.json"
        series = (
            json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        )
        merged = merge_records(series, incoming)
        if merged != series:
            path.write_text(
                json.dumps(merged, ensure_ascii=False), encoding="utf-8"
            )
            changed += 1

    indices_path = series_dir.parent / "indices.json"
    indices_changed = 0
    if by_index:
        existing = (
            json.loads(indices_path.read_text(encoding="utf-8"))
            if indices_path.exists()
            else {}
        )
        merged_indices = {
            code: merge_records(existing.get(code, []), incoming)
            for code, incoming in by_index.items()
        }
        merged_indices = {**existing, **merged_indices}
        if merged_indices != existing:
            indices_path.write_text(
                json.dumps(dict(sorted(merged_indices.items())), ensure_ascii=False),
                encoding="utf-8",
            )
            indices_changed = 1

    print(
        f"{len(raw_files)} jour(s) fusionné(s) -> "
        f"{changed}/{len(by_ticker)} série(s) modifiée(s) dans {series_dir}, "
        f"indices {'mis à jour' if indices_changed else 'inchangés'}"
    )


if __name__ == "__main__":
    main()
