# Parseur BOC (Bulletin Officiel de la Cote)

Extrait le marché des actions du bulletin quotidien PDF de la BRVM
(`https://www.brvm.org/sites/default/files/boc_YYYYMMDD_2.pdf`) en JSON.

## Usage

```bash
pip install -r requirements.txt
python3 parse_boc.py chemin/vers/boc_20260703_2.pdf --out sortie.json
```

## Ce qui est extrait

- Indices de tête : BRVM Composite, BRVM 30, BRVM Prestige (niveau,
  variation jour, variation annuelle).
- Marché des actions, ligne par ligne : secteur, ticker, nom, cours
  précédent, ouverture, clôture, variation jour, volume, valeur
  échangée, cours de référence, variation annuelle, dernier dividende
  net + date, rendement net, PER.

Validé sur le bulletin n° 124 du 3 juillet 2026 : 47 actions extraites,
0 erreur de parsing.

## Hors scope (volontairement)

- Marché des obligations (pages "1. OBLIGATIONS CLASSIQUES" et suivantes).
- Marché des droits.
- OPCVM / avis divers (dernières pages du bulletin).

À couvrir plus tard si un besoin produit apparaît — la structure en
tables `pdfplumber` rend l'extension simple (même technique, autres
en-têtes de colonnes).

## Comment le PDF a été obtenu

Un bulletin a été téléchargé via WebFetch le 2026-07-07 pour valider la
structure : `boc_20260703_2.pdf`. Le format d'URL est prévisible
(`boc_YYYYMMDD_2.pdf`), publié quotidiennement, avec ~2 semaines
d'historique visible sur la page `/fr/bulletins-officiels-de-la-cote`
et un lien "Publications précédentes" pour l'archive plus ancienne —
sa profondeur réelle (remonte-t-elle à 5 ans ?) reste à vérifier avant
de lancer un backfill historique.

## Décision produit à prendre avant d'aller plus loin

Ce script produit un instantané d'un jour. Trois directions possibles,
avec des implications différentes :

1. **Preuve de concept seule** (état actuel) — s'arrêter là pour l'instant.
2. **Backfill historique** — scraper les bulletins passés (rythme à
   déterminer, courtoisie serveur) pour obtenir un vrai historique
   5 ans par valeur, remplaçant `lib/mock/series.ts`.
3. **Pipeline vers l'avant** — fetch + parse quotidien automatisé à
   partir d'aujourd'hui, accumulant l'historique réel jour après jour
   sans backfill (implique un choix de stockage : fichiers JSON
   versionnés, ou une base de données).

Ces trois chemins ne s'excluent pas mutuellement mais impliquent des
efforts très différents — à trancher avant d'écrire la suite.
