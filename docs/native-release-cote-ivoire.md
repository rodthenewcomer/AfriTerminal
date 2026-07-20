# Lancement natif WARIBA — Côte d’Ivoire

Dernière vérification : 20 juillet 2026

Ce document est la procédure de référence pour publier WARIBA sur iPhone et
Android en Côte d'Ivoire. Les faits de marché restent gratuits et publics ;
WARIBA Pro exige désormais un compte et un entitlement commun au web, à iOS et
à Android. Stripe reste web-only. Les produits stores et RevenueCat doivent être
validés avant d'activer l'achat natif, sans bloquer l'usage public de l'app.

## État réel du projet

| Élément | État au 16 juillet 2026 | Preuve de fin |
| --- | --- | --- |
| Code iOS/Android | Prêt, Expo SDK 54 | Exports iOS/Android et tests locaux passent |
| Identifiants natifs | Figés | Scheme `wariba://`, bundle/package `app.wariba.mobile` |
| Compte Expo/EAS | Non connecté sur ce poste | `eas whoami` retourne le compte de l’organisation et `eas project:info` retourne le projet WARIBA |
| Apple Developer/App Store Connect | Accès non fourni | Lancement gratuit : organisation active, app créée et fiche complète ; accords/taxe/banque après lancement |
| Google Play Console | Accès non fourni | Lancement gratuit : organisation vérifiée, app créée et déclarations complètes ; paiements après lancement |
| RevenueCat | Code et gate intégrés, achat non activé | Deux apps connectées, entitlement `pro`, offering courante et webhook validés avant toute CTA d'achat |
| Builds signés | À produire | Build EAS preview sur appareils physiques puis builds production `.ipa`/`.aab` |
| Publication gratuite | Bloquée par comptes propriétaires, builds signés et QA physique | TestFlight et Play Internal Testing validés, puis review stores acceptée |

Le site et l’API restent sur **Vercel** à `https://wariba.app`. EAS sert à
compiler et signer les apps ; App Store Connect et Play Console les distribuent ;
RevenueCat unifie leurs abonnements. Aucun de ces services ne remplace Vercel.

## Ordre obligatoire — lancement gratuit

1. Constituer le dossier légal unique et demander/vérifier le D‑U‑N‑S.
2. Ouvrir Apple Developer **Organization** et Google Play **Organization**.
3. Créer une organisation Expo appartenant à WARIBA, puis lier le projet EAS.
4. Créer l’app dans App Store Connect et Play Console avec
   `app.wariba.mobile`.
5. Installer les variables EAS nécessaires au build gratuit.
6. Produire les builds signés et tester sur appareils physiques.
7. Remplir confidentialité, Data safety, finance et notes de review, puis
    soumettre.

Avant d'activer l'achat Pro natif : accepter les accords payants, valider
taxe/banque, créer les produits Apple/Google, puis connecter RevenueCat et
tester les achats. RevenueCat importe des produits qui doivent déjà exister
dans les stores et Google exige un `.aab` signé avant certains tests d'achat.

## 1. Dossier légal unique Côte d’Ivoire

Ne jamais utiliser seulement « WARIBA » si ce n’est pas la raison sociale
enregistrée. Remplacer les placeholders ci-dessous par les informations qui
figurent **exactement** sur les documents officiels.

| À préparer | Valeur attendue |
| --- | --- |
| Raison sociale | `[RAISON_SOCIALE_LEGALE]`, même orthographe partout |
| Adresse légale | `[ADRESSE_LEGALE_CI]`, identique au RCCM et au profil de paiement |
| D‑U‑N‑S | Numéro à 9 chiffres rattaché à cette même entité et adresse |
| Immatriculation | RCCM/extrait du registre, certificat d’enregistrement ou licence commerciale |
| Fiscalité | Numéro fiscal/TIN et certificat fiscal disponibles |
| Représentant autorisé | Pièce d’identité gouvernementale avec photo et preuve qu’il peut engager la société |
| Banque | Compte de paiement au nom de la même entité, capable de recevoir le mode de virement proposé dans chaque console |
| Domaine public | `https://wariba.app`, fonctionnel et au nom du produit |
| E-mails à créer | `developer@wariba.app`, `support@wariba.app`, `legal@wariba.app` ou équivalents réels |
| Téléphone | Numéro professionnel contrôlé par l’organisation et vérifiable |

