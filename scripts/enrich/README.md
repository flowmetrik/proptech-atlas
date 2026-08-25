# Le pipeline d'enrichissement

Quatre scripts, une boucle. Chacun ne fait que ce qui manque, aucun ne garde
d'état ailleurs que dans le dépôt : relancer la boucle est toujours sûr.

```bash
node scripts/enrich/loop.mjs              # la passe complète
node scripts/enrich/loop.mjs --no-discover  # sans appel LLM, donc sans coût
```

## Les étapes, dans l'ordre où elles se nourrissent

| Étape | Ce qu'elle fait | Coût |
|---|---|---|
| `sweep.mjs` | Balaie une **source nommée** du registre `data/sources.yaml` — annuaire d'intégrations, liste d'exposants, portefeuille de fonds — et en extrait les produits. Rote les sources par ancienneté et mesure leur rendement. **La voie principale.** | LLM + recherche web |
| `discover.mjs` | Part d'une **catégorie × marché** et demande au modèle ce qu'il connaît. Voie secondaire, pour les catégories creuses. | LLM + recherche web |
| `fiche.mjs` | Rédige la fiche complète d'un candidat, **ancrée sur le contenu réel de son site**. `--from <json>` écrit une fiche rédigée ailleurs. | LLM (sauf `--from`) |
| `verify.mjs` | Le garde-fou en ligne de commande, pour un agent ou un humain qui a cherché lui-même. | gratuit |
| `logos.mjs` | Récupère le logo depuis le site de l'éditeur, le normalise en PNG 256 px. | gratuit |
| `signals.mjs` | Va vérifier sur le site ce qu'une machine peut établir seule : tarifs publics, doc d'API, page sécurité, confidentialité, page d'état, langues. | gratuit |
| `stale.mjs` | Liste les fiches dont le relevé de signaux a dépassé N jours. | gratuit |

`emit.mjs` puis `validate.mjs` closent la passe. Une fiche qui ne passe pas le
validateur est **retirée**, pas laissée à pourrir.

## Le registre des sources

`data/sources.yaml` — 46 terrains de chasse, chacun avec **ce qu'on y trouve que
les autres n'ont pas**. Une source qui ne répond pas à cette question n'en est
pas une.

Neuf natures, par rendement observé : `marketplace` (annuaires d'intégrations —
le meilleur du lot, un incumbent y liste des dizaines d'outils de niche et
l'intégration prouve que le produit tourne), `association`, `event` (à balayer
juste après chaque édition), `press`, `review`, `vc` et `launch` (détectent tôt,
mais une levée n'est pas un produit en usage), `opensource` et `public` (volume
faible, unicité maximale).

`sweep.mjs` les rote par ancienneté de balayage et écrit le rendement mesuré
dans `data/sweeps.json`. Une source à zéro sur trois passes ne mérite plus son
tour ; une source à cinq mérite d'être décomposée en plusieurs entrées.

## La routine quotidienne

Deux couches. `.github/workflows/daily-scout.yml` fait l'entretien tous les
jours **sans modèle et sans coût** — logos manquants, signaux périmés, API,
validation — et n'enchaîne balayage et rédaction que si le secret
`OPENROUTER_API_KEY` existe dans le dépôt. Une routine Claude fait le jugement :
choisir où chercher, écarter ce qui n'est pas un produit, écrire le rapport.

Les deux produisent une **pull request**. Rien n'atteint `main` sans relecture :
une fiche est une affirmation publique sur le produit de quelqu'un.

## Pourquoi la boucle tourne comme ça

**La découverte est vérifiée avant d'entrer.** Un modèle interrogé sur « les
logiciels de syndic français » invente des produits plausibles. Chaque candidat
passe donc un contrôle exécutable — son site répond, et le nom du produit figure
sur sa page d'accueil — avant d'atteindre la file. Une URL de recherche ou de
page d'annuaire est refusée : ce n'est pas le site du produit, c'est l'endroit
où le modèle l'a trouvé.

**La rédaction est ancrée.** `fiche.mjs` récupère d'abord l'accueil, la page
tarifs et la page fonctionnalités de l'éditeur, et le modèle écrit à partir de
ce texte. Trois niveaux d'ancrage, du plus contrôlé au moins :

