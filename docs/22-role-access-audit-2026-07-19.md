# WARIBA — audit 22 rôles, accès et confiance

Date : 20 juillet 2026
Portée : web responsive, iOS, Android, données, produit, conversion et exploitation.

## Décision exécutive

L'accueil reste intact : aucune section marché, actualité, dividende, extrême,
volume ou publication n'est retirée. La monétisation porte sur les workflows
avancés, jamais sur l'accès aux faits essentiels.

| Couche | Accès | Fonctions |
| --- | --- | --- |
| Public | Sans compte | Accueil complet, 48 fiches, cours, graphiques essentiels, fondamentaux sourcés, N/N-1, actualités, documents, dividendes, screener de base |
| Compte | Session vérifiée | Synchronisation cloud, portefeuille privé, watchlists, alertes personnalisées, filtres enregistrés, demandes SGI et préférences multi-appareils |
| Pro | Compte + entitlement actif | Laboratoire 48, classements multi-facteurs, comparaisons avancées, exports et limites étendues |
| Interne | Jamais client | EAS, variables d'environnement, responsables, webhooks, secrets, commandes de build, diagnostics fournisseur |

## Lecture des 22 rôles

| Rôle | Décision / contrôle livré |
| --- | --- |
| CEO / fondateur | Accueil préservé, offre unique et frontière commerciale lisible |
| Product Manager | Public / Compte / Pro défini par valeur et coût, pas par page arbitraire |
| Technical PM | Même entitlement et mêmes états d'erreur sur web/iOS/Android |
| Product Designer | Gate explicatif, non punitif ; identité terminal WARIBA conservée |
| UX Research | Faits non verrouillés ; inscription demandée au moment d'une action personnelle |
| UX Writer | Suppression du jargon EAS, RevenueCat, Supabase, webhook et variables dans l'UI client |
| Accessibility | Onglets nommés, état sélectionné, défilement visible, réduction de mouvement respectée |
| Senior Frontend | Rangées graphiques mobiles séparées ; onglet actif ramené dans la zone visible |
| Mobile Engineer | 1D/1W ajoutés, sélecteurs défilables visibles, gate natif identique et aucun état métier persistant hors compte |
| Full-stack | Route Pro rendue dynamiquement et données non calculées pour un utilisateur non autorisé |
| Backend | Supabase/RLS comme autorité des données privées ; entitlement `research_exports` ou abonnement Pro actif/trialing comme autorité Pro |
| Data Engineer | Toutes les périodes de tous les tickers testées sur les séries réelles |
| Financial Analyst | Une perte réduite reste une perte ; aucun « bénéfice en hausse » possible |
| Market Data QA | PER neutralisé si les derniers comptes vérifiés sont déficitaires |
| Quant | Perte/retournement exclus des rangs trompeurs de croissance bénéficiaire |
| QA Automation | Régression 48 tickers × 8 périodes + scénarios perte/retournement |
| Security | Les instructions d'exploitation quittent la surface publique ; `/launch` redirige |
| Privacy | Les fournisseurs restent cités uniquement dans la politique légale nécessaire |
| Revenue / Pricing | 3 000 FCFA/mois ; cible annuelle 30 000 FCFA |
| Growth | Pages publiques indexables ; Pro explique la valeur avant inscription |
| Customer Success | Alertes expliquées, demandes SGI suivies et support par canal WARIBA, pas par dépôt GitHub public |
| Operations / SRE | Secrets et procédures restent dans les docs internes versionnées |

## Règles financières centrales

1. `-2 189 M → -624 M` donne **Perte réduite de 71,5 %**, jamais
   **Bénéfice en hausse**.
2. Une perte courante interdit le PER dans le score et la comparaison, même si
   un ancien bulletin contient encore une base bénéficiaire positive.
3. Le PER visible porte le libellé **PER BRVM**, la date du bulletin et une
   explication de sa base.
4. Les comparaisons N/N-1 gardent les montants négatifs en rouge ; une réduction
   de perte reste orange, pas verte.
5. Méthode, exercice, date de publication, couverture et confiance restent
   visibles ; aucune donnée absente n'est estimée.
6. Une cession d'actif porte la mention **élément exceptionnel non récurrent**.
7. Un flux opérationnel négatif interdit toute formulation automatique
   **génératrice de trésorerie**.

## Contrôles de graphique

- Web : 1D, 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y.
- iOS/Android : 1D, 1W, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, Tout.
- Chaque changement de ticker/période efface la série précédente avant le
  chargement : une panne ne peut plus laisser le graphique d'ETIT sous un autre
  ticker.
- Une erreur affiche le ticker et la période concernés avec une action
  Réessayer.
- Test automatisé : 48 tickers × 8 périodes quotidiennes, OHLC valides,
  chronologie stricte, dernier cours du bon ticker.

## Ce qui reste externe

- Clés et prix Stripe production vérifiés.
- Produits App Store / Google Play, offering RevenueCat et webhook validés.
- EAS signé, TestFlight, Play Internal Testing et QA sur appareils physiques.
- Tests réels achat/restauration/annulation/cross-login avant toute CTA native.
- Accord sur les droits de redistribution BRVM et pilote SGI : documents prêts,
  aucune prise de contact externe n'est revendiquée sans autorisation.