Pour Google Play en Côte d’Ivoire, le dossier d’une organisation comprend un
document d’enregistrement de la société et la pièce d’identité du représentant.
Les valeurs doivent correspondre au profil Google Payments. Pour Apple, le
D‑U‑N‑S, le site public, un e-mail lié au domaine et l’autorité du représentant
sont nécessaires à l’enrôlement d’une organisation.

Sécurité des comptes : activer la MFA, enregistrer deux administrateurs réels,
conserver les codes de récupération dans le coffre de l’entreprise et bannir
les comptes partagés. Le propriétaire légal reste à WARIBA ; les développeurs
reçoivent des rôles, pas le mot de passe du propriétaire.

## 2. Compte Apple — organisation

### Création

1. Créer un Apple Account avec l’e-mail professionnel du responsable et activer
   l’authentification à deux facteurs.
2. Sur Apple Developer, choisir **Organization**, jamais Individual. En compte
   individuel, le nom personnel serait affiché comme vendeur ; en organisation,
   c’est la raison sociale vérifiée.
3. Saisir le D‑U‑N‑S, la raison sociale, l’adresse, le site et le téléphone
   exactement comme dans le dossier unique.
4. Le représentant doit confirmer qu’il a le pouvoir d’engager la société et
   fournir tout document demandé par Apple.
5. Régler l’Apple Developer Program : **99 USD par an** ou équivalent local
   proposé par Apple.

Un D‑U‑N‑S nouvellement créé ou corrigé peut demander jusqu’à deux jours
ouvrés avant d’être reconnu par Apple. Ne pas recréer une seconde entité pour
contourner ce délai.

### App Store Connect et paiements — après lancement uniquement

Cette sous-section ne bloque pas la publication gratuite. Elle devient
obligatoire avant d'activer un achat intégré ou un paywall.

Dans **Business** :

1. L’Account Holder signe le **Paid Apps Agreement**.
2. Renseigner les formulaires fiscaux proposés. Pour une entité hors États-Unis,
   Apple oriente notamment vers le formulaire américain approprié.
3. Ajouter le compte bancaire principal et attendre que l’accord, la fiscalité
   et la banque soient validés. Les achats intégrés ne doivent pas être testés
   avant que cette configuration soit active/« Clear ».
4. Inviter ensuite les opérateurs avec les rôles Admin/App Manager/Finance
   nécessaires. Ne pas partager l’Account Holder.

### Créer l’app iOS

Dans **My Apps → + → New App** :

| Champ | Valeur WARIBA |
| --- | --- |
| Platforms | iOS |
| Name | WARIBA |
| Primary language | French |
| Bundle ID | `app.wariba.mobile` |
| SKU interne | `wariba-ios-001` |
| Catégorie principale | Finance |
| Support URL | `https://wariba.app/support` |
| Privacy Policy URL | `https://wariba.app/privacy` |
| Marketing URL | `https://wariba.app` |

Commencer la disponibilité par la Côte d’Ivoire. Ajouter d’autres pays UEMOA
seulement après vérification des droits de données, de la fiscalité et du cadre
réglementaire applicable dans chacun.

## 3. Compte Google Play — organisation Côte d’Ivoire

### Création et vérification

1. Créer un Google Account professionnel dédié, avec MFA et un second
   administrateur de secours.
2. Dans Play Console, choisir **Organization**. Google recommande ce type de
   compte pour les produits financiers et exige alors un D‑U‑N‑S.
3. Accepter les contrats et régler les **25 USD une seule fois**. Lier le
   profil Google Payments d’organisation lorsqu'il est demandé pour la
   vérification ; sa configuration marchande et bancaire reste une étape de
   monétisation après lancement.
4. Entrer raison sociale, adresse, téléphone, site, D‑U‑N‑S et contacts sans
   aucune variation par rapport au dossier légal.
5. Charger pour la Côte d’Ivoire : document d’enregistrement/RCCM/certificat
   fiscal accepté et pièce d’identité du représentant autorisé.
