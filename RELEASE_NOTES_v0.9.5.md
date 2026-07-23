# Game Algo Lab v0.9.5 — 試作版（Preview）

基礎実行モデルに **座標変換** を追加した試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.5

## 本版の追加

### 座標変換 (`coordinates`)
- ローカル / ワールド / スクリーンの 2D 変換
- 親の位置・回転と子のローカル座標の合成
- カメラ（位置 + zoom）
- クリックによる screen→world→local の逆変換
- デモ: https://kobashi.github.io/game-algo-lab/algorithms/coordinates.html

## 基礎実行モデル（現状）

```
game-loop → time-management → input-basics → coordinates →（次）rng-seed
```

## 検証

- `python3 scripts/smoke-platform.py` ALL PASSED（**22** トピック ready）
