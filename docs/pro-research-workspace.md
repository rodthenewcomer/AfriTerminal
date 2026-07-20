# WARIBA Pro — audit du classeur 48 actions et décision produit

Dernière mise à jour : 20 juillet 2026

## Décision

WARIBA Pro est un laboratoire de recherche factuelle réservé à un compte ayant
un entitlement Pro actif. Les faits de marché, fiches, fondamentaux,
actualités, documents, dividendes et screener essentiel restent publics. La
valeur payante vient du workflow — classement, filtres multi-facteurs,
comparaison et export — pas de la fermeture des données essentielles.

Le classeur `Analyse_48_actions_BRVM_2026-07-15.xlsx` a été audité comme une
source d'idées et de contrôle. Ses scores et verdicts ne sont pas importés dans
le produit : WARIBA recalcule les 48 actions depuis les JSON réels et le moteur
`WARIBA Factuel v1.1` partagé par le web, le web mobile, iOS et Android.

## Audit feuille par feuille

### 1. Dashboard

- Instantané daté du 15 juillet 2026.
- Synthèse : 10 dossiers dits « achetables », 9 « à éviter », 6
  « spéculatifs/FOMO » et 5 dossiers à données anciennes.
- Top 10, alertes rouges, lecture stratégique et graphique unique.
- Risque produit : les mots « achat », « accumulation » et « éviter » sont
  prescriptifs et incompatibles avec le positionnement informatif de WARIBA.
- Risque UX : le graphique compare surtout des cours de niveaux très différents,
  pas des scores ou facteurs normalisés ; les grands cours dominent la lecture.

### 2. Classement 48

- 48 lignes et 33 colonnes : identité, pays, secteur, cours, variations,
  valorisation, rendement, volume, exercice, croissance, facteurs, confiance,
  verdict, thèse, risques et sources.
- Bonne idée conservée : une seule vue de l'univers avec facteurs comparables,
  fraîcheur et provenance.
- Idée rejetée : transformer le score en recommandation ou mélanger confiance,
  FOMO et décision d'achat dans une même cellule.
- Limite : la densité Excel est illisible sur téléphone et la comparaison
  multi-titres n'est pas interactive.

### 3. Données brutes

- 48 lignes et 28 colonnes d'entrées de marché et de fondamentaux.
- Les sources de marché, financières et PDF sont présentes, ce qui est utile
  pour l'audit.
- Les cellules vides doivent rester absentes : WARIBA ne les remplace jamais
  par une estimation.
- Cette feuille reste une photographie ; elle ne prouve pas une actualisation
  automatique ni la cohérence avec la prochaine publication annuelle.

### 4. Méthodologie

- Formule du classeur : 38 % Qualité, 27 % Valorisation, 15 % Momentum,
  10 % protection au Risque et 10 % rendement récent.
- P/B et ROE sont explicitement approximatifs dans certaines lignes.
- Le document prévient que les rendements peuvent être anciens ou
  exceptionnels et que les derniers rapports peuvent modifier l'analyse.
- Aucune cellule du classeur ne contient de formule : scores, rangs, verdicts
  et graphiques sont des valeurs statiques, pas un modèle recalculable.

## Écart avec le moteur publié

| Sujet | Classeur | WARIBA en production |
| --- | --- | --- |
| Calcul | Valeurs statiques | Recalcul automatique depuis cours + fondamentaux réels |
| Pondérations | 38/27/15/10/10 | 35 % Qualité, 20 % Valorisation, 25 % Momentum, 20 % protection |
| Rendement | Facteur global séparé | Composant de Valorisation, avec absence respectée |
| Sortie | Achat/attendre/éviter | Position relative, raisons et limites |
| Confiance | Colonne synthétique | Couverture, benchmark, périodes et retard d'exercice expliqués |
| Surfaces | Excel desktop | Web responsive, iOS et Android |
| Mise à jour | Manuelle | Pipeline de données puis rebuild Vercel et refresh clients |

Conclusion : le fichier valide l'intérêt commercial d'une vue 48 actions,
mais ne doit pas devenir la source d'exécution. Les deux formules ne doivent
jamais coexister sous le même nom. La formule publique de WARIBA reste l'unique
référence affichée.

