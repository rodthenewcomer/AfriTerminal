# AfriTerminal — plan Comptes, Onboarding & Écrans d'accueil (app + web)

Statut : **plan approuvé pour exécution, rien d'implémenté**.
Rédigé le 2026-07-13, à la suite de la revue 22 rôles.

Ce document couvre quatre chantiers demandés ensemble parce qu'ils forment
un seul parcours utilisateur : **écran de démarrage animé → première
ouverture (onboarding débutant) → création de compte / connexion →
application**. Il s'applique à l'app mobile (Expo) et au site web (Next.js).

---

## 1. Principes non négociables

1. **Local-first reste la vérité.** L'app et le site fonctionnent
   entièrement sans compte, comme aujourd'hui. Le compte est un *ajout*
   (synchronisation, futur push serveur), jamais un mur. Un bouton
   « Continuer sans compte » est présent à chaque étape d'auth.
2. **La promesse de confidentialité change et doit être réécrite.**
   Aujourd'hui : « rien ne quitte cet appareil ». Demain : « rien ne quitte
   cet appareil *sans votre action* ; avec un compte, watchlist,
   portefeuille et alertes sont chiffrés en transit et stockés dans votre
   espace privé ». Réglages, page Statut et README doivent être mis à jour
   le jour du lancement — c'est un gate de release (rôle 10, Sécurité).
3. **Pas de contrôle qui ment** (rôle 2, PM) : tant que le backend n'est
   pas en production, aucun écran de login ne ship. Ce plan s'exécute en
   entier ou pas du tout par phase.
4. **Les cours restent publics.** L'authentification ne protège que les
   données *de l'utilisateur*, jamais les données de marché.

## 2. Architecture retenue

**Backend : Supabase** (Auth + Postgres + Row Level Security).

Pourquoi : le site est un export statique GitHub Pages (pas de serveur à
nous), l'app est Expo — `supabase-js` fonctionne dans les deux sans
backend intermédiaire ; RLS donne l'isolation par utilisateur sans écrire
d'API ; le tier gratuit couvre largement un MVP ; c'est la stack déjà
maîtrisée (cf. règles LoopGuard du poste de travail).

- **Web** : `@supabase/supabase-js` + `@supabase/ssr` n'est pas nécessaire
  (site statique) — session en `localStorage`, clé `anon` publique (c'est
  son rôle), RLS comme seule barrière. Aucune clé service côté client.
- **Mobile** : `supabase-js` avec adaptateur de stockage
  **expo-secure-store** (réintroduit ici — il avait été retiré car
  inutilisé) pour le refresh token ; AsyncStorage interdit pour les tokens.
- **Méthodes d'authentification** :
  - E-mail + mot de passe, avec vérification par code OTP (pas de lien
    magique seul : les liens e-mail passent mal sur mobile en UEMOA).
  - **Sign in with Apple** — obligatoire sur iOS dès qu'un login social
    existe (règle App Store 4.8).
  - **Google** — attendu par la majorité des utilisateurs Android.
  - Téléphone/SMS : **différé** (coût SMS + fiabilité opérateurs zone
    UEMOA à valider) ; l'architecture le permet plus tard.

### Modèle de données (Postgres, RLS `user_id = auth.uid()` partout)

```
profiles        id (= auth.users.id), display_name, experience_level
                ('debutant'|'intermediaire'|'avance'), created_at
sync_watchlist  user_id, ticker, added_at            — PK (user_id, ticker)
sync_txns       user_id, id (client), ticker, side, date, quantity,
                price, fees, updated_at              — PK (user_id, id)
sync_alerts     user_id, id (client), ticker, direction, target,
                enabled, triggered_at, updated_at    — PK (user_id, id)
```

- **Stratégie de synchro : last-write-wins par enregistrement**
  (`updated_at` client, horloge serveur en arbitre). Les stores Zustand
  actuels restent la source locale ; un module `packages/core/sync.ts`
  (pur, testé) calcule le diff push/pull. Pas de temps réel au début :
  synchro à l'ouverture, au retour au premier plan et après chaque écriture.
- **Migration au premier login** : écran « Retrouver vos données » qui
  propose d'envoyer les données locales vers le compte (opt-in explicite,
  jamais automatique — principe 2).
- **Suppression de compte dans l'app** (obligatoire App Store 5.1.1(v)) :
  Réglages > Compte > Supprimer — purge serveur + retour au mode local.

