#!/usr/bin/env python3
"""
Construit les données réelles consommables par l'app Next.js à partir de
data/boc/series/*.json (sortie de aggregate.py).

Produit deux artefacts distincts, pour deux besoins différents :

1. data/real/snapshot.json — un seul fichier compact, un objet par ticker,
   avec uniquement les champs "au jour le jour" (prix, variations, volume,
   PER, dernier dividende). Assez petit pour être importé tel quel dans
   des composants client (dashboard, marchés, recherche...) sans peser sur
   le bundle JS.

2. data/real/series/{TICKER}.json — un fichier par ticker avec l'historique
   OHLCV complet (time/open/high/low/close/volume uniquement, sans les
   champs annexes). Fait pour être chargé à la demande (import dynamique)
   uniquement sur la page de l'action concernée — jamais tous en même
   temps, ~600 Ko/ticker serait trop lourd à embarquer partout.

Couvre TOUT l'univers coté trouvé dans --series-dir (48 tickers), plus :

3. data/real/indices.json — niveaux réels BRVM Composite / BRVM 30 /
   BRVM Prestige (niveau, variation jour, YTD, sparkline) depuis
   data/boc/indices.json (sortie de aggregate.py / merge_day.py).

4. data/real/index-series/{CODE}.json — historique complet {time, value}
   par indice, pour la comparaison dans le chart (import dynamique).

Usage :
    python3 build_app_data.py --series-dir ../../data/boc/series --out-dir ../../data
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

INDEX_NAMES = {
    "BRVMC": "BRVM Composite",
    "BRVM30": "BRVM 30",
    "BRVMPRES": "BRVM Prestige",
}


def pct_change(from_v: float, to_v: float) -> float:
    if not from_v:
        return 0.0
    return ((to_v - from_v) / from_v) * 100


def build_snapshot(records: list[dict]) -> dict:
    last = records[-1]
    n = len(records)

    def close_at(back: int) -> float:
        return records[max(0, n - 1 - back)]["close"]

    year = last["time"][:4]
    first_of_year = next(
        (r for r in records if r["time"] >= f"{year}-01-01"), records[0]
    )
    avg30 = (
        sum(r["volume"] for r in records[-31:-1]) / len(records[-31:-1])
        if n > 1
        else last["volume"]
    )

    return {
        "ticker": None,  # rempli par l'appelant
        "name": last["name"],
        "sectorCode": last["sector_code"] or None,
        "asOfDate": last["time"],
        "lastClose": last["close"],
        "prevClose": last["prev_close"],
        "dayChangePct": last["day_change_pct"],
        "weekChangePct": round(pct_change(close_at(5), last["close"]), 2),
        "monthChangePct": round(pct_change(close_at(21), last["close"]), 2),
        "ytdChangePct": round(pct_change(first_of_year["close"], last["close"]), 2),
        "yearChangePct": round(pct_change(close_at(252), last["close"]), 2),
        "dayVolume": last["volume"],
        "avgVolume30d": round(avg30, 1),
        "volumeRatio": round(last["volume"] / avg30, 2) if avg30 else 1.0,
        "per": last["per"],
        "netYieldPct": last["net_yield_pct"],
        "lastDividendNet": last["last_dividend_net"],
        "lastDividendDate": last["last_dividend_date"],
        "sparkline": [r["close"] for r in records[-30:]],
    }


def build_indices(indices_src: Path, real_dir: Path) -> None:
    """Écrit indices.json (snapshot compact) et index-series/ (historique)."""
    if not indices_src.exists():
        print(f"Pas de {indices_src} — indices ignorés.")
        return
    by_code = json.loads(indices_src.read_text(encoding="utf-8"))
    series_out = real_dir / "index-series"
    series_out.mkdir(parents=True, exist_ok=True)

    out = []
    for code, name in INDEX_NAMES.items():
        records = by_code.get(code, [])
        if not records:
            continue
        last = records[-1]
        year = last["time"][:4]
        first_of_year = next(
            (r for r in records if r["time"] >= f"{year}-01-01"), records[0]
        )
        out.append(
            {
                "code": code,
                "name": name,
                "asOfDate": last["time"],
                "level": last["level"],
                "dayChangePct": last["day_change_pct"],
                "ytdChangePct": round(
                    pct_change(first_of_year["level"], last["level"]), 2
                ),
                "spark": [r["level"] for r in records[-60:]],
            }
        )
        (series_out / f"{code}.json").write_text(
            json.dumps(
                [{"time": r["time"], "value": r["level"]} for r in records],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    (real_dir / "indices.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{len(out)} indices écrits dans {real_dir / 'indices.json'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--series-dir", default="data/boc/series")
    parser.add_argument("--out-dir", default="data")
    args = parser.parse_args()

    series_dir = Path(args.series_dir)
    out_dir = Path(args.out_dir)
    series_out = out_dir / "real" / "series"
    series_out.mkdir(parents=True, exist_ok=True)

    snapshots = {}
    missing = []
    tickers = sorted(f.stem for f in series_dir.glob("*.json"))
    for ticker in tickers:
        records = json.loads((series_dir / f"{ticker}.json").read_text(encoding="utf-8"))
        if not records:
            missing.append(ticker)
            continue

        snap = build_snapshot(records)
        snap["ticker"] = ticker
        snapshots[ticker] = snap

        ohlcv = [
            {
                "time": r["time"],
                "open": r["open"],
                "high": r["high"],
                "low": r["low"],
                "close": r["close"],
                "volume": r["volume"],
            }
            for r in records
        ]
        (series_out / f"{ticker}.json").write_text(
            json.dumps(ohlcv, ensure_ascii=False), encoding="utf-8"
        )

    (out_dir / "real" / "snapshot.json").write_text(
        json.dumps(snapshots, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    build_indices(series_dir.parent / "indices.json", out_dir / "real")

    print(f"{len(snapshots)}/{len(tickers)} tickers écrits dans {out_dir / 'real'}")
    if missing:
        print(f"Manquants (série vide) : {', '.join(missing)}")


if __name__ == "__main__":
    main()
