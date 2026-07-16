# Déploiement web, API et facturation

WARIBA n'est plus un export statique : les callbacks Supabase, l'API de synchronisation, la suppression de compte, les notifications, l'analytics consentie et les webhooks exigent un runtime Node.js. Vercel sert aussi les JSON publics sous `https://wariba.app/data` ; le web et les apps mobiles partagent donc la même origine canonique.

## Environnements

Créer un projet Supabase dédié à WARIBA, appliquer `supabase/migrations/`, puis renseigner les variables de `.env.example` sur le runtime web. La clé `SUPABASE_SECRET_KEY` et les secrets Stripe ne doivent jamais être exposés avec un préfixe public.

Le déploiement web recommandé utilise un projet Vercel relié au dépôt avec :

- Build command : `npm run build`
- Runtime Node.js : 20 ou supérieur
- URL canonique : `NEXT_PUBLIC_SITE_URL`
- Callback Supabase : `<NEXT_PUBLIC_SITE_URL>/auth/callback`
- Webhook Stripe : `<NEXT_PUBLIC_SITE_URL>/api/webhooks/stripe`
- Webhook RevenueCat : `<NEXT_PUBLIC_SITE_URL>/api/webhooks/revenuecat`
- Webhook Resend : `<NEXT_PUBLIC_SITE_URL>/api/webhooks/resend`
- Liveness : `<NEXT_PUBLIC_SITE_URL>/api/health/live`
- Readiness Supabase : `<NEXT_PUBLIC_SITE_URL>/api/health/ready`

## Infrastructure active

Le 15 juillet 2026, les deux migrations de production ont été appliquées au projet Supabase `lxcjiocyzptrrnzvywmn` (PostgreSQL 17.6). Les 15 tables applicatives ont RLS activé et les 32 politiques d'isolation utilisateur sont installées. Le projet Vercel `prj_D7ZaxJINbUx6zC1mRDZi60TwuP4G` est configuré en Next.js et sert `https://wariba.app` ainsi que `https://www.wariba.app`.

Les commits de données créés par GitHub Actions sur `main` déclenchent la
même intégration Git Vercel que les commits applicatifs. Le script de
prébuild `scripts/sync-public-data.mjs` publie `data/real` et `data/news`
sous `/data` et produit un hash `version.json`. GitHub Pages a été retiré :
il doublonnait l'hébergement sans apporter de fraîcheur supplémentaire.
L'app mobile conserve le dépôt GitHub brut comme secours si `wariba.app`
est temporairement indisponible.

Les clés legacy anon et `service_role` valides sont installées sur Vercel, respectivement dans les variables publique et serveur. La readiness Supabase répond 200. Un test de production jetable a validé création admin sans e-mail, connexion mot de passe, lecture RLS de `/api/v1/me`, confirmation obligatoire de suppression, suppression par l'API WARIBA et cascades à zéro. La configuration des URLs de site/redirects Supabase doit encore être confirmée dans le Dashboard pour les e-mails, OTP et OAuth web/mobile. Ne jamais placer la clé secrète dans une variable `NEXT_PUBLIC_*` ou `EXPO_PUBLIC_*`.

`CRON_SECRET`, `OPS_SECRET`, `RATE_LIMIT_HASH_SECRET` et `ANALYTICS_HASH_SECRET` doivent être des secrets indépendants d'au moins 32 caractères. Vercel appelle les deux routes de `vercel.json` avec `Authorization: Bearer <CRON_SECRET>`. La route `/api/ops/metrics` exige de la même façon `OPS_SECRET` et ne retourne que des agrégats.

## Stripe web

Créer le produit Pro et son prix mensuel, renseigner `STRIPE_PRICE_PRO_MONTHLY`, puis écouter au minimum :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Le webhook doit utiliser le secret de signature propre à l'environnement. Checkout et portail client sont réservés au web.

## Push, e-mail et analytics

Lier le projet EAS puis injecter son UUID dans `EXPO_PUBLIC_EAS_PROJECT_ID`. Activer l'accès sécurisé Expo et placer son jeton serveur dans `EXPO_ACCESS_TOKEN`. Les apps demandent l'autorisation système, obtiennent le jeton Expo avec le project ID et l'enregistrent pour l'utilisateur connecté. Le cron `alerts` évalue les seuils après la séance ; le cron `receipts`, 30 minutes plus tard, traite les reçus et les retries.

Configurer un domaine d'envoi Resend, `RESEND_FROM`, `RESEND_API_KEY` et le webhook signé `RESEND_WEBHOOK_SECRET`. Écouter au minimum `email.delivered`, `email.failed`, `email.bounced`, `email.complained` et `email.suppressed`. Les bounces/complaints désactivent automatiquement l'e-mail du profil.

L'analytics est strictement first-party et ne démarre qu'après acceptation. Il faut aussi l'activer explicitement dans les builds avec `NEXT_PUBLIC_ANALYTICS_ENABLED=true` et `EXPO_PUBLIC_ANALYTICS_ENABLED=true`. Les identifiants locaux sont HMAC-hashés côté serveur, les IP brutes ne sont jamais persistées et la purge automatique supprime les événements après 90 jours.

## iOS et Android

La procédure complète, dans l’ordre exact des comptes et validations pour la
Côte d’Ivoire, est disponible dans
[Lancement natif WARIBA — Côte d’Ivoire](./native-release-cote-ivoire.md).

Les builds natifs utilisent `EXPO_PUBLIC_API_URL` pour l'API Node et les variables Supabase publiques. Apple et Google imposent leurs achats intégrés pour les fonctions numériques vendues dans les apps : aucun lien Stripe n'est affiché dans les builds natifs.

Créer les produits Pro dans App Store Connect et Play Console, les relier à l'entitlement RevenueCat `pro`, publier une offering courante, puis configurer les clés publiques Apple/Google dans le build. Le SDK charge les offres, achète, restaure et ouvre la gestion d'abonnement. Le serveur revalide le subscriber auprès de RevenueCat avant d'écrire les droits et le webhook utilise `REVENUECAT_WEBHOOK_AUTH` comme valeur exacte de l'en-tête `Authorization`.

## Vérification avant production

Exécuter les gates de `.github/workflows/ci.yml`, appliquer la migration sur un projet de préproduction, tester connexion/OTP/OAuth, puis la réconciliation automatique sur web/iOS/Android avec modifications concurrentes, suppression, hors-ligne et reprise. Vérifier aussi Checkout/portail Stripe, achat/restauration RevenueCat, notifications push/e-mail avec reçus et bounces, consentement analytics sur les trois surfaces, renouvellement/annulation des webhooks et suppression de compte avec une connexion récente. L'ancien en-tête `X-Sync-Mode: replace` doit rester rejeté par l'API afin d'empêcher tout écrasement destructif depuis un client obsolète.
