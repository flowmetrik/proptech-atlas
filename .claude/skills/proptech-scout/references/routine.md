# La routine quotidienne

Deux couches, volontairement séparées : ce qui tourne toujours, et ce qui
demande du jugement.

## Couche 1 — le contrôle de santé, tous les jours, sans écrire

`.github/workflows/daily-health.yml`, 06:10 UTC.

**Il ne modifie rien.** L'organisation `flowmetrik` refuse le droit d'écriture
aux workflows, et GitHub Actions ne peut pas ouvrir de pull request tant que le
réglage correspondant est désactivé. Un workflow qui essaierait quand même
échouerait tous les jours en silence — c'est très exactement ce qui s'est passé
les 27 et 28 août.

Il vérifie, et il **dit**, dans le résumé du job : le catalogue passe-t-il son
validateur, les artefacts générés sont-ils à jour, le site construit-il, le site
publié répond-il (page **et** API), combien de relevés ont plus de trente jours,
combien de fiches n'ont pas de logo.

C'est le canari. Il ne répare rien, mais rien ne casse en silence.

Pour lui rendre l'écriture : Organisation → Settings → Actions → General →
Workflow permissions → « Read and write », plus « Allow GitHub Actions to create
and approve pull requests ». Alors seulement on pourra lui remettre
l'enrichissement et la pull request.

## Couche 2 — le chercheur, une fois par jour, avec jugement et droit d'écrire

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
