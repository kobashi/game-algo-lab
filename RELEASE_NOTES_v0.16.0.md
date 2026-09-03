# Game Algo Lab v0.16.0 — 試作版（Preview）

URL パラメータの **step 検査**と、調整課題用パラメータの追加です。  
ready トピック数は **110** のまま。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.16.0

## 本版の主な内容（v0.15.0 以降）

### step 検査
- `range` / `number` で `step` に合わない値は clamp せず却下し、日本語警告を出す
- 例: `?vx=3`（step=5）は無視。コピーした URL の往復は従来どおり

### 調整課題用パラメータ

| id | 内容 |
|----|------|
| `input-basics` | 長押し閾値を URL `longms` で指定 |
| `circle-collision` | 半径・箱サイズのスライダー。位置も含めて URL（`ax,ay,ar` など） |
| `sfx-events` | イベントごとの周波数・長さ・音量を上書き。URL `ev,freq,dur,gain` |

URL 対応は先行 8 本に上記 3 本を加え **11 本**。minimax / fsm は未着手。

## 検証

```bash
python3 scripts/smoke-platform.py
```

---

prerelease / 試作版。前版: [v0.15.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.15.0)。
