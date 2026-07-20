# WARIBA

**La BRVM, clairement.** WARIBA est le terminal premium web, iOS et Android
pour suivre les marchés de l'UEMOA : cours officiels, graphiques, fondamentaux,
dividendes, portefeuille, documents, alertes et synchronisation privée.

- Web production : [wariba.app](https://wariba.app)
- Application native : Expo SDK 54, prête pour les builds iOS/Android signés
- Lancement stores Côte d’Ivoire : [comptes Apple/Google, EAS et checklist](docs/native-release-cote-ivoire.md)
- Compte : e-mail/mot de passe, Apple et Google via Supabase Auth
- WARIBA Pro : Laboratoire 48 réservé aux comptes disposant d'un abonnement Pro actif
- Monétisation : frontière Public / Compte / Pro visible ; Stripe/RevenueCat restent désactivés tant que les produits stores ne sont pas validés
- Données : pipeline BRVM officiel, aucune valeur inventée
- Décision Pro et audit du classeur : [Laboratoire 48 et revue 22 rôles](docs/pro-research-workspace.md)

Depuis le 2026-07-08, **toute l'app** tourne sur les données réelles
BRVM : les **48 sociétés cotées** (cours, variations, volumes, PER,
dividendes, historique depuis 2019) et les **3 indices officiels**
(BRVM Composite, BRVM 30, BRVM Prestige, depuis 2023) alimentent le
dashboard, le screener, la watchlist, le portefeuille, la recherche et
  les fiches actions. Le Laboratoire 48 de WARIBA Pro classe et compare
  les mêmes données sur web, web mobile, iOS et Android, avec score,
  confiance, couverture, exercice et raisons visibles. Les fondamentaux d'états financiers (CA/PNB,
  résultat net, marges et agrégats bancaires) couvrent les **48 sociétés**
  à partir de PDF officiels vérifiés ; **47** ont des capitaux propres
  lisibles (SGBC ne publie pas le bilan complet dans son rapport 2025) et
  **12** ont un nombre d'actions confirmé par deux recoupements, ce qui
  permet de calculer capitalisation, BPA, P/B et ROE sans estimation.
  Pour tout champ non prouvé : masqué (« — »), jamais inventé. Les documents officiels sont
référencés depuis brvm.org, les alertes sont factuelles et dérivées des
dernières séances. Les avis et opérations sur capital viennent de la
  BRVM ; le hub « Opérations & documents » réunit publications, avis, opérations
  sur capital et explications pédagogiques sans inventer d'opération. 15 sociétés gardent une fiche curée
(`lib/mock/stocks.ts` : description, secteur vérifié) ; les autres sont
dérivées du bulletin
(`lib/real-universe.ts` : secteur via code BOC, pays via suffixe du
ticker).

## Démarrage local

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

Les écrans de marché fonctionnent sans compte à partir des artefacts JSON
committés dans `data/real/`, `data/news/` et `data/boc/series/`. Copiez
`.env.example` vers `.env.local` pour activer Supabase Auth, la
synchronisation, Stripe, RevenueCat, les notifications et l'analytics.
`lib/mock/` ne sert qu'aux descriptions curées, replis techniques et
scénarios pédagogiques explicitement signalés.

## Stack

- Next.js 15.5 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
- lightweight-charts v5 (TradingView) pour le chart principal
- Sparklines SVG et anneaux de répartition maison · next-themes
- Supabase + Zustand en mémoire : watchlists, portefeuille, alertes et filtres
  appartiennent au compte cloud ; aucune donnée métier d'invité n'est persistée.
  Seuls thème, préférences chart et cache public restent sur l'appareil.
- Expo SDK 54 · React Native 0.81 · Expo Router · Skia · Reanimated pour
  l'app iOS/Android dans `apps/mobile`, avec le même contrat de synchronisation
  et une sauvegarde JSON portable pour les comptes

## Système de marque et assets

La source vectorielle de l'identité WARIBA vit dans `assets/brand/`.
Les déclinaisons prêtes pour les plateformes sont générées dans :

- `app/icon.svg`, `app/icon.png`, `app/apple-icon.png` pour Next.js/PWA/iOS ;
- `apps/mobile/assets/icon.png` pour l'icône iOS ;
- `apps/mobile/assets/android-icon-foreground.png`,
  `android-icon-background.png` et `android-icon-monochrome.png` pour
  l'icône adaptative Android ;
- `apps/mobile/assets/splash-icon.png` pour l'écran de lancement natif.

Identifiants natifs : scheme `wariba://`, bundle iOS et package Android
`app.wariba.mobile`.

## Qualité de livraison

