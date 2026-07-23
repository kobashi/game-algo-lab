# Game Algo Lab v0.9.6 — 試作版（Preview）

基礎実行モデルの最終トピック **乱数とシード** を追加し、カテゴリ 5 本を完了した試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.6

## 本版の追加

### 乱数とシード (`rng-seed`)
- シード付き PRNG（platform の **Mulberry32**）
- 同じシードで系列が再現することの確認
- ヒストグラム・[0,1) 一覧・1〜6 ダイス写像
- デモ: https://kobashi.github.io/game-algo-lab/algorithms/rng-seed.html

## 基礎実行モデル（完了）

```
game-loop → time-management → input-basics → coordinates → rng-seed
```

すべて `ready: true`。

## 検証

- `python3 scripts/smoke-platform.py` ALL PASSED（**23** トピック ready）