1. lecture directe du site ;
2. Firecrawl, pour les sites qui bloquent un simple `fetch` ;
3. recherche web par le modèle — et la fiche le dit dans ses `sources`.

**La boucle s'arrête quand elle tarit.** `discover.mjs` compte les rondes
consécutives sans rien de neuf et s'arrête après deux. Un compteur fixe
(« trouve-moi 20 outils ») manquerait la traîne ; une boucle qui tarit la trouve.

**Deux niveaux de fiabilité, jamais confondus.** La prose est rédigée et marquée
`unverified` tant qu'un humain ne l'a pas recoupée. Les signaux, eux, sont
établis par la machine, portent l'URL qui les prouve et la date du relevé. Le
site les affiche séparément, et l'API publie la couverture des deux.

## Ce qui n'est jamais fait

- **Aucune note d'avis inventée.** G2, Capterra et Trustpilot renvoient tous
  `403` à un accès automatisé : impossible de relever une note et de la dater
  honnêtement. Le catalogue n'en publie donc aucune, et le validateur refuse
  toute note sans URL de source et sans `sampled_on`. Une case vide est une
  information juste ; un 4,5 plausible est un faux.
- **Aucun prix relevé par un modèle.** `signals.pricing` dit seulement
  *« l'éditeur publie ses tarifs, à cette URL, à cette date »*. Le montant, qui
  bouge, n'est pas recopié.
- **Aucune société de service.** `fiche.mjs` renvoie `OUT_OF_SCOPE` quand le
  contenu du site révèle une agence, un asset manager ou un cabinet de conseil
  plutôt qu'un produit.

## Modèles et budget

**Modèles ouverts et bon marché, par décision explicite.**

| Variable | Défaut | Prix | Rôle |
|---|---|---|---|
| `ATLAS_MODEL` | `deepseek/deepseek-v4-flash` | 0,08 / 0,17 $ par M | tout le reste |
| `ATLAS_MODEL_SMART` | `z-ai/glm-4.7` | 0,40 / 1,75 $ par M | rédaction d'une fiche |
| `ATLAS_MONTHLY_BUDGET_EUR` | `20` | — | plafond mensuel, appliqué dans le code |
| `ATLAS_WEB_RESULTS` | `3` | facturé au résultat | résultats web injectés par appel |

Le 2026-08-25, une ronde de découverte sur `claude-sonnet-5` a vidé un solde
OpenRouter entier en une passe. Le coupable n'est pas le nombre d'appels mais la
recherche web : elle injecte le contenu des résultats dans le prompt et
multiplie les jetons d'entrée par dix. Sur un modèle à 2 $/M ça se paie, sur un
modèle à 0,08 $/M non. D'où la règle, et d'où le plafond.

Chaque appel enregistre **son coût réel** — celui que renvoie OpenRouter, pas
une estimation — dans `data/spend.json` (non versionné : c'est une donnée de
compte, pas de catalogue). `ask()` refuse de partir dès que le mois est atteint ;
`loop.mjs` affiche le reste avant de commencer.

Les modèles ouverts ne gèrent pas tous `json_schema` strict. `ask()` le détecte,
redemande le JSON en clair et le parse : on ne renonce pas à un modèle bon
marché pour une question de format.

## Prérequis

Deux clés, lues dans le coffre du cowork (`~/projects/flowmetrik-cowork/.env`),
jamais dans le dépôt :

- `OPENROUTER_API_KEY` — découverte et rédaction.
- `FIRECRAWL_API` — secours de lecture. Facultative.

`loop.mjs` vérifie le solde **et le budget du mois** avant de lancer quoi que ce
soit, et saute proprement les étapes LLM s'il manque l'un ou l'autre plutôt que
de collectionner des erreurs pendant vingt minutes.

**La voie sans coût :** un agent qui dispose de sa propre recherche web n'a
besoin d'aucune de ces clés. Voir
`.claude/skills/proptech-scout/references/agent-workflow.md`.

## Dépendances système

`magick` (ImageMagick) pour normaliser les logos et rasteriser les images de
partage. Python 3 avec `fontTools` pour vectoriser le lettrage
(`scripts/og/build.py`).
