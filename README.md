# AfriTerminal

Terminal de charting et d'analyse des actions africaines — MVP BRVM.
« La BRVM devient lisible » : charts, fondamentaux, dividendes, documents
officiels et signaux intelligents.

Depuis le 2026-07-08, **toute l'app** tourne sur les données réelles
BRVM : les **48 sociétés cotées** (cours, variations, volumes, PER,
dividendes, historique depuis 2019) et les **3 indices officiels**
(BRVM Composite, BRVM 30, BRVM Prestige, depuis 2023) alimentent le
dashboard, le screener, la watchlist, le portefeuille, la recherche et
les fiches actions. Les fondamentaux d'états financiers (CA, résultat
net, marges…) sont extraits des PDF officiels pour **26 sociétés**,
vérifiés à la main ; **8** d'entre elles ont aussi capitalisation, BPA,
P/B et ROE réels (nombre d'actions et capitaux propres double-vérifiés,
identité P/B = PER × ROE contrôlée). Pour le reste : masqué (« — »),
jamais inventé. Les documents officiels sont
référencés depuis brvm.org, les alertes sont factuelles et dérivées des
dernières séances. Les avis et opérations sur capital viennent de la
BRVM ; seul l'onglet « Apprendre » de la page IPO contient des scénarios
pédagogiques explicitement simulés. 15 sociétés gardent une fiche curée
(`lib/mock/stocks.ts` : description, secteur vérifié) ; les autres sont
dérivées du bulletin
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
`lib/mock/` ne sert plus qu'aux descriptions curées, aux anciens jeux de
repli technique et aux scénarios pédagogiques explicitement simulés
(onglet « Apprendre » de la page IPO).

## Stack

- Next.js 15.5 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
- lightweight-charts v5 (TradingView) pour le chart principal
- Sparklines SVG et anneaux de répartition maison · next-themes
- Zustand persisté en localStorage : watchlists, portefeuille
  (transactions, PRU, dividendes perçus), filtres screener, préférences
  chart — avec sauvegarde/restauration JSON (Réglages)

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
app/                pages (dashboard/accueil, map, screener, charts —
                    multi-graphiques, stocks/[ticker], portfolio,
                    documents, watchlist, alerts, ipo, news, status,
                    settings) + opengraph-image par ticker (build)
components/
  charts/           MainChart (bougies, ligne, aire, OHLC, Heikin Ashi,
                    volume, SMA/EMA/Bollinger, RSI, MACD, comparaison %,
                    ajustement dividendes), toolbar, sparkline
  stocks/           table, badges, historique dividendes, profil de
                    risque (volatilité/bêta/perte max), comparables
  portfolio/        transactions, courbe de patrimoine, revenus passifs
  documents/        liste des publications officielles référencées BRVM
  layout/           shell, sidebar, bottom nav + feuille « + » mobile,
                    recherche ⌘K, statut BRVM
lib/
  portfolio.ts      moteur PRU/P&L/dividendes/projections (pur, testé)
  risk.ts           volatilité annualisée, bêta, drawdown max (pur, testé)
  backup.ts         export/import validé des données locales (pur, testé)
  real-*.ts         accès aux artefacts réels (cours, fondamentaux,
                    dividendes, documents, opérations, actualités)
  company-profiles  48 descriptions factuelles curées
  indicators.ts     SMA, EMA, RSI, MACD, Bollinger, Heikin Ashi, VWAP
  mock/             scénarios pédagogiques (IPO) + méta héritées
