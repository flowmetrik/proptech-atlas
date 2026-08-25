# Chercher soi-même, sans OpenRouter

Un agent qui dispose de sa propre recherche web n'a besoin d'aucune clé tierce.
Il fait le jugement ; le dépôt fait la mécanique et la vérification.

C'est la voie de la routine quotidienne, et elle marche même quand le solde
OpenRouter est à zéro.

## Le cycle, en cinq gestes

### 1. Choisir où chercher

Ouvrir `data/sources.yaml` et `data/sweeps.json`. Prendre trois ou quatre
sources qui n'ont pas été balayées depuis le `cooldown_days` du registre, en
privilégiant :

- les `marketplace` — meilleur rendement mesuré ;
- les `event` dont l'édition vient d'avoir lieu ;
- le marché le moins couvert des deux, à consulter dans
  `public/api/index.json` → `counts`.

Regarder aussi quelles catégories sont creuses : une catégorie à deux ou trois
fiches sur un marché mérite une source ciblée.

### 2. Chercher

Recherche web sur la source, en langue du marché. Pour la France, chercher **en
français** : c'est exactement là que le catalogue est unique, parce que les
éditeurs français ne se référencent pas en anglais.

Ce qu'on cherche : le nom du produit, son éditeur, et **la racine de son propre
site** — jamais la page d'annuaire où on l'a trouvé.

Écarter à vue : agences, réseaux, brokers, asset managers, foncières, cabinets
de conseil. On catalogue des produits, pas des sociétés de service.

### 3. Vérifier — avant d'écrire quoi que ce soit

```bash
node scripts/enrich/verify.mjs "Rentec Direct" https://www.rentecdirect.com
```

ou, pour une liste :

```bash
cat > /tmp/candidats.json <<'JSON'
[{"name": "…", "website": "https://…", "editor": "…", "markets": ["FR"], "category": "syndic-copro"}]
JSON
node scripts/enrich/verify.mjs --queue /tmp/candidats.json
```

Le contrôle est le même que celui de la boucle automatique : le site répond, le
nom du produit figure sur sa page d'accueil, l'URL n'est pas une page de
recherche ou d'annuaire, et ni le slug ni le domaine ne sont déjà connus.

**Ne jamais écrire une fiche pour un candidat qui n'a pas passé cette étape.**

### 4. Lire le site, puis écrire

Lire l'accueil, la page tarifs et la page fonctionnalités du produit. Écrire à
partir de ce qu'on y lit, pas de ce qu'on croit savoir.

Puis produire un JSON au schéma de la fiche et le passer par le dépôt — c'est
lui qui rend le YAML, écrête, et valide :

```bash
node scripts/enrich/fiche.mjs --from /tmp/fiches.json
```

Le schéma attendu, champ par champ : [`../../../data/SCHEMA.md`](../../../data/SCHEMA.md).
Un exemple complet et commenté : `data/tools/_template.yaml`.

Les deux champs qui décident de la qualité :

- **`real_estate_use`** — la situation de travail concrète. Qui attrape cet
  outil, à quel moment, pour résoudre quoi. Deux à quatre phrases. C'est la
  partie qu'un modèle lira pour répondre à « quel outil dans cette situation ».
- **`description`** — ce que le produit **est**, factuellement, distinct de
  **`positioning`** qui porte sa revendication sur lui-même.

Laisser vide plutôt que deviner : une année de création, un prix, une
intégration qui ne figurent pas sur le site n'ont pas à figurer dans la fiche.

### 5. Compléter, valider, proposer

```bash
node scripts/enrich/logos.mjs      # logo du nouvel éditeur
node scripts/enrich/signals.mjs    # signaux vérifiés
npm run data:emit                  # API, graphe, llms.txt, CATALOG.md
python3 scripts/og/build.py        # images de partage
npm run data:validate              # le juge
```

Puis une **pull request**, jamais un push sur `main` :

```bash
bash scripts/ci/open-pr.sh          # en CI
# ou, à la main :
git checkout -B scout/$(date -u +%F) && git add -A && git commit && gh pr create
```

## Le rapport

Dire, dans cet ordre :

1. les fiches ajoutées, avec pour chacune une ligne sur ce que fait le produit ;
2. les candidats écartés **groupés par motif** — c'est là qu'on voit qu'une
   source rend des pages d'annuaire plutôt que des sites produits ;
3. les sources balayées et leur rendement ;
4. ce qui bloque : une catégorie que la taxonomie ne couvre pas, une source
   morte, un solde épuisé.

## Les erreurs à ne pas commettre

- **Écrire une fiche sans avoir lu le site.** C'est ce qui produit des
  descriptions plausibles et fausses, et c'est exactement ce que ce catalogue
  existe pour remplacer.
- **Ajouter une note d'avis.** Aucune plateforme accessible ne permet de la
  dater honnêtement. `reviews: []` est la bonne réponse.
- **Faire entrer une société de service** parce qu'une source la listait.
- **Pousser sur `main`.**
- **Supprimer une fiche existante.** Corriger, ou marquer `disputed`.
