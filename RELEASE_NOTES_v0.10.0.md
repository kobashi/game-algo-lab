# Game Algo Lab v0.10.0 — 試作版（Preview）

**ready 67 トピック**。Wave A〜F 入口まで一気に拡張した大型試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.10.0

## 本版の主な追加（v0.9.8 以降）

### プロシージャル
重み付き抽選 · 制約付き生成 · ダンジョン · ノイズ地形

### 物理・判定
速度 · 加減速 · 重力 · 摩擦 · 円衝突 · 応答 · 運動量 · レイ · OBB/SAT · Swept · 回転 · 回転衝突 · 複合コライダー など

### 空間分割
総当たり · グリッド · Broad/Narrow · SaP · 四分木 · BVH

### ゲーム AI
Seek/Flee/Arrive · Wander · Boids · Leader · ビヘイビアツリー

### 設計・品質・HCI
イベント · プール · コマンド · 継承/Comp · ECS · セーブ · リプレイ · デバッグ · プロファイリング · コヨーテ · 入力バッファ · 入力抽象 · コマンド入力

### サウンド（入口）
イベントと効果音（Web Audio トーン + ログ）

## 健全性

```bash
python3 scripts/smoke-platform.py   # ALL PASSED
```

## ローカル確認

```bash
python3 -m http.server 8080
# http://localhost:8080
```
