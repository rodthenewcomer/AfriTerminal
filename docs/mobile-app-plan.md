# AfriTerminal Mobile — plan Expo (iOS/Android)

Statut : **Phases 0 à 5 implémentées ; validation finale des gestes sur
appareil et builds stores en attente**. Le site web (Next.js, GitHub Pages)
n'est **pas remplacé** : il continue de vivre à l'identique, en parallèle.

## Contraintes fixées par le produit

1. **Niveau de finition « 2026, outstanding »** — pas un wrapper qui a
   l'air d'un site web dans une coquille. Interactions natives
   (haptics, gestes, transitions), et la même identité visuelle que le
   site (palette sombre `#09090b`/`#111113`/`#18181b`, accent ambre
   `#e2a63d`, vert/rouge `#22c55e`/`#ef4444`, violet `#8b5cf6` pour
   MACD/opérations, or pour dividendes).
2. **Chart : moteur du site web via WebView** *(décision produit révisée
   le 2026-07-12)*. Le spike Skia natif (Phase 1) a été mené à bout puis
   remplacé : le rendu ne satisfaisait pas le niveau de finition visé, et
   reconstruire la polish de TradingView en Skia coûtait plusieurs
   semaines. Le graphique embarque désormais `lightweight-charts` (le
   build standalone exact du site, hors-ligne, régénérable via
   `apps/mobile/scripts/embed-lwc.mjs`) dans une WebView limitée à la
   zone du chart — design identique au web pixel près. Tout le reste de
   l'app (navigation, écrans, calculs, stores, toolbar du chart) reste
   100 % natif : la WebView est un renderer muet piloté en JSON
   (`src/components/chart/WebChart.tsx`).

## Architecture — monorepo, pas un nouveau dépôt

```
apps/
  web/         ce dépôt actuel (Next.js), inchangé fonctionnellement
  mobile/      nouvelle app Expo (iOS + Android)
packages/
  core/        lib/ + hooks/ + data/ + types déplacés ici une seule fois,
               importés par web ET mobile — une seule source de vérité
               pour les calculs (PRU, volatilité, bêta, indicateurs...)
```

**Ce qui migre vers `packages/core` quasiment sans modification**
(fonctions pures, zéro DOM) : `lib/portfolio.ts`, `lib/risk.ts`,
`lib/indicators.ts`, `lib/dividend-calendar.ts`, `lib/format.ts`,
`lib/glossary.ts`, `lib/company-profiles.ts`, `lib/types.ts`,
`lib/real-*.ts`, et tous les `data/real/*.json` (servis depuis le site
GitHub Pages déjà public — pas de nouveau backend à créer).

**Ce qui migre avec un adaptateur mineur** : les stores zustand
(`hooks/use-watchlist.ts`, `use-portfolio.ts`, `use-price-alerts.ts`,
`use-chart-levels.ts`, `use-chart-layouts.ts`, `use-saved-filters.ts`)
— même logique, seul le moteur de stockage change (`localStorage` →
`AsyncStorage`/`expo-secure-store`). Le pattern d'hydratation
(`skipHydration` + `rehydrate()` + `hasHydrated()`) déjà en place ne
change pas.

**Ce qui se reconstruit entièrement** : tous les composants React
(`components/*`) — écrits en JSX/Tailwind, incompatibles avec React
Native. La reconstruction utilise les primitives RN (`View`, `Text`,
`Pressable`, `ScrollView`) et un module de tokens typé avec `StyleSheet`.
Ce choix évite une couche NativeWind supplémentaire tout en gardant les
valeurs de `globals.css` comme source de vérité.

## Le moteur de graphique — le vrai chantier

Le chart actuel (`components/charts/main-chart.tsx`, moteur v3.1) fait
déjà beaucoup : 6 types de rendu (chandelles, ligne, aire, baseline,
barres, heikin-ashi), 10 indicateurs avec sous-panneaux (RSI, MACD, ATR,
Stochastique en pane séparé ; SMA/EMA/VWAP/Bollinger en overlay),
marqueurs d'événements (dividendes, opérations sur capital), échelle
logarithmique, comparaison en %, lignes de référence (clôture veille,
extrêmes 52 semaines), outil de niveaux (tap pour poser/retirer), export
PNG, raccourcis clavier.

