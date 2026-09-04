# `js/platform` — 共通基盤

教材トピックを増やすときの **共有モジュール**。ビルド不要の ES modules。

| ファイル | 役割 |
|----------|------|
| `text.js` | `escapeHtml` / `escapeXml` |
| `dom.js` | ステータス、結果パネル、C# テキスト読込 |
| `pseudocode.js` | 疑似コード行ハイライト（`createPseudocode`）— 実行ステップと同期。強調行は **パネル内だけ** スクロール（ウィンドウ／Map は動かさない） |
| `playback.js` | 再生・一時停止・速度スケジュール |
| `chunked-run.js` | ジェネレータを時間分割で駆動する `runChunked`（重い解析で UI を固めない） |
| `rng.js` | シード付き PRNG（再現実験） |
| `tree-layout.js` | ゲーム木の水平レイアウト。存在する子節点だけを置く（欠けた `children` id には枝を引かない）。`applySvgSize` は既定で親幅にフィット（横スクロール抑制） |
| `grid-paint.js` | 経路探索マップの塗り（`bindMapPaint` 等） |
| `pathfinding-grid.js` | グリッド幾何・下地描画（`drawPathfindingGrid`） |
| `topic-shell.js` | 共通ヘッダー／フッター（`mountTopicShellFromDataset`）。`NAV_GROUPS.course` は `courses/` 入口用 |
| `maturity.js` | 成熟度・修正回数・更新日（`TOPIC_META`）・バッジ |
| `url-params.js` | URL クエリで初期コントロールを指定 / 共有 URL コピー（`applyParamsToControls` / `mountShareLink`） |
| `observe.js` | 軌跡点・再生速度スケール・円と矩形の重なり／すり抜け／反射 |
| `index.js` | 上記の一括 export |

経路探索の再生待ち時間はスライダーが大きいほど速いため  
`createPlayback({ delayFromSpeed: (v) => 450 - v, ... })` を使う。

既存のまま残す関連:

| パス | 役割 |
|------|------|
| `js/ds-viz.js` | Queue / Stack / Set / 親ポインタ等の DS 可視化。各ブロックはタイトルで折りたたみ（再生中も状態維持）。集合・親ポインタリスト・コールスタックは新しい要素が上。キューは FIFO（左が先頭） |
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

重い解析をチャンク実行する（4×4オセロで新設。`solveNode` 等の再帰探索を
ジェネレータ化し、一定訪問数ごとに `yield` するだけで組み込める）:

```js
import { runChunked } from "./platform/index.js";

function* heavyWork() {
  for (let i = 0; i < 1e7; i++) {
    if (i % 400 === 0) yield; // ここで一旦制御を返してよい、という区切り
  }
  return 42;
}

runChunked(heavyWork(), {
  chunkMs: 16, // 1チャンクの持ち時間（既定16ms）
  onProgress: () => setStatus("解析中…"),
  onDone: (result) => setStatus(`完了: ${result}`),
});
```

HTML シェル:

```html
<header class="site-header" id="site-header" data-nav="pathfinding" data-active="bfs"></header>
<!-- … main … -->
<footer class="site-footer" id="site-footer" data-note="任意の注記"></footer>
```

```js
import { mountTopicShellFromDataset } from "./platform/index.js";
mountTopicShellFromDataset(); // ヘッダー + フッター
```

経路探索・ゲーム木・説明特化 UI の違いは `docs/PLATFORM.md` を参照。

URL クエリで初期値を指定する（授業課題の個別配布。先行は rng-seed / tic-tac-toe / coyote-time）:

```js
import { applyParamsToControls, mountShareLink } from "./platform/index.js";

const spec = {
  preset: { el: els.preset, kind: "select" }, // 先に適用（個別パラメータより前）
  a: { el: els.lcgA, kind: "number" },
};

// 呼び出した時点の値を既定として覚えるので、apply より先に呼ぶ
mountShareLink({
  spec,
  button: document.getElementById("btn-copy-url"),
});
applyParamsToControls(spec);
```

- `kind` は `"number" | "range" | "checkbox" | "select" | "text"`。範囲外・不明値は clamp せず却下し、`#status` に日本語警告を出す。`text` は値をそのまま入れる（内容の検査はトピック側）。
- `number` / `range` は `step` 属性が正の数値のとき、min（無ければ 0）からの刻みに合わない値も却下する（ブラウザのスナップで黙って化けないように）。
- 共有 URL はコピーボタン押下時だけ生成する（`history.replaceState` しない）。既定値と同じキーは付けない。
- HTML のボタン id は `btn-copy-url`。
