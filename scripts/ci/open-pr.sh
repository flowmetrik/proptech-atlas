#!/usr/bin/env bash
# Ouvre — ou met à jour — la pull request de la passe du jour.
#
# Le résultat d'une passe est TOUJOURS une pull request. Une fiche est une
# affirmation publique sur le produit de quelqu'un : rien n'atteint `main` sans
# qu'un humain l'ait lue.
set -euo pipefail

DATE="$(date -u +%Y-%m-%d)"
BRANCH="scout/${DATE}"
LOGS="${LOGS_DIR:-/tmp}"

if [ -z "$(git status --porcelain)" ]; then
  echo "Rien de neuf aujourd'hui." | tee -a "${GITHUB_STEP_SUMMARY:-/dev/null}"
  exit 0
fi

git config user.name  "proptech-scout"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -B "$BRANCH"
git add -A

NEW="$(git diff --cached --name-only --diff-filter=A -- data/tools \
       | sed 's|data/tools/||; s|\.yaml$||' | paste -sd' ' -)"
COUNT="$(ls data/tools/*.yaml | grep -v _template | wc -l | tr -d ' ')"

section() {
  printf '### %s\n```\n' "$1"
  tail -n "$3" "${LOGS}/$2" 2>/dev/null || echo '(étape sautée)'
  printf '```\n\n'
}

{
  printf '## Passe du %s\n\n' "$DATE"
  printf 'Catalogue : **%s fiches**.\n\n' "$COUNT"
  if [ -n "$NEW" ]; then printf 'Nouvelles fiches : `%s`\n\n' "$NEW"
  else printf 'Aucune fiche ajoutée — entretien seul.\n\n'; fi
  section 'Balayage des sources' sweep.log 30
  section 'Rédaction des fiches' fiche.log 15
  section 'Logos' logos.log 8
  section 'Signaux vérifiés' signals.log 12
  section 'Validation' validate.log 3
  printf -- '---\n\n'
  printf '**À relire en priorité : chaque nouvelle fiche est-elle un produit, ou une société de service ?**\n'
  printf "C'est l'erreur que le pipeline laisse le plus facilement passer.\n\n"
  printf 'Voir aussi les rejets groupés par motif : un motif qui revient sur une même source\n'
  printf 'signale une source qui rend des pages d'"'"'annuaire — corriger `data/sources.yaml`,\n'
  printf 'pas les candidats.\n'
} > "${LOGS}/body.md"

cat "${LOGS}/body.md" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

printf 'Passe du scout — %s\n\n' "$DATE"            > "${LOGS}/msg.txt"
[ -n "$NEW" ] && printf 'Nouvelles fiches : %s\n' "$NEW" >> "${LOGS}/msg.txt"
printf 'Catalogue : %s fiches.\n\nGénérée par .github/workflows/daily-scout.yml.\n' "$COUNT" >> "${LOGS}/msg.txt"

git commit -q -F "${LOGS}/msg.txt"
git push -f -q origin "$BRANCH"

if gh pr view "$BRANCH" --json number >/dev/null 2>&1; then
  gh pr edit "$BRANCH" --body-file "${LOGS}/body.md"
  echo "Pull request mise à jour : $BRANCH"
else
  gh pr create --base main --head "$BRANCH" \
    --title "Passe du scout — ${DATE}" --body-file "${LOGS}/body.md"
fi
