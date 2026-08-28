#!/usr/bin/env bash
# Le garde de fusion.
#
# La routine a le droit de fusionner son propre travail et de déclencher le
# déploiement. Ce droit n'a de sens que s'il est borné par autre chose qu'une
# consigne dans un prompt : un modèle qui a mal compris relit sa consigne et se
# convainc. Ce script, lui, regarde le diff.
#
# Il refuse trois choses, et seulement trois :
#   1. la suppression d'une fiche existante — on corrige, on ne fait pas disparaître ;
#   2. l'ajout d'une note d'avis — aucune source accessible ne permet de la dater ;
#   3. un catalogue qui ne passe pas son propre validateur.
#
#   bash scripts/ci/merge-guard.sh [base]      # défaut : origin/main
set -euo pipefail

BASE="${1:-origin/main}"
FAIL=0
say() { printf '  %s\n' "$1"; }

echo "Garde de fusion — diff contre ${BASE}"

# 1. Aucune fiche supprimée ni renommée hors de data/tools/.
DELETED="$(git diff --diff-filter=D --name-only "${BASE}"...HEAD -- data/tools \
           | grep -v '_template' || true)"
if [ -n "$DELETED" ]; then
  echo "✗ Des fiches disparaissent :"
  printf '%s\n' "$DELETED" | while read -r f; do say "$f"; done
  say "Une fiche fausse se corrige ou se marque 'disputed'. Elle ne se supprime pas."
  FAIL=1
fi

# 2. Aucune note d'avis ajoutée. On cherche les lignes AJOUTÉES qui portent une
#    note, pas la présence du mot « reviews » — `reviews: []` est justement la
#    forme attendue.
ADDED_RATINGS="$(git diff "${BASE}"...HEAD -- data/tools \
                 | grep -E '^\+\s+(rating|scale|count):' || true)"
if [ -n "$ADDED_RATINGS" ]; then
  echo "✗ Une note d'avis est ajoutée :"
  printf '%s\n' "$ADDED_RATINGS" | head -6 | while read -r l; do say "$l"; done
  say "G2, Capterra et Trustpilot renvoient 403 : aucune note ne peut être relevée et datée."
  FAIL=1
fi

# 3. Le catalogue passe son propre validateur. C'est le juge, pas un avis.
if ! node scripts/validate.mjs; then
  echo "✗ Le validateur refuse le catalogue."
  FAIL=1
fi

# 4. Les artefacts générés sont à jour — sinon le site publié mentirait sur
#    l'API qu'il sert.
node scripts/emit.mjs > /dev/null
if ! git diff --quiet -- public/api CATALOG.md public/llms.txt; then
  echo "✗ Les artefacts générés ne sont pas à jour."
  say "Lancer 'npm run data:emit' et committer le résultat."
  FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
  echo "✓ Fusion autorisée."
else
  echo ""
  echo "Fusion REFUSÉE. Corriger, ou laisser la pull request à la relecture humaine."
  exit 1
fi