### Validation & sécurité

- Toutes les écritures passent par les mêmes validateurs purs que le
  local (`apps/mobile/src/lib/forms.ts` remonte dans
  `packages/core/validation.ts`, partagé web/mobile/serveur).
- Contraintes SQL miroir (quantity > 0, price > 0, date >= '1998-09-16').
- Rate limiting Supabase Auth par défaut + captcha (Turnstile) sur signup
  web si abus.
- Aucun secret dans le repo : URL + clé anon via `EXPO_PUBLIC_*` /
  `NEXT_PUBLIC_*`, définies en CI et EAS.

---

## 3. Écran de démarrage animé (mobile)

Objectif : 1,8 s de signature visuelle, jamais une attente ajoutée.

**Séquence** (Reanimated 4, thread UI, après le splash natif statique) :

1. **0 → 400 ms** — le monogramme « A » ambre (déjà l'identité des
   Réglages) se dessine au centre sur fond `#09090b` (stroke animé Skia,
   déjà dans les deps).
2. **400 → 900 ms** — trois chandelles miniatures (verte, rouge, verte)
   poussent sous le monogramme, en écho au produit ; léger overshoot
   `withSpring`.
3. **900 → 1300 ms** — le wordmark « Afri**Terminal** » (Terminal en
   ambre) glisse en fondu ; tagline « La BRVM, lisible. ».
4. **1300 → 1800 ms** — fondu vers l'écran d'accueil ; pendant toute la
   séquence, `fetchMarketPayload()` tourne déjà en tâche de fond — si les
   données arrivent avant la fin, on n'attend pas une frame de plus.

**Règles** : `SplashScreen.hideAsync()` seulement quand la première frame
animée est prête (pas de flash blanc) ; si `AccessibilityInfo
.isReduceMotionEnabled()`, sauter directement à l'étape 4 ; l'animation ne
rejoue qu'au lancement à froid, jamais au retour au premier plan.

**Web** : version discrète — pas de splash bloquant. Le hero de la page
d'accueil gagne la même signature (monogramme + chandelles en SVG animé
CSS ≤ 1 s, `prefers-reduced-motion` respecté), et sert aussi de hero aux
pages `/connexion` et `/inscription`.

## 4. Première ouverture — onboarding débutant

Détection : clé persistée `afriterminal-onboarding` (version du flux
incluse, pour pouvoir re-présenter un onboarding enrichi plus tard).

**Flux mobile (3 écrans + 1 question, tous passables via « Passer ») :**

| # | Écran | Contenu |
|---|---|---|
| 1 | « La BRVM, lisible » | Chandelles animées + une vraie donnée du jour (ex. indice composite) — on montre le produit, pas une illustration générique. |
| 2 | « Suivez ce qui compte » | Watchlist + alertes de prix, mention honnête : « alertes évaluées sur le cours officiel de clôture ». |
| 3 | « Vos données, votre appareil » | La promesse de confidentialité, l'export/restauration, et l'annonce du compte optionnel. |
| 4 | « Votre niveau ? » | Débutant / Intermédiaire / Avancé (un tap, modifiable dans Réglages). |

**Le choix « Débutant » active le mode débutant** (persisté dans
`useSettingsStore.experienceLevel`) :

- infobulles pédagogiques activées par défaut (le glossaire
  `packages/core/glossary.ts` existe déjà — PER, PRU, rendement…) ;
