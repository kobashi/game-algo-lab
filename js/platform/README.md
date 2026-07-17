# `js/platform` — 共通基盤

教材トピックを増やすときの **共有モジュール**。ビルド不要の ES modules。

| ファイル | 役割 |
|----------|------|
| `text.js` | `escapeHtml` / `escapeXml` |
| `dom.js` | ステータス、結果パネル、C# テキスト読込 |
| `playback.js` | 再生・一時停止・速度スケジュール |
| `rng.js` | シード付き PRNG（再現実験） |
| `tree-layout.js` | ゲーム木の水平レイアウト |
| `grid-paint.js` | 経路探索マップの塗り（`bindMapPaint` 等） |
| `index.js` | 上記の一括 export |

経路探索の再生待ち時間はスライダーが大きいほど速いため  
`createPlayback({ delayFromSpeed: (v) => 450 - v, ... })` を使う。

既存のまま残す関連:

| パス | 役割 |
|------|------|
| `js/ds-viz.js` | Queue / Stack / Set / 親ポインタ等の DS 可視化 |
| `js/map-format.js` | 経路探索グリッド地図パーサ |
| `css/style.css` | 見た目の共通トークン・レイアウト |

## 使い方（新規トピック）

```js
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
} from "./platform/index.js";

const setStatus = createStatus(document.getElementById("status"));
const result = createResultPanel(document.getElementById("result-compare"));
const playback = createPlayback({
  btnPlay: document.getElementById("btn-play"),
  speedEl: document.getElementById("speed"),
  onTick: () => stepOnce(), // true で継続
});

loadTextSample("../samples/XxxExample.cs", document.getElementById("csharp-sample"));
```

経路探索の塗り:

```js
import { bindMapPaint, createPlayback } from "./platform/index.js";

bindMapPaint({
  canvas,
  paintGroup,
  cellSize: CELL,
  isBusy: () => playback.running,
  getContext: () => ({
    walls, costs, goals, start,
    inBounds, isStart, isGoal,
  }),
  onEdit: () => afterEdit(),
  setStatus,
});

// 速度スライダーが「大きいほど速い」系（BFS 等）
createPlayback({
  speedEl,
  delayFromSpeed: (v) => 450 - v,
  onTick: () => stepOnce(),
});
```

経路探索・ゲーム木・説明特化 UI の違いは `docs/PLATFORM.md` を参照。