Le gate exécute ESLint, TypeScript web/mobile, Vitest, les tests Python, le
build Next.js, Expo Doctor, la compatibilité des versions Expo, les exports
iOS/Android et l'audit des dépendances de production.

## Structure

```
app/                pages (dashboard/accueil, map, screener, charts —
                    multi-graphiques, stocks/[ticker], portfolio,
                     operations, sgi, watchlist, alerts, news, pro,
                    status, settings) + opengraph-image par ticker (build)
components/
  charts/           MainChart (bougies, ligne, aire, OHLC, Heikin Ashi,
                    volume, SMA/EMA/Bollinger, RSI, MACD, comparaison %,
                    ajustement dividendes), toolbar, sparkline
  stocks/           table, badges, historique dividendes, profil de
                    risque (volatilité/bêta/perte max), comparables
  portfolio/        transactions, courbe de patrimoine, revenus passifs
  operations/       publications, avis et opérations officielles réunis
  layout/           shell, sidebar, bottom nav + feuille « + » mobile,
                    recherche ⌘K, statut BRVM
lib/
  portfolio.ts      moteur PRU/P&L/dividendes/projections (pur, testé)
  risk.ts           volatilité annualisée, bêta, drawdown max (pur, testé)
  backup.ts         export/import portable des données de compte (pur, testé)
  real-*.ts         accès aux artefacts réels (cours, fondamentaux,
                    dividendes, documents, opérations, actualités)
  company-profiles  48 descriptions factuelles curées
  indicators.ts     SMA, EMA, RSI, MACD, Bollinger, Heikin Ashi, VWAP
  mock/             métadonnées historiques de repli, jamais cotations publiques
```

## Couverture des actions BRVM

WARIBA couvre les **48/48 actions** du snapshot officiel : cotation,
historique, fondamentaux vérifiés et fiche de publications pour chaque
ticker. La séance active contient actuellement 47 valeurs ; `SVOC` reste
accessible mais est explicitement signalée comme suspendue depuis 2019 et
est exclue des tops, de la breadth et des moyennes de séance.

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
  recoupée ; nombre d'actions uniquement sur deux preuves concordantes)
  → `data/real/fundamentals.json` (48/48 sociétés).
- **`refresh_fundamentals.py`** — pour les 48 tickers, détecte un nouvel
  exercice annuel, lit PDF texte ou scan OCR, détermine unité et colonnes
  par recoupement N-1, puis actualise automatiquement. Une ambiguïté bloque
  l'écrasement et apparaît dans `fundamentals-status.json`.
- **`build_alerts.py`** — alertes factuelles des 5 dernières séances.
- **`fetch_documents.py`** / **`fetch_operations.py`** — publications
  officielles par société et avis/opérations sur capital (ESV) depuis
  brvm.org, liens vers les PDF sources. Les 48 fiches sont contrôlées à
  chaque passage ; un ticker non couvert fait échouer le workflow.
- **`check_freshness.py`** — watchdog : bulletin en ligne mais non
  ingéré → workflow rouge (e-mail).

### Branché dans l'app

`data/real/snapshot.json` (48 valeurs — prix, variations, volume, PER,
rendement, dernier dividende) et `data/real/series/{TICKER}.json`
(historique OHLCV complet, chargé à la demande via import dynamique —
jamais tous en même temps) alimentent `lib/real-data.ts`, consommé par
les fiches actions, le dashboard, les marchés, le screener, la watchlist
et la recherche.

**Volontairement indisponible quand la donnée n'est pas vérifiée** : les
fondamentaux couvrent 48/48 sociétés. Les capitaux propres ne sont affichés
que pour l'exercice qu'ils documentent : CFAO 2025 et SGBC restent sans ROE
récent faute de bilan complet dans la publication annuelle correspondante.
Capitalisation/BPA demandent un nombre d'actions doublement recoupé
(12/48), P/B/ROE demandent en plus les capitaux propres. Partout ailleurs :
masqué avec une explication, jamais rempli avec un chiffre inventé. Le moteur
`WARIBA Factuel v1.0` calcule pour les 48 actions Qualité, Valorisation,
Momentum et Risque, puis publie la couverture, le niveau de confiance,
les raisons et le benchmark. Il ne produit aucun verdict d'achat/vente.

**Mis à jour (2026-07-08)** : `lib/data.ts` centralise le remplacement
prix/volume/PER/dividende réel pour toute l'app via `StockSnapshot.real`.
Capitalisation/P-B/ROE/scores affichent "—" avec une infobulle quand la
donnée réelle manque ; le screener privilégie des critères réels (PER,
rendement, YTD, volume).

