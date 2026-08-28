# La routine quotidienne

Deux couches, volontairement séparées : ce qui tourne toujours, et ce qui
demande du jugement.

## Couche 1 — l'entretien, tous les jours, sans modèle

`.github/workflows/daily-scout.yml`, 06:10 UTC.

Ne coûte rien et ne dépend d'aucune clé : logos manquants, relevé des signaux
pour les fiches qui n'en ont pas ou dont le relevé date de plus de 30 jours,
régénération de l'API et des images de partage, validation. S'il y a une
différence, elle ouvre une **pull request** — jamais un push sur `main`.

Si le secret `OPENROUTER_API_KEY` est présent dans le dépôt, la même exécution
enchaîne le balayage de 4 sources et la rédaction des fiches en file. Sinon elle
saute proprement ces deux étapes et le dit dans son résumé.

C'est le filet : même si personne ne regarde le projet pendant trois mois, les
logos se complètent, les signaux se rafraîchissent et l'API reste juste.

## Couche 2 — le chercheur, une fois par jour, avec jugement

Routine Claude planifiée. Elle fait ce qu'un workflow ne sait pas faire :

- **choisir** où chercher — quelles sources sont mûres, quelles catégories sont
  creuses, quel salon vient d'avoir lieu ;
- **lire** ce que le pipeline a produit et écarter ce qui n'est pas un produit ;
- **améliorer le projet** — une entrée de `docs/ameliorations.md` par passe, et
  ce qui est cassé avant tout le reste ;
- **écrire** le résumé qui dit ce qui a été trouvé, ce qui a été rejeté et
  pourquoi ;
- **remonter** ce qui bloque — crédits épuisés, source qui ne rend plus rien,
  catégorie que la taxonomie ne couvre pas.

**Elle fusionne et déploie**, si et seulement si `scripts/ci/merge-guard.sh`
l'autorise. Le garde regarde le diff : pas de fiche supprimée, pas de note
d'avis ajoutée, validateur vert, artefacts à jour. S'il refuse, la pull request
reste ouverte pour relecture humaine — c'est un résultat, pas un échec.

Ce droit lui a été donné le 2026-08-28, après que trois pull requests aient
dormi trois jours : une routine qui produit sans jamais publier ne sert à rien.

## Lire son rapport

Dans l'ordre d'importance :

1. **Les fiches ajoutées.** Lire le diff, pas le résumé. La question à se poser
   sur chacune : *est-ce un produit, ou une société de service ?* C'est l'erreur
   que le pipeline laisse le plus facilement passer.
2. **Les rejets groupés par motif.** Un motif qui revient sur une même source
   (`le nom du produit ne figure pas sur la page`) veut dire que la source rend
   des pages d'annuaire. Corriger `data/sources.yaml`, pas les candidats.
3. **Le rendement par source**, dans `data/sweeps.json`. Une source à zéro
   pendant trois passes ne mérite plus son tour ; une source à cinq mérite d'être
   balayée plus souvent, ou d'être décomposée en plusieurs entrées.
4. **La file restante.** Si elle grossit sans être vidée, c'est que
   `fiche.mjs` échoue — souvent faute de crédits.

## Ce qu'elle ne doit jamais faire

- Fusionner sans que le garde l'ait autorisée, ou le contourner.
- Pousser directement sur `main` sans passer par une branche et une PR — même
  quand elle a le droit de fusionner, la trace de la pull request reste.
- Ajouter une note d'avis. Aucune source accessible ne permet de la dater
  honnêtement.
- Élargir le périmètre aux sociétés de service parce qu'une source les listait.
- Supprimer une fiche existante. Corriger, marquer `disputed`, ou laisser.