6. Après le lancement gratuit, avant toute vente, ajouter le compte bancaire
   depuis **Settings → Payments settings**. Il doit
   être dans le même pays/région que le compte marchand et recevoir le mode de
   paiement proposé. Si le dashboard ne propose pas le compte ivoirien prévu,
   arrêter et contacter le support Google ; ne pas déclarer un autre pays.
7. Ajouter le TIN ivoirien dans le profil de paiement lorsqu’il est demandé.

### Créer l’app Android

Dans **Create app** :

| Champ | Valeur WARIBA |
| --- | --- |
| App name | WARIBA |
| Default language | French – fr-FR |
| App or game | App |
| Free or paid | Free, avec abonnements intégrés |
| Package name au premier `.aab` | `app.wariba.mobile` |
| Category | Finance |
| Privacy policy | `https://wariba.app/privacy` |
| Account deletion URL | `https://wariba.app/account-deletion` |
| Developer/support website | `https://wariba.app` / `https://wariba.app/support` |

Activer **Play App Signing** lors du premier chargement. Le package name est
une identité durable : ne plus le modifier après le premier artefact publié.

Dans **Policy and programs → App content** :

- compléter Data safety d’après le comportement réel : compte/e-mail,
  synchronisation privée optionnelle, historique d’achat reçu des stores,
  notifications et analytics first-party uniquement après consentement ;
- déclarer le chiffrement en transit, la suppression dans l’app et l’URL web ;
- compléter obligatoirement **Financial features**. WARIBA possède un outil de
  portefeuille : sélectionner la catégorie correspondant à **Stock trading and
  portfolio management**, puis préciser dans la fiche et les notes qu’il
  n’exécute aucun ordre, ne détient aucun fonds et ne fournit aucun conseil
  personnalisé ;
- répondre exactement aux déclarations publicité, audience, accès à l’app et
  permissions sensibles après analyse du `.aab` final.

## 4. Compte Expo et projet EAS

Créer une **Expo Organization** détenue par l’entité WARIBA. Le compte personnel
d’un développeur ne doit pas être le propriétaire final du projet.

Depuis la racine de l’app mobile :

```bash
cd apps/mobile
npm install -g eas-cli@latest
eas login
eas whoami
eas init
eas project:info
```

Lors de `eas init`, sélectionner l’organisation WARIBA et le projet `wariba`.
La commande doit lier le projet et créer son UUID. Reporter cet UUID dans
`EXPO_PUBLIC_EAS_PROJECT_ID`. Les profils du dépôt sont déjà associés aux
environnements EAS `preview` et `production`.

Le plan Expo gratuit permet de démarrer avec une quantité limitée de builds à
priorité basse. Un plan payant n’est utile que si les files/quotas ralentissent
les tests ; il ne remplace jamais les adhésions Apple et Google.

### Credentials de signature

```bash
cd apps/mobile
eas credentials --platform ios
eas credentials --platform android
```

Pour la première version, laisser EAS générer/gérer le certificat de
distribution iOS, le provisioning profile, la clé APNs et l’upload keystore
Android, puis activer Play App Signing dans Google. Télécharger une sauvegarde
du keystore dans le coffre sécurisé de l’entreprise. Ne jamais committer
`credentials.json`, `.jks`, `.p8`, `.p12`, `.mobileprovision` ou une clé JSON.

Pour les soumissions automatiques, créer des credentials dédiés :

- une clé App Store Connect API réservée à EAS Submit ;
- un service account Google réservé à EAS Submit, distinct de RevenueCat.

La première soumission Android doit être chargée manuellement dans Play
Console ; les suivantes peuvent passer par `eas submit`.

## 5. Catalogue d’abonnements stores

> **Activation commerciale séparée.** Le gate Pro est déjà actif, mais aucune
> offre d'achat native ne doit être affichée avant validation des produits et
> des parcours sandbox. Les identifiants restent documentés pour éviter une
> divergence entre le code, Apple, Google et RevenueCat.