**Bonne nouvelle** : tout le calcul (`lib/indicators.ts` — SMA, EMA,
RSI, MACD, ATR, Stochastique, VWAP, Bollinger, tous purs et testés) migre
tel quel dans `packages/core`. Ce qui doit être réécrit, c'est
uniquement le **rendu** — dessiner les chandelles, gérer le pan/zoom
tactile, les marqueurs, les sous-panneaux.

**Moteur retenu : `@shopify/react-native-skia`** + `react-native-gesture-handler`
+ `react-native-reanimated`. C'est la stack qui permet un rendu GPU
personnalisable (seul moyen d'atteindre la qualité TradingView en natif
pur) et qui a l'écosystème le plus mature pour ce niveau d'exigence en
2026. Alternative écartée : les libs de charts RN existantes
(`react-native-wagmi-charts`, Victory Native) couvrent la chandelle/ligne
basique mais aucune ne gère nativement les sous-panneaux multiples
(RSI + MACD + prix empilés) ni l'outil de niveaux — il aurait fallu les
détourner autant que de partir de Skia directement.

**Risque principal du projet** : ce moteur est un morceau d'ingénierie à
part entière (essentiellement reconstruire une partie de
`lightweight-charts` en Skia). Recommandation : commencer par un
**spike d'1 semaine** (chandelles + pan/zoom + un seul indicateur en
overlay) avant de committer sur le planning complet, pour vérifier la
faisabilité et la fluidité sur device réel (pas seulement simulateur)
avant d'investir les semaines suivantes.

## Feuille de route (réestimée avec le chart natif)

| Phase | Contenu | Estimation |
|---|---|---|
| 0 | Monorepo : extraction de `packages/core`, sans toucher au comportement du site web | 3-4 jours |
| 1 | Spike chart Skia (chandelles, pan/zoom, 1 overlay) — go/no-go | 1 semaine |
| 2 | Squelette Expo (navigation, thème, design tokens NativeWind) + écrans Accueil/Watchlist/Alertes | 1,5-2 semaines |
| 3 | Chart natif complet (types, 10 indicateurs, marqueurs, niveaux, log/comparaison) | 3-4 semaines |
| 4 | Fiche action, Portefeuille, Screener, Documents/Actus, Réglages | 2 semaines |
| 5 | Notifications push (alertes de prix — la vraie raison d'être natif), icônes, splash, soumission stores | 1 semaine |

**Total : ~9-11 semaines** pour une v1 complète et soumissible, contre
~5-6 semaines si le chart avait été en WebView. Le delta (~4-5 semaines)
est le prix du rendu 100 % natif demandé.

## Ce qui ne change pas

- Le site web (`apps/web` après migration) garde son pipeline de données
  (`scripts/boc/`, GitHub Actions), son export statique, son déploiement
  GitHub Pages — rien de ce document n'affecte son fonctionnement actuel.
- Aucune donnée n'est dupliquée : l'app mobile consomme les mêmes JSON
  publics déjà générés pour le site.

## Statut

- ✅ **Phase 0 — terminée** (commit `7d4bda1`). `packages/core` extrait,
  ~70 imports migrés, site web vérifié inchangé (tsc, 81 tests vitest,
  63 tests Python, build statique, CI + deploy GitHub Actions verts).
- 🟡 **Phase 1 — rendu Skia confirmé sur l'iPhone physique ; correctif des
  gestes à revalider.** Le crash Hermes/Worklets a disparu et le chart se
  rend. Le test appareil a ensuite révélé que la SMA suivait le geste mais
  pas les chandelles. Les paths chandelles lisent désormais directement
  `scale` et `translateX`, et le zoom focal a été extrait et testé. Le pinch
  et le double-tap corrigés doivent encore être confirmés sur l'iPhone.
- 🟡 **Phase 2 — implémentée et exportée.** Expo Router, stack + cinq tabs,
  thème sombre, chargement réseau/cache, Accueil, Marché, Watchlist et
  Alertes. Pull-to-refresh, skeletons, animations d'entrée, flash prix et
  swipe-to-remove sont présents. Validation UX sur appareil en attente.
- 🟡 **Phase 3 — implémentée et exportée.** Six rendus, onze sélections
  d'indicateurs (SMA 20/50/100/200, EMA, VWAP, Bollinger, RSI, MACD, ATR,
  Stochastique), panes synchronisés au viewport, marqueurs, échelles log/% ,
  références, niveaux et partage PNG. Validation visuelle/performance sur
  appareil en attente.
