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
import calendar
from datetime import date, timedelta
import json
from pathlib import Path
import sys

INDEX_NAMES = {
    "BRVMC": "BRVM Composite",
    "BRVM30": "BRVM 30",
    "BRVMPRES": "BRVM Prestige",
}


def pct_change(from_v: float, to_v: float) -> float:
    if not from_v:
        return 0.0
    return ((to_v - from_v) / from_v) * 100


def subtract_months(iso_date: str, months: int) -> str:
    """Soustrait des mois calendaires en bornant le jour au dernier jour du mois."""
    end = date.fromisoformat(iso_date)
    target_index = end.year * 12 + end.month - 1 - months
    year, month_index = divmod(target_index, 12)
    month = month_index + 1
    day = min(end.day, calendar.monthrange(year, month)[1])
    return date(year, month, day).isoformat()


def first_close_on_or_after(records: list[dict], cutoff: str) -> float:
    """Première clôture officielle disponible à partir de la borne calendaire."""
    return next((r["close"] for r in records if r["time"] >= cutoff), records[0]["close"])


def last_valid_dividend(records: list[dict]) -> tuple[float | None, str | None]:
    """Dernier dividende utilisable, jamais postérieur à la séance courante."""
    as_of = records[-1]["time"]
    for rec in reversed(records):
        net = rec.get("last_dividend_net")
        div_date = rec.get("last_dividend_date")
        if net is None or not div_date:
            continue
        if div_date <= as_of:
            return net, div_date
    return None, None


def dividend_history(records: list[dict]) -> list[dict]:
    """Historique réel des dividendes d'un ticker, reconstruit depuis le
    champ « dernier dividende » des bulletins : chaque changement de
    (date, montant) = un versement. Filtre les dates postérieures à la
    séance du bulletin qui les annonce (annonces anticipées : gardées
    seulement une fois la date passée sur un bulletin ultérieur) et les
    doublons. Trié chronologiquement."""
    seen: set[tuple[str, float]] = set()
    out: list[dict] = []
    for rec in records:
        net = rec.get("last_dividend_net")
        div_date = rec.get("last_dividend_date")
        if net is None or not div_date or net <= 0:
            continue
        if div_date > rec["time"]:
            continue  # annonce future vue depuis ce bulletin — pas encore payée
        key = (div_date, net)
        if key in seen:
            continue
        seen.add(key)
        out.append({"date": div_date, "net": net})
    out.sort(key=lambda d: d["date"])
    return out


