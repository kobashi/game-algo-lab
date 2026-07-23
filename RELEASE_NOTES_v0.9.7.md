# Game Algo Lab v0.9.7 — 試作版（Preview）

**乱数とシード**デモを拡張し、アルゴリズム切替（Mulberry32 / XorShift32 / LCG）と
LCG・XorShift のパラメータ体験を追加した試作リリースです。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **乱数デモ**: https://kobashi.github.io/game-algo-lab/algorithms/rng-seed.html
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.7

## 本版の変更（rng-seed 改訂）

### アルゴリズム切替
- **Mulberry32**（サイト標準・platform）
- **XorShift32** — シフト (a,b,c) のプリセット（質の悪い例 / Marsaglia 標準 / 代替）と手動調整
- **線形合同法 (LCG)** — `X'=(aX+c) mod m`。プリセットと a,c,m 手動調整

### LCG プリセット
- 質が悪い: 極小 m=16、悪い a
- 許容（教材）: m=31 / m=64（周期を数え切れる）
- 実用寄り: glibc 風 / Numerical Recipes 風

### XorShift プリセット
- 質が悪い: (1,1,1)、(5,0,5)
- 標準: Marsaglia (13,17,5)
- 許容: (7,9,13)

### 学習 UI
- 同設定での再生成（再現性）
- ヒストグラム
- 周期計測（LCG: m≤65536 / XorShift: 短いループ検出）

成熟度: `rng-seed` → **revised**（修正 1）

## 検証

- `python3 scripts/smoke-platform.py` ALL PASSED
