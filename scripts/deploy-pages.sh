#!/usr/bin/env bash
# Publie PropTech Atlas sur GitHub Pages — la voie manuelle, sans Actions.
#
# Le workflow normal construit puis publie via l'artefact Pages, ce qui consomme
# des minutes GitHub Actions. Quand le budget de l'organisation est épuisé, le
# job est refusé AVANT de démarrer — trois secondes, pas de logs, et une
# annotation qui ne parle pas du code. Le site reste alors figé.
#
# Ce script contourne Actions entièrement : il construit en local et pousse le
# résultat sur la branche `gh-pages`, que Pages sert directement sans build.
#
#   ./scripts/deploy-pages.sh                 # domaine par défaut
#   ./scripts/deploy-pages.sh --dry-run
#   CUSTOM_DOMAIN=atlas.flowmetrik.com ./scripts/deploy-pages.sh
#
# ⚠️ La première fois, il faut basculer la source de Pages sur « Deploy from a
# branch → gh-pages / root » dans les réglages du dépôt. Tant que la source
# reste « GitHub Actions », ce script pousse dans le vide.
set -Eeuo pipefail

readonly BRANCHE="${PAGES_BRANCH:-gh-pages}"
dry=0
[[ "${1:-}" == "--dry-run" ]] && dry=1
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

racine="$(cd "$(dirname "$0")/.." && pwd)"
cd "${racine}"

# Les mêmes variables que le workflow, calculées ici : un site construit avec
# une base différente de celle servie rend des liens cassés, en silence.
if [[ -n "${CUSTOM_DOMAIN:-}" ]]; then
  export SITE="https://${CUSTOM_DOMAIN}" BASE="/" PUBLIC_SITE_URL="https://${CUSTOM_DOMAIN}"
else
  export SITE="https://flowmetrik.github.io" BASE="/proptech-atlas" \
         PUBLIC_SITE_URL="https://flowmetrik.github.io/proptech-atlas"
fi
export PUBLIC_GA4_ID="${GA4_MEASUREMENT_ID:-}"

echo "Construction — SITE=${SITE} BASE=${BASE}"
if [[ "${dry}" -eq 1 ]]; then
  echo "(dry-run) npm ci && npm run build, puis publication de dist/ sur ${BRANCHE}"
  exit 0
fi

npm ci
npm run build
[[ -d dist ]] || { echo "dist/ absent après le build" >&2; exit 1; }
[[ -n "${CUSTOM_DOMAIN:-}" ]] && printf '%s\n' "${CUSTOM_DOMAIN}" > dist/CNAME

# Un worktree jetable plutôt qu'un checkout : l'arbre de travail courant peut
# porter des modifications non commitées, et basculer de branche dessous ferait
# perdre le travail d'une autre session.
tmp="$(mktemp -d)"
trap 'git worktree remove --force "${tmp}" 2>/dev/null || true; rm -rf "${tmp}"' EXIT
if git ls-remote --exit-code --heads origin "${BRANCHE}" >/dev/null 2>&1; then
  git worktree add --quiet "${tmp}" "origin/${BRANCHE}" --detach
else
  git worktree add --quiet --detach "${tmp}"
  git -C "${tmp}" checkout --orphan "${BRANCHE}"
  git -C "${tmp}" rm -rq --cached . 2>/dev/null || true
fi

find "${tmp}" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "${tmp}/"
# Pages passe le contenu par Jekyll s'il ne trouve pas ce fichier, et Jekyll
# ignore alors tout répertoire commençant par un tiret bas.
touch "${tmp}/.nojekyll"

git -C "${tmp}" add -A
if git -C "${tmp}" diff --cached --quiet; then
  echo "Rien à publier : le site construit est identique."
  exit 0
fi
git -C "${tmp}" commit -qm "chore: publication manuelle $(date -u +%Y-%m-%dT%H:%MZ)"
git -C "${tmp}" push -q origin "HEAD:${BRANCHE}"
echo "Publié sur ${BRANCHE}. Vérifier : ${PUBLIC_SITE_URL}"
