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

## Suite logique

Un script de backfill (fetch + parse en boucle sur toutes les dates
ouvrées depuis ~2019, avec pause entre requêtes par courtoisie envers
le serveur BRVM) reste à écrire — ce script-ci ne traite qu'un PDF à la
fois.