Documents et alertes sont aussi audités contre les vraies données :
le hub Opérations & documents liste les PDF, avis et opérations sourcés,
et les alertes factuelles (prix, volumes, dividendes, fondamentaux,
publications, extrêmes 52 semaines) sont générées depuis les séries réelles.
La pédagogie explique des mécanismes généraux ; aucun événement fictif ne se
présente comme vérifié.

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

La couche produit server-backed est maintenant présente : comptes Supabase,
API de synchronisation privée, entitlements multi-provider et adaptateurs
Stripe/RevenueCat. Les faits de marché restent publics ; la synchronisation
privée exige un compte et les outils de recherche avancés de Pro exigent
un droit actif. La matrice Public / Compte / Pro et les blocages externes sont
suivis dans `docs/ship-readiness.md`.

## Avertissement

Données réelles quand elles sont sourcées, scénarios pédagogiques simulés
quand ils sont indiqués comme tels. Ceci n'est pas un conseil en
investissement.

## Déploiement & automatisation (depuis le 2026-07-08)

Le site, l'API et les JSON publics utilisent le même déploiement Vercel
Next.js `standalone` sur `wariba.app`. L'app mobile lit en priorité
`https://wariba.app/data`; `raw.githubusercontent.com` reste uniquement un
secours réseau. GitHub Pages n'est plus dans le chemin de production.
Voir `docs/server-deployment.md` pour l'architecture complète.

Six workflows GitHub Actions (`.github/workflows/`) :

- **boc-daily.yml** — chaque jour ouvré (17h30 UTC, retentes 20h00,
  22h30 et 05h00 le lendemain — la BRVM publie parfois tard) :
  télécharge le bulletin officiel, le fusionne dans `data/boc/series/`
  (`merge_day.py`, incrémental et idempotent), reconstruit
  `data/real/` (y c. alertes et opérations) et committe ; le push déclenche
  automatiquement Vercel ;
- **live-poll.yml** — toutes les 5 min pendant la séance : collecte
  les cours différés de brvm.org dans `data/live/` pour reconstruire
  le plus haut/plus bas intraday que le bulletin ne publie pas, met à
  jour `data/real/live.json` ;
- **news.yml** — toutes les 5 min en journée : agrège les actualités
  Sika Finance + Financial Afrik (`scripts/news/fetch_news.py`,
  rattachement aux tickers, liens vers les articles originaux) et
  et pousse la nouvelle version ;
- **documents.yml** — toutes les 5 min : publications officielles des
  48 actions depuis les fiches brvm.org, alerte décisionnelle immédiate et
  push de la nouvelle version ;
- **freshness.yml** — watchdog quotidien (07h00 UTC) : un bulletin en
  ligne mais absent de nos données met le workflow en rouge (e-mail) —
  la staleness silencieuse est interdite ;
- **ci.yml** — ESLint, TypeScript web/mobile, vitest, unittest Python,
  audit, build Next, Expo Doctor/compatibilité et exports iOS/Android.

Chaque build copie `data/real` et `data/news` dans `/data` sur
`wariba.app`. Le web vérifie la version toutes les 60 secondes et recharge
atomiquement quand Vercel publie un nouveau snapshot ; le mobile rafraîchit
chaque minute au premier plan. La fraîcheur publique reste pilotée par le pipeline planifié ; le runtime
Node porte les comptes, la synchronisation, la facturation, les alertes
push/e-mail, l'analytics consentie, le throttling distribué et les sondes
d'exploitation.

Aucune machine locale n'est nécessaire : la fraîcheur des données et le
déploiement sont entièrement portés par GitHub Actions.

## Application mobile iOS/Android

Implémentée dans `apps/mobile` : app Expo/React Native, chart motorisé
par le build lightweight-charts du site dans une WebView hors-ligne
(décision 2026-07-12), navigation Router, données réseau/cache,
portefeuille (transactions rétrodatables, saisies validées et testées),
watchlist, screener public, hub Opérations & documents, comparateur SGI
Côte d'Ivoire et alertes personnalisées avec push/e-mail serveur.
Watchlist, portefeuille, seuils et filtres exigent un compte et ne sont plus
persistés comme sessions locales. La logique de
calcul reste partagée dans `packages/core` et le site conserve son
comportement. La revue 22 rôles du 2026-07-13 est intégrée (voir
`docs/ship-readiness.md`). L'identité WARIBA, l'ouverture animée,
l'onboarding, la connexion et l'inscription sont partagés entre iOS et
Android. La validation finale sur appareils physiques et les builds signés
stores restent à effectuer. Détail :
[docs/mobile-app-plan.md](docs/mobile-app-plan.md) ; comptes et
onboarding : [docs/auth-onboarding-plan.md](docs/auth-onboarding-plan.md).
