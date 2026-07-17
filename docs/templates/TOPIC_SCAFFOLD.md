# 新規トピック追加スキャフォールド

最終更新: 2026-07-17

新しい教材トピックを足すときの **チェックリスト + ファイル雛形**。  
詳細仕様は `SPEC.md` テンプレ、方針は `docs/PLATFORM.md` / `docs/WORKFLOW.md`。

---

## 0. 決めること

| 項目 | 例 |
|------|-----|
| id | `spatial-hash`（英小文字・ハイフン） |
| カテゴリ | 経路探索 / ゲーム木 / 物理・判定 / 設計パターン / 新規 |
| UI 型 | `pathfinding` / `game-tree` / `explain`（非マップ説明） |
| 学習目標 | 3 つ以内 |

---

## 1. ファイルを作る

```
docs/topics/<id>/SPEC.md     ← templates/SPEC.md をコピー
algorithms/<id>.html
js/<id>.js
js/maps/<id>-*.js            ← 初期データ（任意）
samples/<Name>Example.cs
```

共通ロジックは **再発明しない**:

```js
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  layoutTree,      // ゲーム木
  mulberry32,      // 乱択
} from "./platform/index.js";
import { setPanel, renderCallStack, /* ... */ } from "./ds-viz.js";
// 経路探索なら
import { parseMap } from "./map-format.js";
```

---

## 2. HTML の最低骨格

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>（タイトル）— Game Algo Lab</title>
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body class="topic-body">
  <!-- data-nav: pathfinding | game-tree | explain | default -->
  <header class="site-header" id="site-header" data-nav="explain" data-active="your-id"></header>
  <main class="container container-wide topic-main">
    <div class="page-header page-header-compact">
      <p class="breadcrumb">…</p>
      <h1>…</h1>
      <p class="page-header-lead">…</p>
    </div>
    <details class="lesson-details"><summary>…</summary>…</details>

    <!-- pathfinding / game-tree: .demo-workspace -->
    <!-- explain: 独自レイアウト（AABB/FSM を参考） -->

    <div id="status" class="status-log" role="status">準備完了</div>
    <section class="code-section">
      <pre class="code-block" id="csharp-sample"><code>// 読み込み中…</code></pre>
    </section>
  </main>
  <footer class="site-footer" id="site-footer" data-note="任意"></footer>
  <script type="module" src="../js/<id>.js"></script>
</body>
</html>
```

操作ボタンの id 慣習:

| id | 用途 |
|----|------|
| `btn-play` | 再生 / 自動デモ |
| `btn-step` | 1ステップ |
| `btn-reset` | リセット |
| `speed` | 速度 range |
| `status` | 状態ログ |
| `result-compare` | 結果 HTML（任意） |
| `csharp-sample` | C# 表示先 |
| `ds-panels` | DS 可視化（任意） |

---

## 3. JS の最低骨格

```js
import {
  createStatus,
  createResultPanel,
  createPlayback,
  loadTextSample,
  mountTopicShellFromDataset,
} from "./platform/index.js";

mountTopicShellFromDataset();

const setStatus = createStatus(document.getElementById("status"));
const result = createResultPanel(document.getElementById("result-compare"));

function stepOnce() {
  // …1手進める。継続可能なら true
  return false;
}

const playback = createPlayback({
  btnPlay: document.getElementById("btn-play"),
  speedEl: document.getElementById("speed"),
  onTick: () => stepOnce(),
});

document.getElementById("btn-play")?.addEventListener("click", () => {
  playback.toggle(() => { /* finished ならリセット */ });
});
document.getElementById("btn-step")?.addEventListener("click", () => {
  playback.stop();
  stepOnce();
});
document.getElementById("btn-reset")?.addEventListener("click", () => {
  /* 初期化 */
});

loadTextSample("../samples/XxxExample.cs", document.getElementById("csharp-sample"));
```

---

## 4. 登録

1. `js/main.js` の `TOPICS` に1件（`category` / `badge` / `ready`）  
2. `docs/topics/CATALOG.md` に1行  
3. 完成後 `ready: true`  
4. `HANDOFF.md` を短く更新  

---

## 5. やってはいけないこと

- `js/platform` や `ds-viz` にある処理をコピペで増やす（先に API を足す）  
- 経路探索グリッドを、AABB/FSM のような説明トピックに無理に流用する  
- `ready: true` のまま壊れたデモを main に載せる  

---

## 6. 共通基盤に「足りない」とき

1. `js/platform/` に小さく API を追加（または `ds-viz.js`）  
2. `docs/PLATFORM.md` と `js/platform/README.md` を同じ PR で更新  
3. 可能なら既存1デモを先に新 API へ載せ替えて検証  