## Fonctionnalités livrées

- 48 actions couvertes avec score global, quatre piliers et deux scores complémentaires Dividende/Liquidité.
- Recherche par ticker ou société, filtre secteur et filtre confiance.
- Tri Qualité, Valorisation, Momentum, protection et YTD.
- Comparaison simultanée de trois actions sur le web et deux sur mobile natif.
- Date de publication, exercice, couverture, confiance et raisons visibles.
- Export CSV des lignes réellement filtrées.
- Navigation WARIBA Pro sur desktop, web mobile, iOS et Android.
- Matrice Public / Compte / Pro visible avant inscription ; checkout web
  affiché seulement quand la configuration Stripe de production est complète.
- Méthodologie publique et avertissement non-conseil intégrés.

## Lecture croisée par 22 rôles

| Rôle | Décision / contrôle |
| --- | --- |
| 1. Founder / CEO | Pro crée une différenciation claire sans retarder le lancement par la facturation. |
| 2. Product Manager | Le job principal est « réduire 48 valeurs à une shortlist explicable », pas « donner un ordre ». |
| 3. Technical PM | Une seule version de méthode et un contrat identique web/native. |
| 4. UX Research | Recherche, tri et comparaison répondent aux tâches observables du classeur sans reproduire sa densité. |
| 5. Product Designer | Table de recherche sobre, cartes mobiles, barres comparables et hiérarchie de confiance. |
| 6. Accessibility | HTML sémantique, boutons nommés, états pressés/sélectionnés et contraste sémantique. |
| 7. Frontend Engineer | Données préparées côté serveur ; filtres et comparaison dérivés avec `useMemo`. |
| 8. React Native Engineer | Même moteur partagé, comparaison limitée à deux titres pour la largeur mobile. |
| 9. Data Engineer | Les artefacts `snapshot.json` et `fundamentals.json` restent les sources d'exécution. |
| 10. Quant / Model Risk | Pondérations publiées, données manquantes ignorées, risque inversé dans le global. |
| 11. Analyste financier | Exercice, publication, PER, rendement, croissance et signaux relient cours et comptes. |
| 12. Market Data QA | Le test doit continuer d'exiger 48 cotations et 48 fondamentaux analysables. |
| 13. Editorial / Content | Les formulations restent descriptives ; aucun « acheter », « vendre » ou « éviter ». |
| 14. Legal / Compliance | Méthodologie et avertissement sont visibles ; validation locale requise avant monétisation. |
| 15. Trust & Safety | Un score faible/fort n'est jamais présenté comme prédiction ; confiance plafonnée si historique court. |
| 16. Security | Aucune donnée privée nécessaire pour ouvrir Pro ou exporter les données publiques affichées. |
| 17. Performance | 48 lignes seulement ; pas de série OHLC chargée dans le laboratoire ; calcul natif mémorisé. |
| 18. SEO | Titre dashboard corrigé ; Pro possède un titre et une description dédiés. |
| 19. Analytics | Mesure uniquement après consentement ; aucun tracking nécessaire au fonctionnement. |
| 20. Revenue / Pricing | Données factuelles publiques ; compte requis pour la synchronisation ; Laboratoire 48 réservé aux abonnés Pro à 3 000 FCFA/mois ou 30 000 FCFA/an. |
| 21. QA / Release | TypeScript, lint, tests, build Next, Expo Doctor et exports iOS/Android sont les gates. |
| 22. Operations Côte d'Ivoire | FCFA, français, Vercel/wariba.app et checklist Apple/Google/EAS restent la référence. |

## Priorités après ce volet

1. Mesurer le LCP/temps d'apparition du graphique sur Android milieu de gamme
   et réseau mobile lent, puis fixer un budget de performance.
2. Vérifier par HTTP que le domaine secondaire redirige en permanence vers le
   canonique choisi et que les metadata/canonical restent cohérentes.
3. Valider la tarification, les achats stores et les droits de redistribution
   avant d'activer l'acquisition payante.