- 🟡 **Phase 4 — implémentée et exportée.** Fiche action, portefeuille,
  screener et filtres sauvegardés, dividendes, documents/actualités,
  IPO/opérations, carte, réglages et statut. Les longues collections sont
  rendues par lots pour protéger les appareils modestes.
- 🟡 **Phase 5 — code et configuration terminés ; publication non exécutée.**
  Notifications locales, vérification au premier plan et tâche opportuniste,
  deep-link vers la fiche, icônes adaptatives, splash, identifiants iOS/
  Android, versioning et profils EAS sont configurés. Les builds signés et
  soumissions nécessitent les comptes Apple/Google et les identifiants EAS.

## Résultat du moteur natif

`apps/mobile` utilise Expo SDK 54, React Native 0.81.5, React 19.1,
Skia 2.2.12, Reanimated 4.1.x, Gesture Handler 2.28 et Worklets 0.5.1.
Cette pile correspond exactement à l'Expo Go SDK 54 disponible sur le
seul iPhone de test.

Le composant `CandleChart` dessine prix, overlays et panes en `SkPath` via
`useDerivedValue`. Pan, pinch, panes synchronisés et crosshair restent sur
le thread UI. Le moteur comprend désormais :

- axe de prix à droite, axe de dates en bas et grille légère ;
- appui long avec crosshair et tooltip date/OHLC ;
- pan inertiel borné (`withDecay`), zoom autour du point focal et reset
  au ressort (`withSpring`) ;
- haptique légère au reset et à l'engagement du crosshair ;
- six rendus, overlays et panes d'indicateurs, événements et niveaux ;
- chrome natif conforme aux tokens web sombres, surfaces pleines et
  bordures fines, sans blur ni shader décoratif.

Le zoom focal est une transformation testée : le point de contenu sous les
doigts reste invariant pendant le changement d'échelle, puis translation et
échelle sont bornées. Tous les paths lisent explicitement les mêmes shared
values, ce qui évite le défaut où seule une moyenne mobile bougeait.

### Incident Hermes SDK 54

Le crash appareil `SyntaxError: private properties are not supported`
venait d'un graphe workspace incohérent après le downgrade SDK 57 → 54 :
le lockfile gardait `react-native-worklets 0.8.3` alors que Reanimated
4.1/Expo 54 attend Worklets 0.5.1. Metro pouvait donc inclure du code JS
et un plugin Worklets d'une autre génération que les modules natifs
fournis par Expo Go.

Correction : Worklets verrouillé à 0.5.1, arbre npm régénéré et dédupliqué,
React partagé en 19.1, New Architecture explicitement activée et preset
Babel Expo présent. `expo-haptics` utilise la version SDK 54.

## Architecture mobile livrée

- **Navigation :** Expo Router, stack native et tabs Accueil, Marché,
  Watchlist, Portefeuille, Plus.
- **Données :** JSON communs sous `/data`, Pages en priorité puis miroir
  `raw.githubusercontent.com`, timeout et cache AsyncStorage. Le workflow de
  déploiement copie maintenant `data/real` et `data/news` dans l'export
  statique ; le miroir brut reste le secours tant que ce workflow n'a pas
  redéployé Pages.
- **État :** stores Zustand persistés avec `skipHydration` et réhydratation
  centralisée pour watchlist, portefeuille, seuils, chart, niveaux, filtres
  du screener et réglages. Aucune donnée secrète n'est stockée ; la
  dépendance SecureStore, jamais utilisée, a été retirée le 2026-07-13 et
  sera réintroduite avec l'authentification (voir `docs/auth-onboarding-plan.md`).
- **Typographie :** police système iOS/Android retenue pour les métriques,
  performances et scripts francophones ; tous les prix et pourcentages ont
  `tabular-nums`. Aucun fichier Geist n'est embarqué.
