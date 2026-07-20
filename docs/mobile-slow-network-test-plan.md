# QA mobile WARIBA — Côte d'Ivoire et réseaux lents

Date : 20 juillet 2026

## Matrice minimale

| Surface | Appareil cible | Réseau | Scénarios |
| --- | --- | --- | --- |
| Web mobile | Android 10–12, 3–4 Go RAM, écran 360×800 | 3G rapide, 400 ms RTT, 1,2 Mb/s | Accueil, ETIT 1W/1Y, plein écran, actualités, connexion |
| Android natif | Appareil physique milieu de gamme | MTN/Orange/Moov réel puis profil limité | Démarrage froid, graphiques, alertes, portefeuille, reprise |
| iOS natif | iPhone compatible version minimale | 4G faible et Wi-Fi instable | Connexion, safe areas, achat désactivé, notifications |
| Web desktop | Laptop 1366×768 et 1440×900 | 10 Mb/s et perte 2 % | Navigation clavier, plein écran, tableaux, Pro |

## Budgets

- Premier contenu utile de l'accueil : cible ≤ 2,5 s sur profil 3G rapide.
- Skeleton graphique remplacé par données ou erreur utile : cible ≤ 4 s.
- Changement ticker/période : ancienne série effacée immédiatement, puis
  résultat ou erreur ≤ 4 s.
- Aucun déplacement de mise en page supérieur à 0,1 de CLS cumulé.
- Action personnelle optimiste ≤ 150 ms, confirmation cloud visible ; en cas
  d'échec, aucun faux succès durable.

## Cas obligatoires

1. Charger toutes les périodes puis changer de ticker pendant une requête lente.
2. Ouvrir/fermer le plein écran en portrait et paysage ; bouton de sortie
   toujours visible hors encoche et barres système.
3. Faire défiler types de graphique et périodes avec police à 200 %.
4. Couper le réseau pendant ajout watchlist/alerte/transaction, reprendre et
   vérifier le serveur avant d'afficher un succès durable.
5. Changer de compte et se déconnecter : aucune donnée privée précédente ne
   reste visible.
6. Ouvrir une notification vers un ticker supprimé, suspendu ou sans série.
7. Vérifier mode clair/sombre, contraste, TalkBack/VoiceOver et réduction de
   mouvement.
8. Capturer appareil, OS, opérateur, heure, build, réseau, métriques et vidéo
   de chaque échec.

## Gate

La QA logicielle locale ne remplace pas les appareils physiques. La publication
stores reste bloquée jusqu'aux previews EAS signées, aux tests sur réseaux
ivoiriens réels et à la validation des déclarations Apple/Google.
