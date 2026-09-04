# Game Algo Lab v0.19.0 — 試作版（Preview）

`game-loop` の観測設計を修正しました。  
ready トピック数は **110** のまま。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.19.0

## 本版の主な内容（v0.18.0 以降）

- 負荷ボールの乱数を排除。全員同じ高さ・初速 0 から落ちる
- ボール数を変えるとシミュレーションを初期化（途中から湧かない）
- 停止時に結果を数値で残し、前回と比較（更新回数・最高点・停止時間など）
- 主役は中央 1 個。負荷は床下の帯（描画オン/オフ可）
- 可変と固定を左右に並べて同時実行できる

## 検証

```bash
python3 scripts/smoke-platform.py
```

---

prerelease / 試作版。前版: [v0.18.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.18.0)。
