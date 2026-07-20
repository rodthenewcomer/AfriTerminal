# WARIBA — système produit 22 rôles et 4 surfaces

Date : 20 juillet 2026  
Surfaces : web desktop, web mobile, iOS et Android.

## Résultat des neuf chantiers

| Chantier | Décision vérifiable |
| --- | --- |
| 1. Compte utile | Les faits restent publics. Watchlist, portefeuille, alertes, filtres enregistrés et demandes SGI expliquent la valeur du compte et se synchronisent par utilisateur. |
| 2. Graphique | Les périodes utilisent le ticker demandé, le plein écran possède une sortie fixe indépendante et les sélecteurs mobiles restent défilables et visibles. |
| 3. Opérations | Publications, documents, avis, IPO et opérations sur capital sont réunis dans `/operations` et dans une même destination native. |
| 4. Sessions locales | Aucune donnée métier privée ne persiste en local. Les stores optimistes en mémoire sont vidés au changement de compte et à la déconnexion. |
| 5. Moteur financier | Une source partagée impose le vocabulaire pertes, exceptions, trésorerie, PER, période, source, nature des comptes et confiance. |
| 6. Alertes | Le flux par défaut répond à « ce qui compte pour mes actions » : watchlist, portefeuille, importance, raison, conséquence, source et masquage. |
| 7. Portefeuille | Performance totale, revenus reçus/annoncés, concentration, secteur et risques factuels sont visibles sans conseil d'investissement. |
| 8. Fiabilité | Actualités limitées aux sociétés cotées BRVM, scores expliqués, accès Pro public et tests de données sur tout l'univers. |
| 9. SGI et rétention | Questionnaire SGI sur faits officiels, fiches détaillées et sauvegarde de demande ; instructions stores et plan de suivi hebdomadaire documentés honnêtement. |

## Contrôle par 22 rôles

| Rôle | Critère accepté |
| --- | --- |
| 1. Fondateur | L'accueil conserve toutes ses sections et la proposition commerciale devient lisible. |
| 2. Product Manager | Public, Compte et Pro correspondent à trois niveaux de valeur explicables. |
| 3. Technical PM | Contrats partagés, migrations versionnées et mêmes règles sur quatre surfaces. |
| 4. UX Research | L'inscription intervient au moment d'une action personnelle, avec bénéfice immédiat. |
| 5. Product Designer | Hiérarchie visuelle, comparaison N/N-1, états vides utiles et commandes tactiles. |
| 6. UX Writer | Français simple, raison et conséquence ; aucun jargon d'infrastructure dans l'interface. |
| 7. Accessibilité | Libellés, contrastes, focus, défilement horizontal et tailles tactiles vérifiables. |
| 8. Frontend web | Pages responsive, plein écran sûr et aucune fuite de données Pro dans la réponse publique. |
| 9. React Native | Sélecteurs visibles, safe areas et comportement cohérent iOS/Android. |
| 10. Full-stack | Les actions privées exigent une session et retournent des erreurs explicites. |
| 11. Backend | RLS et `user_id = auth.uid()` protègent chaque ligne privée. |
| 12. Sécurité | Secrets, diagnostics fournisseurs et commandes restent hors frontend. |
| 13. Vie privée | Pas de watchlist, portefeuille ou alerte durable sur appareil partagé après déconnexion. |
| 14. Data Engineer | Un pipeline unique alimente accueil, fiches, fondamentaux et applications. |
| 15. Data QA | 48 tickers et toutes les périodes quotidiennes sont testés sans fuite inter-ticker. |
| 16. Analyste financier | Pertes, exceptions, flux et PER sont formulés selon les comptes affichés. |
| 17. Quant / Model Risk | Méthode, couverture, date et confiance accompagnent chaque score. |
| 18. Éditorial | Chaque actualité est rattachée à au moins un ticker BRVM et conserve sa source d'origine. |
| 19. Juridique / conformité | Aucun ordre, conseil personnalisé, transmission SGI ou affiliation inventée. |
| 20. Revenue | Les faits essentiels restent publics ; Pro vend recherche, comparaison et export. |
| 21. QA / Release | TypeScript, lint, tests, build, audit, Expo Doctor, exports et tests physiques forment le gate. |
| 22. Opérations Côte d'Ivoire | Français, FCFA, réseaux lents, Android milieu de gamme et comptes d'organisation sont prioritaires. |

## Contrôle des 10 tâches de chaque fiche action

| Tâche | Implémentation commune web mobile, iOS et Android |
| --- | --- |
| 1. Périodes | 1J, 1S, 1M, 3M, 6M, YTD, 1A, 3A, 5A et MAX utilisent le même moteur ; 1J retombe sur la dernière séance officielle et sa clôture précédente. |
| 2. Identité | Nom, ticker, marché, secteur, sous-secteur WARIBA, pays, devise, statut, date/source et logo officiel N/D sont visibles sans inventer d'actif. |
| 3. Rendements | Variation du cours, dividendes cumulés et rendement total restent séparés. |
| 4. Résumé | Chaque période expose dates, cours initial/final, haut/bas, volume, séances sans échange et annualisation quand elle est pertinente. |
| 5. Sections | Activité, performance, dividendes, cinq exercices, valorisation, actualités/documents, capital/actionnariat et parcours SGI en six étapes sont livrés. |
| 6. Scores | Qualité, Valorisation, Momentum, Risque, Dividende et Liquidité sont affichés ; les deux derniers restent complémentaires au score central. |
| 7. Statuts | Vérifié, Calculé, Estimé et N/D font partie du contrat de métrique partagé. |
| 8. Contrôles | Les 48 tickers et leurs dix périodes sont testés ; les séries OHLCV invalides ou inter-ticker échouent fermées. |
| 9. Interfaces | Tables défilables, commandes tactiles, plein écran avec sortie fixe et mêmes informations sur quatre surfaces. |
| 10. SITAB | STBC 5A et MAX ont des assertions dédiées sur dates, cours, extrêmes et performance ; MAX conserve l'historique fiable depuis 2019. |

## Parcours débutant

1. Lire l'accueil sans compte et comprendre la date/fraîcheur des données.
2. Ouvrir une action, lire la définition, la période, la source et la comparaison précédente.
3. Créer un compte seulement pour suivre une action, un portefeuille ou une alerte.
4. Recevoir des événements expliqués sur ses titres, jamais un ordre d'achat.
5. Utiliser le questionnaire SGI, vérifier les coordonnées officielles et contacter soi-même la SGI.
6. Découvrir Pro seulement pour comparer, classer et exporter la recherche avancée.

## Frontières honnêtes

- Une demande SGI sauvegardée est suivie dans le compte WARIBA mais n'est pas
  transmise tant qu'aucun accord pilote et canal officiel ne sont actifs.
- Une synthèse hebdomadaire dans l'app peut être calculée depuis le portefeuille ;
  l'envoi e-mail/push récurrent exige encore fournisseur, consentement et preuve
  de délivrabilité.
- BRVM, SGI, Apple, Google, Expo, RevenueCat et fournisseurs e-mail ne sont
  jamais présentés comme configurés sans preuve externe.
- Procédure comptes et stores :
  [Lancement natif WARIBA — Côte d’Ivoire](./native-release-cote-ivoire.md).