Le code ne dépend pas d’un product ID : il affiche les packages de l’offering
RevenueCat courante. Les identifiants ci-dessous sont la convention recommandée
et doivent être approuvés avant création, car les IDs stores sont durables.

| Offre | Apple product ID | Google subscription ID | RevenueCat package | Prix cible CI |
| --- | --- | --- | --- | --- |
| Pro mensuel — lancement | `app.wariba.pro.monthly` | `wariba_pro_monthly` | `$rc_monthly` | 3 000 FCFA/mois ou palier local le plus proche |
| Pro annuel — option après validation | `app.wariba.pro.annual` | `wariba_pro_annual` | `$rc_annual` | 30 000 FCFA/an ou palier local le plus proche |

### Apple

1. App Store Connect → WARIBA → Subscriptions → créer le groupe `WARIBA Pro`.
2. Créer le produit mensuel, nom français `WARIBA Pro mensuel`, durée un mois.
3. Ajouter description, prix Côte d’Ivoire, localisation française et capture
   de review montrant la page de souscription.
4. Créer un Sandbox Tester qui n’utilise pas un Apple Account de production.

### Google

1. Play Console → WARIBA → Monetize → Products → Subscriptions.
2. Créer `wariba_pro_monthly`, puis un base plan auto-renouvelable `monthly`.
3. Activer la Côte d’Ivoire, définir le prix local, taxes et période de grâce
   selon la politique commerciale validée.
4. Charger d’abord un `.aab` signé sur **Internal testing**, ajouter les
   license testers et publier la release interne avant le test d’achat.

Ne jamais afficher un prix FCFA codé en dur dans l’app native : le SDK affiche
`priceString`, donc le prix réel et la devise rendus par le store du client.

## 6. RevenueCat

Créer un projet d’équipe `WARIBA Production`, puis :

1. Ajouter l’app iOS avec `app.wariba.mobile` et récupérer sa clé publique
   `appl_…`.
2. Ajouter l’app Android avec `app.wariba.mobile` et récupérer sa clé publique
   `goog_…`.
3. Importer les produits Apple et Google.
4. Créer l’entitlement **`pro`** — ce nom est déjà utilisé côté app et serveur.
5. Attacher les produits mensuels à `pro`.
6. Créer une offering `default`, y attacher `$rc_monthly`, puis la marquer
   **Current**. Sans offering courante, l’écran affiche « Aucune offre ».

### Connexion Apple → RevenueCat

Dans App Store Connect, créer et transmettre à RevenueCat :

- l’In-App Purchase Key exigée pour StoreKit 2 ;
- les informations de clé App Store Connect nécessaires à l’import des
  produits/prix ;
- l’app-specific shared secret si demandé par la configuration de receipts.

Créer des clés dédiées à RevenueCat et ne jamais les réutiliser dans le bundle
mobile.

### Connexion Google → RevenueCat

Créer un projet Google Cloud dédié et un service account
`revenuecat-service-account`. Activer :

- Google Play Android Developer API ;
- Google Play Developer Reporting API ;
- Cloud Pub/Sub API.

Dans Google Cloud, attribuer à ce service account les rôles Pub/Sub Editor et
Monitoring Viewer. Dans Play Console → Users and permissions, limiter l’accès à
WARIBA et accorder seulement :

- View app information and download bulk reports (read-only) ;
- View financial data, orders, and cancellation survey responses ;
- Manage orders and subscriptions.

Télécharger temporairement la clé JSON, la charger directement dans RevenueCat,
puis la supprimer du poste. Elle ne doit pas entrer dans Git, EAS ou Vercel.
La validation Google peut prendre jusqu’à 36 heures.

### Notifications temps réel

1. Depuis les réglages Google de l’app RevenueCat, créer/choisir le topic
   Pub/Sub proposé.
2. Coller le topic dans Play Console → Monetization setup → Real-time developer
   notifications.
3. Sélectionner abonnements, achats annulés et produits ponctuels, sauvegarder,
   puis envoyer une notification de test.
4. Vérifier dans RevenueCat un timestamp récent `Last received`.
5. Configurer ensuite RevenueCat → Integrations → Webhooks :
   `https://wariba.app/api/webhooks/revenuecat`.
