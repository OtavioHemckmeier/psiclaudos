#!/bin/bash
# Cria uma nova versão (standard-version: versão, CHANGELOG, commit e tag vX.Y.Z)
# e envia o branch + a tag. O push da tag dispara .github/workflows/docker-publish.yml,
# que publica as imagens da API e do web no GHCR. O deploy é manual.
#
# Uso:
#   npm run release                      # versão calculada pelos commits (feat → minor, fix → patch)
#   npm run release -- --first-release   # primeira versão: só cria a tag da versão atual
#   npm run release -- --release-as minor
#   npm run release -- --dry-run         # mostra o que faria, sem alterar nada
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:-master}"
DATE=$(date "+%Y-%m-%d %H:%M")
IS_DRY_RUN=false

for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    IS_DRY_RUN=true
  fi
done

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$RELEASE_BRANCH" ]]; then
  echo "Releases são feitas a partir de '${RELEASE_BRANCH}' (branch atual: '${CURRENT_BRANCH}')." >&2
  exit 1
fi

if [[ "$IS_DRY_RUN" == "false" ]] && [[ -n "$(git status --porcelain)" ]]; then
  echo "Há alterações não commitadas. Faça commit ou stash antes do release." >&2
  exit 1
fi

if [[ "$IS_DRY_RUN" == "false" ]]; then
  # Evita criar uma versão a partir de um branch desatualizado.
  git fetch --quiet origin "$RELEASE_BRANCH"
  if [[ "$(git rev-list --count "HEAD..origin/${RELEASE_BRANCH}")" != "0" ]]; then
    echo "O branch local está atrás de origin/${RELEASE_BRANCH}. Rode git pull antes do release." >&2
    exit 1
  fi
fi

echo "Criando nova versão a partir de '${RELEASE_BRANCH}'."

npx --no-install standard-version -a --releaseCommitMessageFormat "chore(release): {{currentTag}} - $DATE" "$@"

if [[ "$IS_DRY_RUN" == "true" ]]; then
  exit 0
fi

RELEASE_VERSION="$(node -p "require('./package.json').version")"
RELEASE_TAG="v${RELEASE_VERSION}"

if ! git rev-parse --verify --quiet "refs/tags/${RELEASE_TAG}" >/dev/null; then
  echo "A tag esperada ${RELEASE_TAG} não foi criada." >&2
  exit 1
fi

git push --atomic origin "HEAD:${RELEASE_BRANCH}" "refs/tags/${RELEASE_TAG}"

REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
OWNER="$(echo "${REPO_SLUG%%/*}" | tr '[:upper:]' '[:lower:]')"
REPO="$(echo "${REPO_SLUG##*/}" | tr '[:upper:]' '[:lower:]')"

echo
echo "Tag ${RELEASE_TAG} enviada. O GitHub Actions vai publicar:"
echo "  ghcr.io/${OWNER}/${REPO}-api:${RELEASE_TAG}"
echo "  ghcr.io/${OWNER}/${REPO}-web:${RELEASE_TAG}"
echo "Acompanhe em https://github.com/${REPO_SLUG}/actions"
