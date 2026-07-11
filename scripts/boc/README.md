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
champs du BOC (pas seulement OHLCV), plus `data/boc/indices.json`
(niveaux quotidiens BRVM Composite / 30 / Prestige — disponibles à
partir de 2023, les bulletins antérieurs n'exposant pas les indices
sous une forme parsée). `merge_day.py` maintient les deux
incrémentalement en CI, et `build_app_data.py` en dérive les artefacts
consommés par l'app (`data/real/` : snapshot 48 tickers, séries OHLCV,
indices + historique par indice).

### Limite importante : pas de vrai plus haut/plus bas intraday (atténuée depuis le 2026-07-08)

Le BOC ne publie, pour chaque action, que le **cours d'ouverture et de
clôture** de la séance — aucune fourchette intraday. `aggregate.py`
calcule donc `high`/`low` comme `max`/`min(open, close)` : les bougies
générées à partir de ces données n'auront jamais de mèche plus large
que le corps. C'est une limite de la source, pas un bug du parseur —
à mentionner clairement si ces séries alimentent un jour l'UI, pour ne
pas laisser croire à une precision qui n'existe pas dans la donnée
officielle. **Atténuation** : depuis le 2026-07-08, `build_app_data.py`
élargit high/low avec la fourchette réellement observée par
`live_poll.py` (`data/live/`, collecte GitHub Actions toutes les 15 min
en séance) — les bougies gagnent de vraies mèches à partir de ce jour,
jamais rétroactivement. Le golden test `test_parse_boc.py` (fixture PDF
committée, bulletin du 2023-06-05) fige par ailleurs le comportement du
parseur contre les régressions silencieuses.

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
stable. **Décision prise (2026-07-08)** : exécution planifiée dans
GitHub Actions (`.github/workflows/live-poll.yml`), toutes les 15 min
pendant la séance (10h00–15h15 UTC, décalé de 15 min pour tenir compte
du différé des cours affichés), l'état du jour étant committé dans le
repo à chaque run — pas de dépendance à une machine locale. Le
bulletin quotidien est lui aussi automatisé
(`.github/workflows/boc-daily.yml` : fetch + merge_day.py +
build_app_data.py + commit + redéploiement du site).

## Pipeline fondamentaux (48/48 sociétés — 2026-07-11)

`fundamentals.py` épingle un PDF BRVM officiel par société, normalise les
montants en millions de FCFA et produit `data/real/fundamentals.json`.
Chaque enregistrement expose sa source et sa date de publication. Le run
complet couvre les **48 sociétés cotées**, dont les **16 établissements
financiers** avec PNB, résultat net, coefficient d'exploitation, coût du
risque, dépôts et crédits. Les capitaux propres sont présents pour 47/48 ;
SGBC reste volontairement vide sur ce champ, son rapport annuel 2025 ne
publiant pas de bilan complet.

### Architecture retenue

Trois approches ont été comparées : un parseur universel, un parseur par
famille de documents et une curation entièrement manuelle. Aucun parseur
universel n'est suffisamment sûr : tableaux fusionnés, rapports IFRS ou
SYSCOHADA, communiqués bancaires à deux colonnes, scans et polices mal
encodées produisent des erreurs silencieuses différentes. Une saisie 100 %
manuelle serait fiable au premier passage mais coûteuse à maintenir.

Le compromis retenu est donc hybride :

1. `parse_fundamentals_syscohada.py` extrait les tableaux non bancaires
   réguliers, avec garde-fous sur le libellé et l'ordre des cellules.
2. `parse_fundamentals_bank.py` extrait les communiqués bancaires compatibles
   après séparation des colonnes.
3. `extractor="manual"` et les surcharges `raw` portent uniquement les
   cellules relues dans le PDF approuvé quand le gabarit résiste aux deux
   extracteurs. Les documents scannés sont rendus puis lus par OCR ; les
   valeurs critiques sont confirmées sur une seconde occurrence ou un
   tableau indépendant.

Cette architecture conserve l'automatisation là où elle est reproductible
et rend chaque exception explicite dans le registre. SNTS, ORAC, FTSC,
SCRC et TTLS ont notamment été résolus par lecture visuelle des publications
approuvées ; le millésime SICC est 2024 malgré le nom de fichier BRVM qui
mentionne 2025.

### Règles de confiance

- CA/PNB et résultat net sont obligatoires : une extraction incomplète est
  refusée au lieu d'écrire un enregistrement partiel.
- Les unités, colonnes N/N-1 et millésimes sont vérifiés contre le document.
- Les capitaux propres viennent du bilan publié, y compris lorsqu'ils sont
  négatifs ; aucune valeur n'est reconstruite sans lignes explicites.
- `sharesOutstanding` n'est écrit qu'avec deux preuves concordantes
  (nombre publié ou capital/nominal, puis BPA, PER ou dividende global).
  **12 sociétés** satisfont ce seuil ; les autres restent à `null`.
- La cohérence `P/B = PER × ROE` sert de contrôle lorsqu'elle est calculable,
  jamais de source primaire.

```bash
python3 fundamentals.py \
  --out ../../data/real/fundamentals.json \
  --pdf-cache ../../data/fundamentals-pdf-cache
```

Ajouter ou actualiser une société signifie épingler la nouvelle publication,
vérifier visuellement le millésime et les unités, choisir l'extracteur le plus
étroit qui fonctionne, recouper les champs sensibles, puis exécuter les tests
et le run 48/48. Le cache PDF est régénérable et n'est pas une source produit.

Autres scripts du dossier : `build_alerts.py` (alertes factuelles),
`fetch_documents.py` / `fetch_operations.py` (publications et
opérations sur capital depuis brvm.org), `check_freshness.py`
(watchdog de staleness, workflow `freshness.yml`).
