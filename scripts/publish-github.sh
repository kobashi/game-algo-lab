#!/usr/bin/env bash
# Game Algo Lab を GitHub に push し、Pages 有効化 + Release v1.0.0
# 事前: gh auth login 済みであること
set -euo pipefail
export PATH="${HOME}/.local/bin:${PATH}"

REPO_NAME="${1:-game-algo-lab}"
cd "$(dirname "$0")/.."

if ! gh auth status >/dev/null 2>&1; then
  echo "先にログインしてください:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "  gh auth login -h github.com -p https -w"
  exit 1
fi

USER=$(gh api user -q .login)
echo "GitHub user: ${USER}"
echo "Repo: ${USER}/${REPO_NAME}"

# remote 未設定なら作成して push
if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create "${REPO_NAME}" --public --source=. --remote=origin --push \
    --description "Game Algo Lab — ゲームアルゴリズム可視化教材 (GitHub Pages)"
else
  git push -u origin main
fi

# tags
git push origin v1.0.0 2>/dev/null || git push origin --tags

# Pages: main branch, root
# API may fail if already enabled — ignore error
gh api -X POST "repos/${USER}/${REPO_NAME}/pages" \
  -f build_type=legacy \
  -f source[branch]=main \
  -f source[path]=/ 2>/dev/null \
  || gh api -X PUT "repos/${USER}/${REPO_NAME}/pages" \
       -f build_type=legacy \
       -f source[branch]=main \
       -f source[path]=/ 2>/dev/null \
  || true

# Release
if gh release view v1.0.0 >/dev/null 2>&1; then
  echo "Release v1.0.0 already exists"
else
  gh release create v1.0.0 \
    --title "v1.0.0 — Game Algo Lab" \
    --notes-file RELEASE_NOTES_v1.0.0.md
fi

echo ""
echo "Repository: https://github.com/${USER}/${REPO_NAME}"
echo "Pages (数分後): https://${USER}.github.io/${REPO_NAME}/"
echo "Release: https://github.com/${USER}/${REPO_NAME}/releases/tag/v1.0.0"
