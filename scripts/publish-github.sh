#!/usr/bin/env bash
# Game Algo Lab を GitHub に push し、Pages 有効化 + Release（試作版）
#
# 事前:
#   export PATH="$HOME/.local/bin:$PATH"
#   gh auth login -h github.com -p https -w
#
# 使い方:
#   ./scripts/publish-github.sh [repo-name] [tag]
# 例:
#   ./scripts/publish-github.sh game-algo-lab v0.9.0
#
set -euo pipefail
export PATH="${HOME}/.local/bin:${PATH}"

REPO_NAME="${1:-game-algo-lab}"
TAG="${2:-v0.9.0}"
NOTES_FILE="RELEASE_NOTES_${TAG}.md"
# tag にドットが含まれるのでファイル名は v0.9.0 → RELEASE_NOTES_v0.9.0.md
NOTES_FILE="RELEASE_NOTES_${TAG}.md"

cd "$(dirname "$0")/.."

if [[ ! -f "${NOTES_FILE}" ]]; then
  echo "Release notes がありません: ${NOTES_FILE}"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "先に GitHub にログインしてください:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "  gh auth login -h github.com -p https -w"
  exit 1
fi

USER=$(gh api user -q .login)
echo "GitHub user: ${USER}"
echo "Repo: ${USER}/${REPO_NAME}"
echo "Tag: ${TAG}"

# remote 未設定なら作成して push
if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create "${REPO_NAME}" --public --source=. --remote=origin --push \
    --description "Game Algo Lab — ゲームアルゴリズム可視化教材 (GitHub Pages・試作版)"
else
  git push -u origin main
fi

# タグがローカルに無ければ作成（現在の HEAD）
if ! git rev-parse "${TAG}" >/dev/null 2>&1; then
  git tag -a "${TAG}" -m "Game Algo Lab ${TAG} 試作版"
fi
git push origin "${TAG}" 2>/dev/null || git push origin --tags
git push -u origin main

# Pages: main branch, root（既存なら更新を試行）
gh api -X POST "repos/${USER}/${REPO_NAME}/pages" \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/ 2>/dev/null \
  || gh api -X PUT "repos/${USER}/${REPO_NAME}/pages" \
       -f build_type=legacy \
       -f source[branch]=main \
       -f source[path]=/ 2>/dev/null \
  || true

# Release（試作版）
if gh release view "${TAG}" >/dev/null 2>&1; then
  echo "Release ${TAG} already exists — 更新する場合は gh release edit を使ってください"
else
  gh release create "${TAG}" \
    --title "${TAG} 試作版 — Game Algo Lab" \
    --notes-file "${NOTES_FILE}" \
    --prerelease
fi

# Pages 設定の確認表示
echo ""
echo "---"
echo "Repository: https://github.com/${USER}/${REPO_NAME}"
echo "Pages (数分後): https://${USER}.github.io/${REPO_NAME}/"
echo "Release: https://github.com/${USER}/${REPO_NAME}/releases/tag/${TAG}"
echo ""
echo "Pages が 404 のときは GitHub の Settings → Pages で"
echo "  Source = Deploy from a branch, Branch = main, / (root)"
echo "を確認してください。"