- **Alertes :** livraison locale uniquement. Sans backend, aucune garantie
  de notification temps réel lorsque l'application est forcée à l'arrêt.
  Les contrôles ont lieu au chargement, au retour au premier plan, au
  rafraîchissement et dans les fenêtres de tâche accordées par le système.

## Vérifications

**Vérifié sur cette machine :**

- TypeScript racine et mobile sans erreur ;
- `expo install --check` : dépendances à jour ;
- `expo-doctor apps/mobile` : 18/18 contrôles réussis ;
- 97 tests Vitest, dont les invariants du zoom focal et la validation des
  saisies mobiles (`apps/mobile/src/lib/forms.test.ts`) ;
- build statique Next.js du site inchangé ;
- exports Metro/Hermes iOS et Android, bundles `.hbc` générés.

**Non vérifié :** correctif final pinch/double-tap, synchronisation des panes,
fluidité des longues séries, notifications réelles et partage PNG sur
l'iPhone physique ; Android réel ; builds EAS signés et soumission stores.
Cette machine ne dispose d'aucun simulateur iOS ni émulateur Android.

## Revue 22 rôles — correctifs du 2026-07-13

La revue senior multi-rôles de l'app mobile a produit les correctifs
suivants, tous implémentés et testés :

1. **Validation des saisies (bug)** — `Number("abc")` = NaN passait les
   contrôles `<= 0` du portefeuille et des alertes. Toutes les saisies
   passent par `src/lib/forms.ts` (fonctions pures, 16 tests) : montants
   finis, quantités entières positives, seuils finis.
2. **Date de transaction rétroactive** — la feuille de saisie accepte
   JJ/MM/AAAA ou AAAA-MM-JJ (ni future, ni antérieure à l'ouverture de la
   BRVM), au lieu d'imposer la date du jour ; les dividendes perçus sont
   désormais corrects pour les positions historiques.
3. **Restauration de sauvegarde** — Réglages > « Importer une sauvegarde »
   (expo-document-picker) : validation stricte du JSON entrée par entrée,
   récapitulatif et confirmation avant remplacement.
4. **ErrorBoundary racine** — un crash de rendu affiche un écran de
   reprise (« Réessayer ») au lieu d'un écran noir.
5. **Fraîcheur honnête** — quand les cotations viennent du cache appareil,
   `updatedAt` reflète l'horodatage de sauvegarde du cache, pas l'heure de
   la tentative de rafraîchissement.
6. **Alertes réarmables** — une alerte déclenchée est signalée inactive et
   peut être réarmée d'un tap.
7. **Accessibilité** — rôles, libellés et états sur les contrôles partagés
   (SegmentedTabs, Row, ActionButton), les boutons de pied de fiche, les
   Switch et les formulaires.
8. **WebView du chart durcie** — navigation http(s) bloquée
   (`onShouldStartLoadWithRequest`), en plus des restrictions existantes.
9. **Dépendance morte retirée** — `expo-secure-store` (plugin + package).

## Validation appareil

Depuis la racine du dépôt :

```bash
cd apps/mobile
npx expo start -c --lan
```

Ouvrir ensuite l'URL `exp://` dans Expo Go SDK 54 sur l'iPhone et vérifier :

1. ouvrir Marché > SNTS > Graphique et vérifier que chandelles, overlays et
   panes bougent ensemble ;
2. pincer près du bord gauche puis droit : la bougie sous les doigts reste
   au même endroit et sa largeur change nettement ;
3. double-taper après un fort zoom : échelle et cadrage reviennent au ressort
   avec haptique ;
4. tester pan inertiel, crosshair, six rendus, indicateurs, log, %, niveau et
   export PNG ;
5. parcourir les cinq tabs, ajouter/retirer une watchlist par swipe, saisir
   une transaction et sauvegarder un filtre ;
6. autoriser une alerte déjà franchie, rafraîchir, ouvrir la notification et
   vérifier le deep-link ;
7. passer hors ligne après un premier chargement et vérifier le mode cache ;
8. relever toute erreur rouge, disparition, désynchronisation ou saccade avec
   ticker, geste et capture/vidéo.
