# AfriTerminal

Terminal de charting et d'analyse des actions africaines — MVP BRVM.
« La BRVM devient lisible » : charts, fondamentaux, dividendes, documents
officiels et signaux intelligents.

Depuis le 2026-07-08, la **page action** (`/stocks/[ticker]`) affiche des
données réelles BRVM (chart, prix, variations, volume, PER, dividende) pour
les 15 sociétés modélisées — voir
[Pipeline de données réelles](#pipeline-de-données-réelles-brvm) plus bas.
Le reste de l'app (dashboard, marchés, screener, watchlist) tourne encore
sur des données **simulées** (`lib/mock/`), une incohérence temporaire
assumée en attendant une passe de branchement suivante.

## Prérequis

- Node.js 20+ (testé sur v20.20.2)
- npm (le repo est verrouillé via `package-lock.json`)

## Lancer

```bash
npm install
npm run dev      # http://localhost:3000 — développement, hot reload
npm run build    # build de production (SSG des 15 fiches actions)
npm run start    # sert le build de production, après npm run build
```

Aucune variable d'environnement n'est requise : toutes les données sont
mockées dans `lib/mock/`.

## Stack

- Next.js 15.5 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
- lightweight-charts v5 (TradingView) pour le chart principal
- Sparklines SVG maison · Zustand (watchlist persistée) · next-themes

## Écart connu par rapport au brief initial

Le brief demandait shadcn/ui. Les primitives dans `components/ui/`
(`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `dialog.tsx`, `tabs.tsx`,
`skeleton.tsx`) sont **écrites à la main** avec le même rendu visuel et la
même API que shadcn (props, `cn()`, Tailwind), mais ne sont pas générées par
la CLI shadcn : pas de `components.json`, pas de dépendance Radix. À faire si
besoin de l'écosystème shadcn : `npx shadcn@latest init` puis remplacer ces
fichiers par les composants générés (les imports `@/components/ui/*`
resteraient inchangés).

Aucun linter n'est configuré (`npm run lint` n'existe pas) — seul `tsc
--noEmit` (via `next build`) vérifie les types. À ajouter avec
`npx eslint --init` si le projet grandit au-delà du MVP.

## Structure

```
app/                pages (dashboard, markets, stocks/[ticker], screener,
                    documents, watchlist, alerts, ipo, settings)
components/
  charts/           MainChart (bougies, ligne, aire, OHLC, Heikin Ashi,
                    volume, SMA/EMA/Bollinger, RSI, MACD, comparaison %,
                    ajustement dividendes), toolbar, sparkline
  stocks/           table, badges, scores, analyse IA, dividendes, secteur
  documents/        cartes + visionneuse modale (résumé IA, signaux)
  layout/           shell, sidebar, bottom nav, recherche ⌘K, statut BRVM
lib/
  mock/             15 sociétés BRVM, séries OHLCV déterministes (5 ans),
                    dividendes, documents, alertes, opérations
  signals.ts        moteur de signaux (bénéfice non durable, risque crédit,
                    payout > 90 %, volume anormal, sous-évaluation…)
  indicators.ts     SMA, EMA, RSI, MACD, Bollinger, Heikin Ashi, VWAP
```

## Sociétés couvertes (15)

`SNTS` Sonatel · `ORAC` Orange CI · `NSBC` NSIA Banque CI · `SGBC` SGCI ·
`SIBC` SIB · `BICC` BICICI · `CBIBF` Coris Bank · `BOAB` BOA Burkina ·
`ETIT` Ecobank ETI · `ONTBF` Onatel BF · `PALC` Palm CI · `SPHC` SAPH ·
`UNXC` Uniwax · `CIEC` CIE · `TTLC` TotalEnergies Marketing CI

## Pipeline de données réelles (BRVM)

Un pipeline fonctionnel existe dans `scripts/boc/` (Python), **indépendant
de l'app Next.js pour l'instant** — rien n'est encore branché dans `lib/`.
Détails complets : `scripts/boc/README.md`.

- **`parse_boc.py`** — extrait un bulletin officiel de la cote (PDF
  quotidien BRVM) en JSON : ticker, nom, OHLC, volume, valeur, dividende
  net, rendement, PER. Gère deux schémas de table (16 et 15 colonnes)
  détectés automatiquement, validé sur des bulletins réels 2021→2026.
- **`backfill.py`** — boucle sur les jours ouvrés d'une période, télécharge
  et parse chaque bulletin, reprenable après interruption. En cours
  d'exécution pour 2019-01-01 → aujourd'hui au moment de la rédaction.
- **`aggregate.py`** — regroupe les JSON quotidiens en une série par
  ticker (`data/boc/series/TICKER.json`).
- **`live_poll.py`** — script prêt mais **pas encore planifié en
  exécution récurrente** (décision en attente) : interroge la page
  d'accueil brvm.org (cours différés de 15 min) pour reconstruire un
  vrai plus haut/bas intraday, que le BOC ne publie pas.
- **`build_app_data.py`** — génère `data/real/` (voir ci-dessous) à
  partir de `data/boc/series/*.json`, pour les 15 tickers modélisés.

### Branché dans l'app : `/stocks/[ticker]` uniquement

`data/real/snapshot.json` (7,5 Ko, toutes les 15 valeurs — prix,
variations, volume, PER, rendement, dernier dividende) et
`data/real/series/{TICKER}.json` (historique OHLCV complet, ~150-190 Ko
par ticker, chargé à la demande via import dynamique — jamais tous en
même temps) alimentent `lib/real-data.ts`, consommé par la page action.

**Volontairement non branché sur cette page** : capitalisation, P/B,
ROE, revenu, résultat net, payout, scores et analyse IA — tout ce qui
dépend de fondamentaux d'états financiers, qu'aucun pipeline ne
collecte. Ces sections sont masquées avec une explication, pas
remplies avec les anciens chiffres inventés.

**Mis à jour (2026-07-08)** : dashboard, marchés, screener et watchlist
sont maintenant branchés aussi (`lib/data.ts` centralise le remplacement
prix/volume/PER/dividende réel pour toute l'app via `StockSnapshot.real`).
Capitalisation/P-B/ROE/scores affichent "—" avec une infobulle plutôt que
les anciens chiffres inventés ; le screener a perdu ses filtres
fondamentaux (P/B, ROE, croissance, qualité, risque) au profit de
critères réels (PER, rendement, YTD, volume).

Documents et alertes ont aussi été audités contre les vraies données :
les affirmations vérifiables (dividendes, prix, volumes) ont été
corrigées quand elles étaient fausses (ex. ORAC : 950 FCFA inventé vs
704 FCFA réel), et chaque carte affiche désormais un badge "Données
réelles" ou "Scénario illustratif" (`ContentBasis` dans `lib/types.ts`)
— rien ne se présente plus comme vérifié sans l'être.

**Limite connue à ne pas oublier** : le BOC ne publie que l'ouverture et
la clôture par action, jamais de plus haut/bas intraday. Tant que
`live_poll.py` ne tourne pas en continu, les séries historiques agrégées
n'auront jamais de vraies mèches de bougie (high = low = max/min(open,
close)).

**Écart réel vs les 15 sociétés mockées** : l'univers réel BRVM compte
~45-50 tickers (contre 15 modélisés) — mais bonne nouvelle vérifiée
par diff systématique le 2026-07-07 : **les 15 tickers mockés sont
tous de vrais tickers BRVM** (`ETIT` = Ecobank Transnational Inc., la
holding panafricaine, existe bien séparément de `ECOC` = Ecobank Côte
d'Ivoire, sa filiale — deux sociétés cotées distinctes, pas une
erreur). Le vrai travail de réconciliation restant : les **cours
mockés sont fictifs** (ex. SNTS à 24 500 FCFA inventé vs ~29 500 FCFA
réel début juillet 2026) et les 30-35 autres tickers réels ne sont pas
encore modélisés du tout.

Pour brancher ces données plus tard : toute la donnée de l'app passe par
`lib/data.ts` (snapshots) et `lib/mock/series.ts` (`getSeries`,
`seriesForTimeframe`) — remplacer ces deux modules par une lecture de
`data/boc/series/*.json` (ou une vraie base de données alimentée par ce
pipeline) suffit, les composants ne connaissent que les types de
`lib/types.ts`.

## Avertissement

Données simulées, à but éducatif et démonstratif uniquement.
Ceci n'est pas un conseil en investissement.
