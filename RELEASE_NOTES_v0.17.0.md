# Game Algo Lab v0.17.0 — 試作版（Preview）

調整課題用パラメータの残り2本（`minimax` / `fsm`）です。  
ready トピック数は **110** のまま。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.17.0

## 本版の主な内容（v0.16.0 以降）

| id | 内容 |
|----|------|
| `minimax` | 葉の評価値（カンマ区切り・左から12個）と深さ制限（1/2/3）。打ち切り節点は評価 0。URL `leaves`, `depth` |
| `fsm` | 初期状態、遷移1本の上書き、デモのイベント列。到達不能状態は灰色。URL `initial`, `from`, `ev`, `to`, `script` |

URL 対応は先行 11 本に上記 2 本を加え **13 本**。`kind: "text"` を `url-params.js` に追加（カンマ区切り用）。

## 検証

```bash
python3 scripts/smoke-platform.py
```

---

prerelease / 試作版。前版: [v0.16.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.16.0)。