- fiche action : onglet Graphique simplifié par défaut (ligne + volume,
  pas d'indicateurs pré-cochés) ;
- portefeuille : sous-titres explicatifs sous PRU et P&L ;
- un bandeau « Comprendre cette page » relie vers la méthodologie.

Rien n'est retiré : le mode débutant *ajoute* des explications, il ne
cache pas de données (rôle 11 : rien ne doit paraître cassé ou bridé).

**Web** : pas de carrousel bloquant (anti-pattern web). À la première
visite : bannière discrète « Nouveau sur la BRVM ? Visite guidée de
2 minutes » → visite guidée en 4 étapes ancrées sur les vrais éléments
(dashboard, fiche, screener, alertes), stockée dans `localStorage`.

## 5. Création de compte & connexion — spécification visuelle

Même langage des deux côtés : fond `#09090b`, surfaces `#111113`, accent
ambre `#e2a63d`, vert/rouge marché, `tabular-nums` partout où un chiffre
apparaît. L'écran d'auth doit ressembler à AfriTerminal, pas à un template.

**Structure (mobile `app/(auth)/…`, web `/inscription` & `/connexion`) :**

1. **En-tête vivant** : le monogramme animé (réutilisé du démarrage) sur
   un fond où défile en très basse opacité un ruban de tickers réels —
   l'écran d'auth vend le produit.
2. **Carte centrale** (max 400 pt de large sur web, pleine largeur — 18 px
   de marge sur mobile) :
   - Titre : « Créer votre espace » / « Content de vous revoir » ;
   - Boutons sociaux d'abord (Apple sur iOS en premier — règle 4.8, puis
     Google), séparateur « ou par e-mail » ;
   - E-mail → mot de passe (8+ caractères, jauge de solidité sobre,
     bouton œil) → écran code OTP à 6 cases auto-avance ;
   - Erreurs inline sous le champ, en langage humain, jamais un code brut
     (règle : ne jamais exposer d'erreur interne).
3. **Pied** : « Continuer sans compte » en évidence égale (principe 1),
   liens conditions/confidentialité, bascule connexion ↔ inscription.
4. **Après inscription** : écran « Retrouver vos données » (migration
   opt-in du local vers le compte, avec récapitulatif chiffré : « 12
   valeurs suivies, 34 transactions, 3 alertes ») puis retour exactement
   là où l'utilisateur était.

**Micro-interactions** : transitions de champ 150 ms, haptique légère à la
réussite (mobile), skeleton du bouton pendant l'appel réseau, focus states
visibles au clavier (web), labels toujours visibles (pas de placeholder
seul), `textContentType`/`autocomplete` corrects pour les gestionnaires de
mots de passe, VoiceOver/TalkBack : chaque champ et erreur annoncés.

**Points d'entrée du compte** (jamais de mur) : Réglages > « Compte »,
et une invite contextuelle unique après la première action qui gagnerait
à être synchronisée (ex. 5ᵉ valeur en watchlist) — refusable et non répétée.

## 6. Découpage en phases

| Phase | Contenu | Estimation |
|---|---|---|
| A | Splash animé mobile + hero web + onboarding première ouverture + mode débutant (aucun backend — livrable seul) | 1 semaine |
| B | Projet Supabase : schéma, RLS, validation partagée `packages/core/validation.ts`, tests d'intégration | 3-4 jours |
| C | Écrans auth mobile (`app/(auth)`) : inscription, OTP, connexion, mot de passe oublié, suppression de compte | 1 semaine |
| D | Pages auth web + visite guidée web | 4-5 jours |
| E | Synchro watchlist/portefeuille/alertes (module pur + tests, migration opt-in, résolution LWW) | 1,5 semaine |
| F | Mise à jour de toute la copy confidentialité + docs + politique de confidentialité hébergée ; gates ship-readiness | 2 jours |

**Ordre imposé** : A peut shipper seule (elle améliore l'app sans compte).
B→C→D→E shippent *ensemble* (principe 3). F est un gate bloquant de E.

## 7. Risques & questions ouvertes

1. **Règle App Store 4.8** : offrir Google sans Apple = rejet iOS. Les
   deux arrivent ensemble ou pas du tout.
2. **Délivrabilité e-mail OTP en zone UEMOA** : tester Orange/MTN/Moov
   webmails tôt (Phase B) ; sinon, avancer le login téléphone.
3. **Coût Supabase** : gratuit jusqu'à ~50k MAU — un garde-fou de
   facturation et une alerte budget dès la Phase B.
4. **Expo Go vs build de dev** : Sign in with Apple exige un build natif
   (pas Expo Go). La Phase C impose donc les comptes développeur Apple/
   Google déjà listés comme no-go dans ship-readiness — les débloquer
   d'abord.
5. **RGPD/protection des données** : droit à l'effacement couvert (§2) ;
   héberger la politique de confidentialité (GitHub Pages suffit) ;
   pas de données sensibles au sens strict, mais un portefeuille est une
   donnée financière personnelle — la page doit le dire clairement.
6. **Le ruban de tickers sur l'écran d'auth** dépend des données publiques
   déjà en cache : prévoir le fallback statique (liste embarquée) pour la
   toute première ouverture hors ligne.
