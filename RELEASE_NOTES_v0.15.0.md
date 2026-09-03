# Game Algo Lab v0.15.0 — 試作版（Preview）

授業課題の設定提出用に、**URL パラメータ対応を5トピックへ拡張**したリリースです。  
ready トピック数は **110** のまま（新規デモなし）。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.15.0

## 本版の主な内容（v0.14.0 以降）

既存の `js/platform/url-params.js` を次の5本に適用（コピーボタン「この設定のURLをコピー」付き）。

| id | 例 |
|----|-----|
| `game-loop` | `?mode=variable&dt=20&lag=10&maxsteps=4`（再生間隔は含めない） |
| `velocity-motion` | `?vx=5&vy=-5&dt=10&bounce=0` |
| `accel-gravity` | `?g=20&vx=5&rest=0.2` |
| `gfx-ui-canvas` | `?anchor=top-right&px=0.5&py=0.5` |
| `gfx-camera` | `?follow=0.2&dead=40` |

先行3本（`rng-seed` / `tic-tac-toe` / `coyote-time`）と合わせ、URL 対応は **8本**。

## 検証

```bash
python3 scripts/smoke-platform.py
```

## 次の候補

- 授業運用後、対象トピックを増やすか判断
- CANDIDATE 優先度 B 続き
- oneshot → revised / stable

---

prerelease / 試作版。前版: [v0.14.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.14.0)。