```

## Fiches sociétés curées (15)

`SNTS` Sonatel · `ORAC` Orange CI · `NSBC` NSIA Banque CI · `SGBC` SGCI ·
`SIBC` SIB · `BICC` BICICI · `CBIBF` Coris Bank · `BOAB` BOA Burkina ·
`ETIT` Ecobank ETI · `ONTBF` Onatel BF · `PALC` Palm CI · `SPHC` SAPH ·
`UNXC` Uniwax · `CIEC` CIE · `TTLC` TotalEnergies Marketing CI

## Pipeline de données réelles (BRVM)

Le pipeline `scripts/boc/` (Python) alimente directement l'app via les
artefacts JSON committés dans `data/real/`, `data/news/`, `data/live/` et
`data/boc/series/`. Détails complets : `scripts/boc/README.md`.

- **`parse_boc.py`** — extrait un bulletin officiel de la cote (PDF
  quotidien BRVM) en JSON : ticker, nom, OHLC, volume, valeur, dividende
  net, rendement, PER. Gère deux schémas de table (16 et 15 colonnes)
  détectés automatiquement, validé sur des bulletins réels 2021→2026.
- **`backfill.py`** — boucle sur les jours ouvrés d'une période, télécharge
  et parse chaque bulletin, reprenable après interruption. Le backfill
  2019-01-01 → aujourd'hui a été validé puis relayé par les mises à jour CI.
- **`aggregate.py`** — regroupe les JSON quotidiens en une série par
  ticker (`data/boc/series/TICKER.json`).
- **`live_poll.py`** — interroge la page d'accueil brvm.org (cours différés
  de 15 min) pendant la séance pour reconstruire un vrai plus haut/bas
  intraday, que le BOC ne publie pas.
- **`build_app_data.py`** — génère `data/real/` (snapshot 48 valeurs
  avec extrêmes 52 sem/record/séance du jour, séries OHLCV, indices,
  historique des dividendes nets par ticker) depuis `data/boc/series/`.
- **`fundamentals.py`** — états financiers curés société par société
  (REGISTRY : PDF épinglé, unité vérifiée, extracteur ou saisie manuelle
  recoupée ; nombre d'actions/capitaux propres uniquement sur double
  source concordante) → `data/real/fundamentals.json`.
- **`build_alerts.py`** — alertes factuelles des 5 dernières séances.
- **`fetch_documents.py`** / **`fetch_operations.py`** — publications
  officielles par société et avis/opérations sur capital (ESV) depuis
  brvm.org, liens vers les PDF sources.
- **`check_freshness.py`** — watchdog : bulletin en ligne mais non
  ingéré → workflow rouge (e-mail).

### Branché dans l'app

`data/real/snapshot.json` (48 valeurs — prix, variations, volume, PER,
rendement, dernier dividende) et `data/real/series/{TICKER}.json`
(historique OHLCV complet, chargé à la demande via import dynamique —
jamais tous en même temps) alimentent `lib/real-data.ts`, consommé par
les fiches actions, le dashboard, les marchés, le screener, la watchlist
et la recherche.

**Volontairement indisponible quand la donnée n'est pas vérifiée** :
les fondamentaux ne s'affichent que pour les sociétés extraites (26/48),
et capitalisation/BPA/P/B/ROE seulement là où nombre d'actions et
capitaux propres sont double-vérifiés (8/26). Partout ailleurs : masqué
avec une explication, jamais rempli avec des chiffres inventés. Scores
et analyse IA restent désactivés sur données réelles.

**Mis à jour (2026-07-08)** : `lib/data.ts` centralise le remplacement
prix/volume/PER/dividende réel pour toute l'app via `StockSnapshot.real`.
Capitalisation/P-B/ROE/scores affichent "—" avec une infobulle quand la
donnée réelle manque ; le screener privilégie des critères réels (PER,
rendement, YTD, volume).

Documents et alertes sont aussi audités contre les vraies données :
les documents listent les PDF officiels référencés depuis les fiches
sociétés BRVM, et les alertes factuelles (prix, volumes, dividendes,
extrêmes 52 semaines) sont générées depuis les séries réelles. Les seuls
cas synthétiques exposés à l'utilisateur sont les scénarios pédagogiques
de l'onglet « Apprendre » sur la page IPO — rien ne se présente comme
vérifié sans l'être.

**Limite connue à ne pas oublier** : le BOC ne publie que l'ouverture et
la clôture par action, jamais de plus haut/bas intraday. `live_poll.py`
élargit désormais les fourchettes avec les observations collectées
pendant la séance, mais seulement à partir du jour où la collecte existe
— jamais rétroactivement.

**Écart entre fiches curées et univers réel** : les 15 fiches historiques
de `lib/mock/stocks.ts` correspondent toutes à de vrais tickers BRVM
(`ETIT` = Ecobank Transnational Inc., distinct de `ECOC` = Ecobank Côte
d'Ivoire). Leurs anciens prix de repli ne doivent plus être présentés
comme cotations : l'app les remplace par les valeurs du pipeline réel dès
que `StockSnapshot.real` existe. Les autres tickers sont dérivés du
bulletin (secteur via code BOC, pays via suffixe du ticker), sans
description longue inventée.

Pour productiser au-delà du statique (comptes, alertes personnalisées,
billing, équipes), voir `docs/ship-readiness.md` : l'app actuelle reste
un MVP public sans backend utilisateur.

## Avertissement

Données réelles quand elles sont sourcées, scénarios pédagogiques simulés
quand ils sont indiqués comme tels. Ceci n'est pas un conseil en
investissement.

## Déploiement & automatisation (depuis le 2026-07-08)

Le site est un export statique Next.js (`output: "export"`) déployé sur
**GitHub Pages** : https://rodthenewcomer.github.io/AfriTerminal/

Sept workflows GitHub Actions (`.github/workflows/`) :

- **deploy.yml** — build + déploiement Pages à chaque push sur `main`
  (le `basePath` `/AfriTerminal` est injecté au build via
  `NEXT_PUBLIC_BASE_PATH`, absent en dev local) ;
- **boc-daily.yml** — chaque jour ouvré (17h30 UTC, retentes 20h00,
  22h30 et 05h00 le lendemain — la BRVM publie parfois tard) :
  télécharge le bulletin officiel, le fusionne dans `data/boc/series/`
  (`merge_day.py`, incrémental et idempotent), reconstruit
  `data/real/` (y c. alertes et opérations), committe et redéploie ;
- **live-poll.yml** — toutes les 15 min pendant la séance : collecte
  les cours différés de brvm.org dans `data/live/` pour reconstruire
  le plus haut/plus bas intraday que le bulletin ne publie pas ;
- **news.yml** — toutes les 2 h en journée : agrège les actualités
  Sika Finance + Financial Afrik (`scripts/news/fetch_news.py`,
  rattachement aux tickers, liens vers les articles originaux) et
  redéploie ;
- **documents.yml** — hebdomadaire : publications officielles par
  société depuis les fiches brvm.org ;
- **freshness.yml** — watchdog quotidien (07h00 UTC) : un bulletin en
  ligne mais absent de nos données met le workflow en rouge (e-mail) —
  la staleness silencieuse est interdite ;
- **ci.yml** — vitest + unittest Python + build sur chaque push/PR.

Fraîcheur en heures — le temps réel exigera un hébergement serveur
(ISR), limite assumée du statique.

Aucune machine locale n'est nécessaire : la fraîcheur des données et le
déploiement sont entièrement portés par GitHub Actions.
