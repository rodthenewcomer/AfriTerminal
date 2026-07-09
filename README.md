# AfriTerminal

Terminal de charting et d'analyse des actions africaines — MVP BRVM.
« La BRVM devient lisible » : charts, fondamentaux, dividendes, documents
officiels et signaux intelligents.

Depuis le 2026-07-08, **toute l'app** tourne sur les données réelles
BRVM : les **48 sociétés cotées** (cours, variations, volumes, PER,
dividendes, historique depuis 2019) et les **3 indices officiels**
(BRVM Composite, BRVM 30, BRVM Prestige, depuis 2023) alimentent le
dashboard, les marchés, le screener, la watchlist, la recherche et les
fiches actions. Les fondamentaux (capitalisation, P/B, ROE, résultat
net…) ne sont **pas** publiés dans le bulletin quotidien : ils sont
masqués (« — »), jamais inventés — les scores/signaux/analyses IA ne
s'affichent donc pas pour l'instant. Les documents officiels sont
référencés depuis brvm.org, les alertes sont factuelles et dérivées des
dernières séances, et les IPO/opérations restent simulées à titre de
démonstration. 15 sociétés gardent une fiche curée
(`lib/mock/stocks.ts` : description, secteur vérifié) ; les 33 autres
sont dérivées du bulletin
(`lib/real-universe.ts` : secteur via code BOC, pays via suffixe du
ticker).

## Prérequis

- Node.js 20+ (testé sur v20.20.2)
- npm (le repo est verrouillé via `package-lock.json`)

## Lancer

```bash
npm install
npm run dev      # http://localhost:3000 — développement, hot reload
npm run build    # build de production (SSG des 48 fiches actions)
npm run start    # sert le build de production, après npm run build
npm run audit:prod # audit npm production high/critical
```

Aucune variable d'environnement n'est requise : l'app lit des artefacts
JSON committés dans `data/real/`, `data/news/` et `data/boc/series/`.
`lib/mock/` ne sert plus qu'aux descriptions curées, aux anciennes séries
démo de repli et aux surfaces explicitement simulées (IPO/opérations).

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
  documents/        liste des publications officielles référencées BRVM
  layout/           shell, sidebar, bottom nav, recherche ⌘K, statut BRVM
lib/
  mock/             descriptions curées + anciennes données de démo
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
les documents listent les PDF officiels référencés depuis les fiches
sociétés BRVM, et les alertes factuelles (prix, volumes, dividendes,
extrêmes 52 semaines) sont générées depuis les séries réelles. Les
surfaces qui restent simulées sont explicitement marquées comme telles
(notamment IPO/opérations) — rien ne se présente plus comme vérifié sans
l'être.

**Limite connue à ne pas oublier** : le BOC ne publie que l'ouverture et
la clôture par action, jamais de plus haut/bas intraday. `live_poll.py`
élargit désormais les fourchettes avec les observations collectées
pendant la séance, mais seulement à partir du jour où la collecte existe
— jamais rétroactivement.

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

Pour productiser au-delà du statique (comptes, alertes personnalisées,
billing, équipes), voir `docs/ship-readiness.md` : l'app actuelle reste
un MVP public sans backend utilisateur.

## Avertissement

Données réelles quand elles sont sourcées, scénarios de démonstration
quand ils sont indiqués comme tels. Ceci n'est pas un conseil en
investissement.

## Déploiement & automatisation (depuis le 2026-07-08)

Le site est un export statique Next.js (`output: "export"`) déployé sur
**GitHub Pages** : https://rodthenewcomer.github.io/AfriTerminal/

Quatre workflows GitHub Actions (`.github/workflows/`) :

- **deploy.yml** — build + déploiement Pages à chaque push sur `main`
  (le `basePath` `/AfriTerminal` est injecté au build via
  `NEXT_PUBLIC_BASE_PATH`, absent en dev local) ;
- **boc-daily.yml** — chaque jour ouvré (17h30 UTC, retente 20h00) :
  télécharge le bulletin officiel du jour, le fusionne dans
  `data/boc/series/` (`scripts/boc/merge_day.py`, incrémental et
  idempotent), reconstruit `data/real/`, committe et redéploie ;
- **live-poll.yml** — toutes les 15 min pendant la séance : collecte
  les cours différés de brvm.org dans `data/live/` pour reconstruire
  le plus haut/plus bas intraday que le bulletin ne publie pas ;
- **news.yml** — toutes les 2 h en journée : agrège les actualités
  Sika Finance + Financial Afrik (`scripts/news/fetch_news.py`,
  rattachement aux tickers, liens vers les articles originaux) et
  redéploie. Fraîcheur en heures — le temps réel exigera un hébergement
  serveur (ISR), limite assumée du statique.

Aucune machine locale n'est nécessaire : la fraîcheur des données et le
déploiement sont entièrement portés par GitHub Actions.
