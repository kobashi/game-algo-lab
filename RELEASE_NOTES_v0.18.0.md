# Game Algo Lab v0.18.0 — 試作版（Preview）

調整課題向けに、デモの**観測性**を改善しました。  
ready トピック数は **110** のまま。

## 公開

- **Source**: `main` / `/ (root)`
- **教材**: https://kobashi.github.io/game-algo-lab/
- **Release**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.18.0

## 本版の主な内容（v0.17.0 以降）

- 中央の矩形障害物（重なったら反射、重ならなければすり抜け）。`velocity-motion` / `accel-gravity`
- 再生速度 0.1〜1.0×、軌跡点、繰り返し再生
- `game-loop`: 実負荷ボール 1〜200、実測 FPS（15未満が続くと半減）
- `input-basics`: 時間軸の帯グラフ
- `gfx-camera`: デッドゾーン・target と cam の遅れ
- `circle-collision`: 矢印キー 1px、接触ぎりぎり表示
- `gfx-ui-canvas`: 幅の連続スライダー
- `sfx-events`: 波形と包絡線、直前の音の再生
- `fsm`: 到達不能（灰）と出口なし（赤）
- `minimax`: 前回の根の値、葉クリック ±1

## 検証

```bash
python3 scripts/smoke-platform.py
```

---

prerelease / 試作版。前版: [v0.17.0](https://github.com/kobashi/game-algo-lab/releases/tag/v0.17.0)。
