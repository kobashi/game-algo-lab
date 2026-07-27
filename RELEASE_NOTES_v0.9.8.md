# Game Algo Lab v0.9.8 — 試作版（Preview）

**プロシージャル**カテゴリの入口として **迷路生成** を追加した試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **迷路生成**: https://kobashi.github.io/game-algo-lab/algorithms/maze-gen.html
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.8

## 本版の追加

### 迷路生成 (`maze-gen`)
- **Recursive Backtracker (DFS)** — 長い廊下になりやすい
- **Prim 風（frontier）** — 枝分かれが増えやすい
- シード付き（Mulberry32）で再現可能
- 再生 / 1ステップ / 一括生成

## カテゴリの位置づけ

```
乱数とシード → 迷路生成 →（予定）ダンジョン・ノイズ・制約付き生成
```

## 検証

- `python3 scripts/smoke-platform.py` ALL PASSED（**24** トピック ready）
