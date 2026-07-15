# WARIBA — plan Comptes, Onboarding & Écrans d'accueil (app + web)

Statut : **Phases A→F implémentées et identité WARIBA 2026 livrée le
2026-07-15** — onboarding, auth web/mobile, RLS, API de synchronisation,
suppression de compte, confidentialité, icônes et splash. Supabase et le
runtime Node sont actifs sur `wariba.app` ; OAuth, paiement store, builds
signés et QA physique restent des gates externes.

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
3. **Pas de contrôle qui ment** (rôle 2, PM) : les actions compte restent
   désactivées si les variables publiques Supabase du build sont absentes.
4. **Les cours restent publics.** L'authentification ne protège que les
   données *de l'utilisateur*, jamais les données de marché.

## 2. Architecture retenue

**Backend : Supabase** (Auth + Postgres + Row Level Security).

Le site utilise maintenant un runtime Next.js Node : les clients Supabase
gèrent la session, tandis que les routes `/api/v1/*` centralisent validation,
limites de forfait, suppression et synchronisation. RLS reste la barrière
de propriété finale. GitHub Pages ne publie plus que les JSON publics pour
l'app mobile.

- **Web** : `@supabase/supabase-js` + `@supabase/ssr`, clé publishable côté
  client, cookies rafraîchis par middleware et validation du Bearer token
  dans chaque route API. Aucune clé service côté client.
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
profiles, watchlists, watchlist_items, portfolio_transactions,
price_alerts, saved_filters, user_preferences, device_push_tokens,
subscriptions, entitlements, billing_webhook_events
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

1. **0 → 450 ms** — le W-signal jade se trace au centre sur fond
   obsidienne `#06110d` avec Skia.
2. **420 → 780 ms** — le point-origine or apparaît au sommet du signal,
   avec un overshoot très court.
3. **700 → 1200 ms** — le wordmark espacé « WARIBA » glisse en fondu ;
   tagline « LA BRVM, CLAIREMENT. ».
4. **1300 → 1800 ms** — fondu vers l'écran d'accueil ; pendant toute la
   séquence, `fetchMarketPayload()` tourne déjà en tâche de fond — si les
   données arrivent avant la fin, on n'attend pas une frame de plus.

**Règles** : `SplashScreen.hideAsync()` seulement quand la première frame
animée est prête (pas de flash blanc) ; si `AccessibilityInfo
.isReduceMotionEnabled()`, sauter directement à l'étape 4 ; l'animation ne
rejoue qu'au lancement à froid, jamais au retour au premier plan.

**Web** : version discrète — pas de splash bloquant. Le hero de la page
d'accueil gagne la même signature (W-signal + point-origine en SVG animé
CSS ≤ 1 s, `prefers-reduced-motion` respecté), et sert aussi de hero aux
pages `/connexion` et `/inscription`.

## 4. Première ouverture — onboarding débutant

Détection : version persistée dans les réglages locaux (version du flux
incluse, pour pouvoir re-présenter un onboarding enrichi plus tard).

**Flux mobile (3 écrans + 1 question, tous passables via « Passer ») :**

| # | Écran | Contenu |
|---|---|---|
| 1 | « La BRVM devient une décision » | Vraie donnée du BRVM Composite et signal de marché. |
| 2 | « Suivez moins. Comprenez mieux. » | Watchlist, portefeuille et alertes sur clôture officielle. |
| 3 | « Votre espace reste le vôtre » | Mode invité local et synchronisation chiffrée opt-in. |
| 4 | « Commencez à votre rythme » | Niveau Guidé/Investisseur/Expert, puis boutons Créer un compte, Se connecter et Explorer sans compte. |

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

Même langage des deux côtés : fond obsidienne `#06110d`, surfaces végétales
`#0a1812` / `#10241a`, signal jade `#34d98f`, point or `#f4c96b`,
vert/rouge marché et `tabular-nums` partout où un chiffre
apparaît. L'écran d'auth doit ressembler à WARIBA, pas à un template.

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

**Points d'entrée du compte** (jamais de mur) : boutons Connexion/Inscription
permanents dans le header web ; onboarding mobile ; bandeau de l'accueil
mobile ; écran Plus ; Réglages > Compte. L'invite reste refusable.

## 6. Découpage en phases

| Phase | Contenu | Estimation |
|---|---|---|
| A | ✅ Livrée (2026-07-13) — splash animé mobile (Skia + Reanimated, reduced-motion), onboarding 3 écrans + niveau, mode débutant (lexique, graphique épuré, pédagogie PRU), signature SVG + visite guidée web | 1 semaine |
| B | ✅ Migration Supabase, contraintes, RLS, entitlements et validation partagée | Implémentée ; application staging en attente |
| C | ✅ Auth mobile : email/mot de passe, OTP, Apple, Google, compte/suppression | Implémentée ; credentials/build signé en attente |
| D | ✅ Auth web : connexion, inscription, callback et espace compte | Runtime production actif sur wariba.app ; callback OAuth à prouver |
| E | ✅ Synchro opt-in watchlists/portefeuille/alertes/filtres/préférences + LWW | Implémentée ; test multi-appareils en attente |
| F | ✅ Confidentialité, conditions, support, pricing et gates | Implémentée ; URLs hébergées en attente |

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
