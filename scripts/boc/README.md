# Parseur BOC (Bulletin Officiel de la Cote)

Extrait le marché des actions du bulletin quotidien PDF de la BRVM en JSON.

## Usage

```bash
pip install -r requirements.txt
python3 parse_boc.py chemin/vers/boc_20260703_2.pdf --out sortie.json
```

## URLs des bulletins

```
https://www.brvm.org/sites/default/files/boc_YYYYMMDD_2.pdf   (nov. 2021 -> aujourd'hui)
https://www.brvm.org/sites/default/files/boc_YYYYMMDD.pdf     (déc. 2016 -> oct. 2021, avec un
                                                                 trou constaté juin 2021 = jour
                                                                 sans bulletin en ligne)
```
Vérifié empiriquement par sondage direct des deux motifs (HEAD requests),
pas via la pagination du site (non fiable à distance). Le premier
bulletin en ligne semble dater de décembre 2016 ; rien avant n'a été
trouvé.

## Ce qui est extrait

- Indices de tête : BRVM Composite, BRVM 30, BRVM Prestige (niveau,
  variation jour, variation annuelle). **Ne fonctionne que sur l'ère
  2022+** — les bulletins 2021 testés ne mentionnent pas "BRVM
  PRESTIGE" dans le texte (l'indice est probablement plus récent),
  donc `indices` ressort vide sur les échantillons plus anciens. Les
  cours par action ne sont pas affectés.
- Marché des actions, ligne par ligne : ticker, nom, cours précédent,
  ouverture, clôture, variation jour, volume, valeur échangée, cours de
  référence, variation annuelle, dernier dividende net + date,
  rendement net, PER, et code secteur (quand disponible, voir ci-dessous).

## Schémas de table gérés (détection automatique par nombre de colonnes)

| Ère                          | Colonnes | Code secteur par ligne | Validé sur |
|-------------------------------|----------|------------------------|------------|
| ~2022 -> aujourd'hui (`_2.pdf`)| 16       | Oui                    | 2026-07-03, 2023-06-05 |
| ~2019 -> nov. 2021             | 15       | Non (colonne absente)  | 2021-01-04, 2021-11-04 |

La bascule d'URL (`_2` apparaît) et la bascule de mise en page interne
(colonne secteur ajoutée) ne coïncident **pas** exactement : en
novembre 2021 l'URL utilise déjà `_2.pdf` mais la table est toujours à
15 colonnes. Le parseur détecte donc le schéma par le nombre de
colonnes de la table extraite, pas par la date ou le nom de fichier —
robuste aux deux eras sans avoir à connaître la date exacte de bascule.

## Hors scope actuellement

- **Ère ~2016-2018** ("no suffix", 18 colonnes) : structure vraiment
  différente — ordre des champs distinct, secteur indiqué par une
  ligne bannière ("SECTEUR - INDUSTRIE ...") au lieu d'une colonne,
  en-têtes fusionnés sur plusieurs lignes PDF, colonnes en plus
  (écarts min/max, compartiment 1er/2ème). Confirmé sur un échantillon
  du 3 janvier 2017 : 0 ligne extraite par le parseur actuel. Nécessite
  une logique de parsing dédiée, non écrite — ajoute ~2-3 ans
  d'historique en plus des ~7 ans déjà couverts (2019-2026).
- Marché des obligations, marché des droits, OPCVM, avis divers (toutes
  eras).

## Décision produit

L'objectif initial ("5 ans d'historique") tombe entièrement dans les
deux schémas déjà gérés (2019+ couvre large avec de la marge). L'ère
2016-2018 est un bonus au-delà du scope initial, à coût de
développement disproportionné vu son gain marginal — traité comme
chantier séparé, pas bloquant pour le backfill principal.

## Résultat du backfill complet (2026-07-07)

