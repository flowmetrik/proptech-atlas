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
| `discover.mjs` | Cherche sur le web les produits absents du catalogue, catégorie par catégorie et marché par marché. Écrit une file dans `data/candidates.json`. | LLM + recherche web |
| `fiche.mjs` | Rédige la fiche complète d'un candidat, **ancrée sur le contenu réel de son site**. | LLM |
| `logos.mjs` | Récupère le logo depuis le site de l'éditeur, le normalise en PNG 256 px. | gratuit |
| `signals.mjs` | Va vérifier sur le site ce qu'une machine peut établir seule : tarifs publics, doc d'API, page sécurité, confidentialité, page d'état, langues. | gratuit |

`emit.mjs` puis `validate.mjs` closent la passe. Une fiche qui ne passe pas le
validateur est **retirée**, pas laissée à pourrir.

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

## Prérequis

Deux clés, lues dans le coffre du cowork (`~/projects/flowmetrik-cowork/.env`),
jamais dans le dépôt :

- `OPENROUTER_API_KEY` — découverte et rédaction. La recherche web du routeur
  est facturée en plus des jetons ; une ronde complète sur 24 catégories × 2
  marchés coûte quelques dollars.
- `FIRECRAWL_API` — secours de lecture. Facultative.

`loop.mjs` vérifie le solde OpenRouter **avant** de lancer quoi que ce soit, et
saute proprement les étapes LLM s'il est vide plutôt que de collectionner des
erreurs pendant vingt minutes.

## Dépendances système

`magick` (ImageMagick) pour normaliser les logos et rasteriser les images de
partage. Python 3 avec `fontTools` pour vectoriser le lettrage
(`scripts/og/build.py`).