6. Définir exactement la valeur `Authorization` générée pour
   `REVENUECAT_WEBHOOK_AUTH`, envoyer sandbox + production, puis exécuter un
   événement test. Le endpoint WARIBA est déjà authentifié et idempotent.

Le fonctionnement de production requiert un plan RevenueCat qui inclut les
webhooks. Vérifier le plan au moment de l’activation plutôt que de supposer un
tarif.

## 7. Variables : où placer chaque valeur

Tout `EXPO_PUBLIC_*` est lisible dans le binaire et doit être traité comme
public. Les clés secrètes restent uniquement côté serveur Vercel/RevenueCat.

### EAS — environnements `preview` puis `production`

Créer les mêmes noms dans Expo Dashboard → Project settings → Environment
variables. Exemples pour production :

```bash
cd apps/mobile
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://wariba.app
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SITE_URL --value https://wariba.app
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value https://lxcjiocyzptrrnzvywmn.supabase.co
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value '[CLE_PUBLIQUE_SUPABASE]'
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY --value 'appl_[CLE_PUBLIQUE]'
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY --value 'goog_[CLE_PUBLIQUE]'
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID --value pro
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_EAS_PROJECT_ID --value '[UUID_EAS]'
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ANALYTICS_ENABLED --value true
eas env:list --environment production
```

Répéter pour `preview` avec un backend de staging lorsqu’il existe. Ne jamais
pointer une app preview destructrice vers des données utilisateur de production.

### Vercel — serveur uniquement

Ajouter aux environnements Preview/Production concernés :

```text
REVENUECAT_SECRET_API_KEY=sk_...
REVENUECAT_ENTITLEMENT_ID=pro
REVENUECAT_WEBHOOK_AUTH=Bearer <valeur-longue-aleatoire>
EXPO_ACCESS_TOKEN=<jeton-serveur-expo>
```

Après modification, redéployer Vercel. Ne jamais préfixer ces secrets avec
`NEXT_PUBLIC_` ou `EXPO_PUBLIC_`. Les valeurs Stripe restent web-only et ne
doivent pas être ajoutées à l’app native.

## 8. Builds et soumissions

### Preview signé et QA physique

```bash
cd apps/mobile
eas build --platform all --profile preview
eas build:list
```

Installer sur un iPhone physique et un Android utilisé en Côte d’Ivoire. Valider
réseau mobile local, mode sombre/clair, taille de police, notifications, liens
`wariba://`, connexion Apple/Google, synchronisation hors-ligne et graphiques.

### Production