def build_snapshot(records: list[dict]) -> dict:
    last = records[-1]
    n = len(records)

    year = last["time"][:4]
    first_of_year = next(
        (r for r in records if r["time"] >= f"{year}-01-01"), records[0]
    )
    avg30 = (
        sum(r["volume"] for r in records[-31:-1]) / len(records[-31:-1])
        if n > 1
        else last["volume"]
    )
    dividend_net, dividend_date = last_valid_dividend(records)

    end_date = date.fromisoformat(last["time"])
    week_cutoff = (end_date - timedelta(days=7)).isoformat()
    week52_cutoff = (end_date - timedelta(days=364)).isoformat()

    # Extrêmes réels : 52 semaines calendaires et
    # record de toute la série (2019+) — dérivés du même historique BOC
    # que le chart, aucune estimation.
    win52 = [record for record in records if record["time"] >= week52_cutoff]
    week52_high = max(r["close"] for r in win52)
    week52_low = min(r["close"] for r in win52)
    record_bar = max(records, key=lambda r: r["close"])

    return {
        "ticker": None,  # rempli par l'appelant
        "name": last["name"],
        "sectorCode": last["sector_code"] or None,
        "asOfDate": last["time"],
        "lastClose": last["close"],
        "prevClose": last["prev_close"],
        "dayChangePct": last["day_change_pct"],
        "weekChangePct": round(pct_change(first_close_on_or_after(records, week_cutoff), last["close"]), 2),
        "monthChangePct": round(pct_change(first_close_on_or_after(records, subtract_months(last["time"], 1)), last["close"]), 2),
        "quarterChangePct": round(pct_change(first_close_on_or_after(records, subtract_months(last["time"], 3)), last["close"]), 2),
        "halfYearChangePct": round(pct_change(first_close_on_or_after(records, subtract_months(last["time"], 6)), last["close"]), 2),
        "ytdChangePct": round(pct_change(first_of_year["close"], last["close"]), 2),
        "yearChangePct": round(pct_change(first_close_on_or_after(records, subtract_months(last["time"], 12)), last["close"]), 2),
        # Série plus courte que l'horizon : la fonction borne au premier point
        # connu, explicitement présenté comme historique disponible.
        "fiveYearChangePct": round(pct_change(first_close_on_or_after(records, subtract_months(last["time"], 60)), last["close"]), 2),
        "dayVolume": last["volume"],
        "avgVolume30d": round(avg30, 1),
        "volumeRatio": round(last["volume"] / avg30, 2) if avg30 else 1.0,
        "per": last["per"],
        "netYieldPct": last["net_yield_pct"],
        "lastDividendNet": dividend_net,
        "lastDividendDate": dividend_date,
        # Séance du jour : le BOC publie ouverture/clôture (high/low
        # affinés plus loin par la collecte live quand elle existe) et la
        # valeur échangée en FCFA.
        "dayOpen": last["open"],
        "dayHigh": last["high"],
        "dayLow": last["low"],
        "dayValueFcfa": last.get("value"),
        "week52High": week52_high,
        "week52Low": week52_low,
        "allTimeHigh": record_bar["close"],
        "allTimeHighDate": record_bar["time"],
        "sparkline": [r["close"] for r in records[-30:]],
    }


def load_live_bounds(live_dir: Path) -> dict[str, dict[str, dict]]:
    """Charge data/live/*.json en {date: {ticker: {"high", "low"}}}.

    Ces fichiers sont produits par live_poll.py (collecte des cours
    différés pendant la séance). Ils n'existent qu'à partir du jour où le
    collecteur a commencé à tourner (2026-07-08) — aucun rétroactif.
    """
    out: dict[str, dict[str, dict]] = {}
    if not live_dir.exists():
        return out
    for f in sorted(live_dir.glob("*.json")):
        day = json.loads(f.read_text(encoding="utf-8"))
        out[f.stem] = {
            ticker: {"high": rec["high"], "low": rec["low"]}
            for ticker, rec in day.items()
        }
    return out