Exécuté sur 2019-01-01 → 2026-07-07 : **1745 bulletins parsés avec
succès** (2019-01-02 → 2026-07-06 réellement couverts), 0 jour au
format non supporté (les deux schémas 15/16 colonnes ont couvert toute
la période sans exception), 215 jours sans bulletin (fériés + un vrai
vide d'archive d'environ 3-4 semaines en octobre 2021, vérifié
manuellement — les deux conventions d'URL retournent 404 de façon
cohérente sur cette fenêtre, ce n'est pas une erreur réseau).
`data/boc/series/` contient 48 tickers, aucune date dupliquée.

Un bug a été trouvé et corrigé en cours de route : sur 5/1745
bulletins, le regex d'extraction de date sur le texte du PDF échouait
silencieusement et `parse_bulletin()` retombait sur la date système du
jour d'exécution — `backfill.py` impose désormais la date de calendrier
qu'il a explicitement demandée plutôt que de faire confiance à ce
regex. Le premier run complet a aussi crashé une fois après 155 jours
sur un `TimeoutError` non catché (corrigé, voir historique git).

## Pipeline complet

```bash
python3 backfill.py --start 2019-01-01 --end 2026-07-07 \
    --out-dir ../../data/boc/raw --delay 0.8      # fetch + parse, un JSON par jour
python3 aggregate.py --raw-dir ../../data/boc/raw \
    --out-dir ../../data/boc/series                # regroupe par ticker, trié par date
```

`backfill.py` boucle sur les jours ouvrés, essaie les deux conventions
de nom de fichier, et sait reprendre après interruption (les jours déjà
présents dans `--out-dir` sont ignorés). Les jours sans bulletin
(fériés) ou au format non supporté sont journalisés, pas traités comme
des erreurs.

`aggregate.py` produit un fichier JSON par ticker
(`data/boc/series/TICKER.json`), trié chronologiquement, avec tous les
champs du BOC (pas seulement OHLCV).

### Limite importante : pas de vrai plus haut/plus bas intraday

Le BOC ne publie, pour chaque action, que le **cours d'ouverture et de
clôture** de la séance — aucune fourchette intraday. `aggregate.py`
calcule donc `high`/`low` comme `max`/`min(open, close)` : les bougies
générées à partir de ces données n'auront jamais de mèche plus large
que le corps. C'est une limite de la source, pas un bug du parseur —
à mentionner clairement si ces séries alimentent un jour l'UI, pour ne
pas laisser croire à une precision qui n'existe pas dans la donnée
officielle.

`data/boc/raw/` (sortie de `backfill.py`) est dans `.gitignore` —
régénérable, pas committée telle quelle. `data/boc/series/` (sortie de
`aggregate.py`, plus compacte et directement utile) peut être committée
une fois le backfill terminé et validé.

## Combler l'absence de plus haut/bas : `live_poll.py`

La page d'accueil brvm.org affiche des cours différés de 15 minutes en
HTML statique simple (`<span>TICKER</span>&nbsp;<span>PRIX</span>...`),
sans API cachée à trouver. `live_poll.py` interroge cette page et met à
jour un fichier `data/live/AAAA-MM-JJ.json` par jour : open (premier
prix vu), high/low (min/max observés), close (dernier prix vu), par
ticker.

Ce n'est utile que si le script tourne **répétitivement pendant la
séance** (09h45–14h45, heure d'Abidjan = GMT, lun-ven) — un seul appel
ne construit qu'un point de mesure. Ça reconstruit un vrai (quasi-)
intraday **à partir du jour où on le fait tourner**, pas rétroactivement.

```bash
python3 live_poll.py --out-dir ../../data/live
```

Testé le 2026-07-07 : 47 cotations récupérées en un appel, format
stable. Reste à décider : exécution en cron local (fragile si la
machine est éteinte/en veille) ou agent planifié dans le cloud (plus
robuste, tourne indépendamment de l'ordinateur).

## Pipeline fondamentaux (prototype, non branché — 2026-07-08)

Reconnaissance et prototypes pour aller au-delà des prix : la BRVM publie
de vrais états financiers par société, une fiche par société sur
`/fr/rapports-societe-cotes/[slug]` (ex. `/sonatel`, `/palm-ci`,
`/coris-bank-international`), avec des PDF téléchargeables remontant à
2019. Les 15 sociétés modélisées ont été mappées à leur slug (voir
historique git).

**Deux familles de documents, deux approches, résultats très différents :**

1. **Sociétés non-bancaires (SYSCOHADA "Système Normal")** —
   `parse_fundamentals_syscohada.py`. Le compte de résultat suit une
   nomenclature légalement standardisée ("CHIFFRE D'AFFAIRES",
   "RESULTAT DES ACTIVITES ORDINAIRES", "RESULTAT NET") — en théorie
   identique d'une société à l'autre. Extraction **par tableau**
   (`pdfplumber.extract_tables()`), pas par regex sur texte brut : les
   nombres français groupés par espaces ("10 074 573 973") deviennent
   ambigus une fois aplatis en texte, mais restent des cellules
   distinctes dans les tables détectées.
   - **Validé** sur ERIUM CI (ex Air Liquide), Palm CI et CIE CI : CA et
     résultat net corrects (vérifiés à la main contre le PDF) sur les 3.
   - **Résolu** : CIEC utilise "Chiffre d'affaires"/"RÉSULTAT NET"
     (casse/accents différents de la norme SYSCOHADA en capitales sans
     accent). Stratégie à 2 niveaux : essai strict d'abord (le cas
     normal), puis repli insensible à la casse/aux accents **avec
     garde-fou** — toute ligne qui mentionne aussi un terme propre au
     bilan ("capitaux propres", "report à nouveau"...) est rejetée,
     pour ne pas confondre le "Résultat net" du bilan (report à
     nouveau) avec celui du compte de résultat.
   - Un deuxième piège a été trouvé et corrigé au passage : certaines
     mises en page (CIEC) placent 3 sections côte à côte sur une même
     ligne de tableau (bilan, compte de résultat, flux de trésorerie).
     Prendre "les 2 dernières cellules numériques de la ligne" attrapait
     par erreur les valeurs de la section suivante (le CA de CIEC
     ressortait à 43 912 au lieu de 302 320). Corrigé en prenant les 2
     premières cellules numériques *après* la cellule du libellé, pas
     les 2 dernières de toute la ligne.
   - **Limite restante assumée** : le résultat des activités ordinaires
     de CIEC n'est pas extrait (le garde-fou anti-bilan rejette sa
     ligne, qui partage un fragment "Report à nouveau" d'une colonne
     voisine) — absence de donnée préférée à une donnée fausse.
   - **Étendu à 6 sociétés de plus (2026-07-08)** — résultat : 2/6
     fonctionnent du premier coup (**ONTBF**, **SPHC** : les 3 champs
     corrects), 4/6 révèlent chacun un problème structurellement
     différent, aucun n'étant un simple ajustement de regex :
     - **SNTS** : rapport annuel de 31 pages (pas les états financiers
       compacts habituels), 0 tableau détecté sur la 1ère page — la
       "valeur" trouvée vient d'une correspondance fortuite ailleurs
       dans le document, **pas fiable**, à ne pas utiliser telle quelle.
     - **ORAC** : même symptôme (valeurs trouvées mais suspectes,
       probablement une page/ligne non pertinente).
     - **UNXC** : le PDF est une **image scannée** (0 caractère de texte
       extrait) — un problème d'OCR, pas de parsing de tableau. Hors de
       portée de cette approche.
     - **TTLC** : contient bien les bons libellés ("Chiffre d'affaires",
       "Résultat des activités ordinaires"...) mais utilise "**Bénéfice
       net**" au lieu de "Résultat net", et surtout `pdfplumber` ne
       détecte la mise en page qu'en tableaux à **1 seule colonne**
       (pas de lignes de tableau visibles dans le PDF pour guider la
       détection) — nécessiterait une stratégie de détection différente
       (`table_settings` basée sur le texte plutôt que les traits).

   **Bilan cumulé sur les 9 sociétés non-bancaires testées** : 5/9
   pleinement validées (ERIUM, Palm CI, CIEC, ONTBF, SPHC), 2/9 avec des
   résultats suspects à ne pas utiliser (SNTS, ORAC), 2/9 bloquées par
   des problèmes fondamentalement différents nécessitant chacun sa
   propre solution (OCR pour UNXC, stratégie de détection de tableau
   pour TTLC). Confirme la conclusion : c'est un travail par société,
   pas un format unique à généraliser.

2. **Banques** — `parse_fundamentals_bank.py`. Les indicateurs clés
   (PNB, résultat net, coefficient d'exploitation, coût du risque)
   apparaissent en texte libre dans un communiqué de résultats, **en
   mise en page 2 colonnes** (nécessite un découpage gauche/droite
   avant extraction, sinon les phrases sont entrelacées entre colonnes).
   - **Validé** sur NSIA Banque CI : les 4 indicateurs extraits
     correctement par regex sur des tournures récurrentes ("X s'établit
     à N milliards FCFA contre M milliards FCFA au 31 décembre AAAA").
   - **Ne généralise pas** : testé sur SGBC, gabarit de rapport
     complètement différent (rapport d'activité façon "executive
     summary" vs communiqué court chez NSIA). Chaque banque semble
     avoir son propre template — un extracteur par société serait
     probablement nécessaire, pas un extracteur par secteur.

**Conclusion à ce stade** : faisable, mais l'ampleur réelle est
supérieure aux estimations initiales — potentiellement un extracteur
sur mesure par société plutôt qu'un par format. 2 des ~10 sociétés
non-bancaires sont pleinement validées, aucune des 5 banques ne l'est
de façon fiable. Rien de tout ceci n'est branché dans l'app — chantier
à reprendre séparément.