```bash
cd apps/mobile
eas build --platform all --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Pour Android, effectuer d’abord le premier upload `.aab` manuellement sur la
piste Internal testing. Pour iOS, EAS Submit envoie le build à App Store Connect,
mais il faut encore remplir la fiche, choisir le build et lancer la review.

## 9. Matrice de tests d’abonnement

Exécuter chaque scénario sur TestFlight et Play Internal Testing avec des
comptes sandbox/licence testers, jamais avec un achat réel non maîtrisé.

| Test | Résultat attendu |
| --- | --- |
| Affichage offre | Prix/devise viennent du store ; aucun lien Stripe natif |
| Achat mensuel | RevenueCat active `pro`, l’API WARIBA reflète Pro |
| Restauration après réinstallation | Le même compte WARIBA récupère `pro` |
| Connexion web après achat mobile | Le serveur réconcilie le même entitlement |
| Annulation | Accès maintenu jusqu’à expiration, puis retour Free |
| Échec de paiement | Statut cohérent, aucune prolongation inventée |
| Remboursement | Notification store → RevenueCat → webhook WARIBA |
| Webhook doublé/hors ordre | Pas de double droit ; état relu depuis RevenueCat |
| Transfert/connexion à un autre compte | Pas de fuite de droit entre utilisateurs |
| Suppression de compte | Données WARIBA supprimées ; abonnement store à résilier séparément et expliqué |

Conserver pour la preuve de release : build IDs EAS, versions, appareils/OS,
comptes sandbox, captures des résultats RevenueCat, timestamp du webhook, issues
et correctifs.

## 10. Positionnement finance et fiche store

Texte de review recommandé :

> WARIBA est un terminal d’information sur la BRVM et un outil de suivi de
> portefeuille. L’app n’exécute aucun ordre, ne reçoit ni ne conserve des fonds,
> ne fournit pas de conseil personnalisé et n’est pas affiliée à la BRVM. Les
> cours peuvent être différés. Les fonctions Pro sont des outils numériques et
> utilisent exclusivement les achats intégrés Apple/Google dans l’app.

Pour Apple, fournir un compte de review actif ou un mode suffisamment complet,
expliquer la souscription et garder le backend accessible pendant la review.
Les guidelines Apple demandent que les apps de trading/investissement soient
portées par l’entité autorisée et disposent des permissions locales. Avant
monétisation publique ou ajout d’exécution/conseil, obtenir une validation
juridique ivoirienne/UEMOA, notamment sur le périmètre AMF‑UMOA et les droits de
redistribution BRVM.

La langue principale est le français, la zone de lancement la Côte d’Ivoire et
le contexte monétaire le FCFA. Les captures doivent utiliser des données
réelles, actuelles et attribuées, sans promesse de gain ni faux « temps réel ».

## 11. Critère final go/no-go — lancement gratuit

La release reste **NO-GO** tant qu’une seule case manque :

- [ ] Raison sociale, RCCM/TIN, adresse et D‑U‑N‑S cohérents.
- [ ] Apple Organization actif et application créée.
- [ ] Google Organization vérifié pour la Côte d’Ivoire et application créée.
- [ ] Expo Organization propriétaire ; `eas project:info` correct.
- [ ] Apps Apple/Google créées avec `app.wariba.mobile`.
- [ ] Variables EAS et secrets Vercel installés sans secret dans Git.
- [ ] Preview physique iPhone/Android validée.
- [ ] Privacy/Data safety/Financial features/remplissage App Privacy cohérents.
- [ ] Support, confidentialité, conditions et suppression de compte accessibles.
- [ ] Notes de review, captures et compte reviewer prêts.
- [ ] Validation juridique/droits de données obtenue avant monétisation.

### Gate séparé — activation des achats natifs

- [ ] Paid Apps/taxe/banque Apple et profil Google Payments validés.
- [ ] Produit mensuel actif dans les deux stores.
- [ ] RevenueCat : apps, `pro`, offering Current, Apple key, Google credentials,
      RTDN et webhook tous verts.
- [ ] Achat, restauration, annulation, remboursement et cross-login validés.
- [ ] Aucun accès Pro n'est fermé avant le feu vert produit et juridique.

## Sources officielles

- [Apple — enrollment d’une organisation et D‑U‑N‑S](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Apple — coût et type de membership](https://developer.apple.com/support/compare-memberships/)
- [Apple — accords payants](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)
- [Apple — fiscalité et banque](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- [Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google — choisir Organization pour les services financiers](https://support.google.com/googleplay/android-developer/answer/13634885?hl=fr)
- [Google — documents de vérification Côte d’Ivoire](https://support.google.com/googleplay/android-developer/answer/15633622?co=GENIE.CountryCode%3DCI&hl=en)
- [Google — déclaration des fonctions financières](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en)
- [Google — Data safety et suppression de compte](https://support.google.com/googleplay/android-developer/answer/13327111?hl=fr)
- [Expo — référence SDK 54 utilisée par WARIBA](https://docs.expo.dev/versions/v54.0.0/)
- [Expo — création d’un build EAS](https://docs.expo.dev/build/setup/)
- [Expo — variables d’environnement EAS](https://docs.expo.dev/eas/environment-variables/)
- [Expo — soumission aux stores](https://docs.expo.dev/deploy/submit-to-app-stores/)
- [RevenueCat — produits et entitlement](https://www.revenuecat.com/docs/getting-started/entitlements)
- [RevenueCat — credentials App Store](https://www.revenuecat.com/docs/store-configuration/app-store/service-credentials-index)
- [RevenueCat — credentials Google Play](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials)
- [RevenueCat — notifications Google en temps réel](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications)
- [RevenueCat — webhooks](https://www.revenuecat.com/docs/integrations/webhooks)