def with_live_bounds(row: dict, bounds: dict | None) -> dict:
    """Élargit high/low d'une bougie avec la fourchette observée en séance.

    Le BOC reste la vérité pour open/close ; le collecteur intraday ne
    peut qu'élargir la fourchette avec des prix réellement observés
    (le BOC ne publie aucun plus haut/plus bas). Sans donnée live pour
    ce jour/ticker, la bougie reste max/min(open, close) — sans mèche.
    """
    if not bounds:
        return row
    return {
        **row,
        "high": max(row["high"], bounds["high"]),
        "low": min(row["low"], bounds["low"]),
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


class DataQualityError(Exception):
    """Donnée aberrante détectée — on préfère un build qui échoue
    bruyamment (workflow rouge, e-mail) à un site qui publie du faux."""


def clean_series(records: list[dict], ticker: str) -> tuple[list[dict], list[str]]:
    """Écarte uniquement une séance isolée dont tous les prix ont été divisés
    ou multipliés par une puissance de dix lors de l'extraction PDF.

    Une vraie opération sur titre reste au nouveau niveau les séances suivantes.
    Ici, le cours retrouve dès la séance suivante le niveau antérieur (±20 %),
    ce qui caractérise une erreur ponctuelle de séparateur décimal.
    """
    if len(records) < 3:
        return records, []

    cleaned: list[dict] = []
    rejected: list[str] = []
    for index, record in enumerate(records):
        if index == 0 or index == len(records) - 1:
            cleaned.append(record)
            continue

        previous_close = records[index - 1]["close"]
        current_close = record["close"]
        next_close = records[index + 1]["close"]
        if min(previous_close, current_close, next_close) <= 0:
            cleaned.append(record)
            continue

        current_vs_previous = current_close / previous_close
        current_vs_next = current_close / next_close
        next_vs_previous = next_close / previous_close
        isolated_scale_shift = (
            current_vs_previous < 0.02 and current_vs_next < 0.02
        ) or (
            current_vs_previous > 50 and current_vs_next > 50
        )
        returns_to_prior_level = 0.8 <= next_vs_previous <= 1.2

        if isolated_scale_shift and returns_to_prior_level:
            rejected.append(
                f"{ticker} {record['time']}: séance exclue — "
                f"cours {current_close:g} incohérent entre "
                f"{previous_close:g} et {next_close:g}"
            )
            continue
        cleaned.append(record)

    return cleaned, rejected


def validate_series(records: list[dict], ticker: str) -> list[str]:
    """Valide chaque OHLCV avant publication et remonte les sauts > 50 %."""
    errors: list[str] = []
    warnings: list[str] = []
    seen: set[str] = set()
    previous_time: str | None = None
    previous_close: float | None = None
    for index, record in enumerate(records):
        stamp = record["time"]
        prices = [record["open"], record["high"], record["low"], record["close"]]
        if stamp in seen:
            errors.append(f"{ticker} {stamp}: date dupliquée")
        seen.add(stamp)
        if previous_time is not None and stamp <= previous_time:
            errors.append(f"{ticker} {stamp}: ordre chronologique invalide")
        if any(not isinstance(value, (int, float)) or value <= 0 for value in prices):
            errors.append(f"{ticker} {stamp}: prix nul, négatif ou invalide")
        if record["high"] < max(record["open"], record["close"], record["low"]):
            errors.append(f"{ticker} {stamp}: plus haut incohérent")
        if record["low"] > min(record["open"], record["close"], record["high"]):
            errors.append(f"{ticker} {stamp}: plus bas incohérent")
        if record["volume"] < 0:
            errors.append(f"{ticker} {stamp}: volume négatif")
        if previous_close and previous_close > 0:
            change = abs((record["close"] - previous_close) / previous_close)
            if change > 0.5:
                warnings.append(
                    f"{ticker} {stamp}: variation {change * 100:.1f} % — "
                    "vérifier dividende, split, attribution, capital ou décimales"
                )
        previous_time = stamp
        previous_close = record["close"]
    if errors:
        raise DataQualityError(
            "Série refusée :\n- " + "\n- ".join(errors[:20])
        )
    return warnings


def validate_snapshots(snapshots: dict) -> None:
    """Garde-fous contre un bulletin corrompu ou un format qui a changé
    silencieusement : effectif de la cote, prix/volumes plausibles,
    variation sous le plafond BRVM, cohérence close/prev."""
    errors: list[str] = []
    if len(snapshots) < 45:
        errors.append(f"seulement {len(snapshots)} tickers (attendu ≥ 45)")
    for ticker, s in snapshots.items():
        if not (0 < s["lastClose"] < 1_000_000):
            errors.append(f"{ticker}: cours aberrant {s['lastClose']}")
        if s["dayVolume"] < 0:
            errors.append(f"{ticker}: volume négatif {s['dayVolume']}")
        # Plafond de variation BRVM ±7,5 % (marge d'arrondi bulletin).
        if abs(s["dayChangePct"]) > 8:
            errors.append(f"{ticker}: variation {s['dayChangePct']} % > plafond")
        if s["prevClose"] > 0:
            implied = (s["lastClose"] / s["prevClose"] - 1) * 100
            if abs(implied - s["dayChangePct"]) > 0.6:
                errors.append(
                    f"{ticker}: variation publiée {s['dayChangePct']} % ≠ "
                    f"calculée {implied:.2f} %"
                )
        if s["dayLow"] > s["dayHigh"]:
            errors.append(f"{ticker}: low {s['dayLow']} > high {s['dayHigh']}")
        if s["dayLow"] <= 0:
            errors.append(f"{ticker}: plus bas nul ou négatif {s['dayLow']}")
        if s["dayHigh"] < max(s["dayOpen"], s["lastClose"]):
            errors.append(f"{ticker}: plus haut inférieur à ouverture/clôture")
        if s["dayLow"] > min(s["dayOpen"], s["lastClose"]):
            errors.append(f"{ticker}: plus bas supérieur à ouverture/clôture")
    if errors:
        raise DataQualityError(
            "Qualité des données refusée :\n- " + "\n- ".join(errors[:20])
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--series-dir", default="data/boc/series")
    parser.add_argument("--out-dir", default="data")
    parser.add_argument("--live-dir", default="data/live")
    args = parser.parse_args()
    live_by_date = load_live_bounds(Path(args.live_dir))

    series_dir = Path(args.series_dir)
    out_dir = Path(args.out_dir)
    series_out = out_dir / "real" / "series"
    series_out.mkdir(parents=True, exist_ok=True)

    snapshots = {}
    dividends = {}
    missing = []
    quality_warnings: list[str] = []
    rejected_rows: list[str] = []
    tickers = sorted(f.stem for f in series_dir.glob("*.json"))
    for ticker in tickers:
        records = json.loads((series_dir / f"{ticker}.json").read_text(encoding="utf-8"))
        if not records:
            missing.append(ticker)
            continue
        records, rejected = clean_series(records, ticker)
        rejected_rows.extend(rejected)
        quality_warnings.extend(validate_series(records, ticker))

        snap = build_snapshot(records)
        snap["ticker"] = ticker
        live = live_by_date.get(records[-1]["time"], {}).get(ticker)
        if live:
            snap["dayHigh"] = max(snap["dayHigh"], live["high"])
            snap["dayLow"] = min(snap["dayLow"], live["low"])
        snapshots[ticker] = snap

        history = dividend_history(records)
        if history:
            dividends[ticker] = history

        ohlcv = [
            with_live_bounds(
                {
                    "time": r["time"],
                    "open": r["open"],
                    "high": r["high"],
                    "low": r["low"],
                    "close": r["close"],
                    "volume": r["volume"],
                },
                live_by_date.get(r["time"], {}).get(ticker),
            )
            for r in records
        ]
        (series_out / f"{ticker}.json").write_text(
            json.dumps(ohlcv, ensure_ascii=False), encoding="utf-8"
        )

    if rejected_rows:
        print(
            f"QUALITÉ DONNÉES — {len(rejected_rows)} séance(s) corrompue(s) "
            "exclue(s) des séries publiées",
            file=sys.stderr,
        )
        for rejection in rejected_rows[:20]:
            print(f"- {rejection}", file=sys.stderr)

    if quality_warnings:
        print(
            f"ALERTE INTERNE QUALITÉ — {len(quality_warnings)} variation(s) > 50 % à contrôler",
            file=sys.stderr,
        )
        for warning in quality_warnings[:20]:
            print(f"- {warning}", file=sys.stderr)

    validate_snapshots(snapshots)

    (out_dir / "real" / "snapshot.json").write_text(
        json.dumps(snapshots, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / "real" / "dividends.json").write_text(
        json.dumps(dividends, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    build_indices(series_dir.parent / "indices.json", out_dir / "real")

    print(f"{len(snapshots)}/{len(tickers)} tickers écrits dans {out_dir / 'real'}")
    if missing:
        print(f"Manquants (série vide) : {', '.join(missing)}")


if __name__ == "__main__":
    main()
