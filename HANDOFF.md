# Game Algo Lab — セッション引き継ぎ

最終更新: 2026-07-15  
パス: `~/Project`（`/Users/nagoyabunridaigakujouhoumediagakuka/Project`）

新セッション開始時の指示例:

> `~/Project` の Game Algo Lab を続ける。引き継ぎは `HANDOFF.md` を読んで。

---

## プロジェクト概要

- **名前**: Game Algo Lab  
- **目的**: ゲームプログラミングのアルゴリズムを **可視化 + インタラクティブ操作** で学ぶ教材  
- **公開**: GitHub Pages 前提（静的 HTML/CSS/JS、ビルド不要）  
- **受講生**: C# を使用 → 各トピックに `samples/*.cs`（デモと 1:1 対応は不要）  
- **ローカル確認**: `cd ~/Project && python3 -m http.server 8080` → http://localhost:8080  

---

## 実装済みトピック（ready: true）

| 順 | トピック | ページ | 地図 | C# | 要点 |
|----|----------|--------|------|-----|------|
| 1 | BFS | `algorithms/bfs.html` | `js/maps/bfs-map.js` | `BfsExample.cs` | 歩数最少。コストは参考。大=歩数、小=経路コストc |
| 2 | DFS | `algorithms/dfs.html` | `js/maps/dfs-map.js` | `DfsExample.cs` | 再帰相当をコールスタックでステップ。BT可視化。方向: 右→下→左→上 |
| 3 | ダイクストラ | `algorithms/dijkstra.html` | `js/maps/dijkstra-map.js` | `DijkstraExample.cs` | 優先度=g のみ |
| 4 | 最良優先 | `algorithms/best-first.html` | `js/maps/best-first-map.js` | `BestFirstExample.cs` | 優先度=h のみ |
| 5 | A* | `algorithms/astar.html` | `js/maps/astar-map.js` | `AStarExample.cs` | f=g+h |

共通:

- 地図記号: `S` `G` `#` `.` `0` `1` `2` `n`(-1)。パーサ: `js/map-format.js`  
- **初期地図はエディタで `js/maps/*.js` を編集**（ブラウザのコスト塗りは任意の試し）  
- データ構造パネル: `js/ds-viz.js`（Queue/Set/優先度オープン/親ポインタ list+tree/コールスタック）  
- 親ポインタ: タブ「リスト / ツリー」は **HTML 固定**（`#ds-parent-*`）。中身だけ JS 更新  
- ツリー: 枝付き・同深度揃え。`.ds-node-tree` 枠内スクロール（はみ出し防止済み）  

---

## メニューのみ（ready: false・未実装）

ゲーム木シリーズ（この順で実装予定）:

1. **AND-OR 探索** → `algorithms/and-or.html`（予定）  
2. **Min-Max 探索** → `algorithms/minimax.html`  
3. **α-β 法**（ギリシャ文字表記）→ `algorithms/alpha-beta.html`  
4. **モンテカルロ法** → `algorithms/monte-carlo.html`  
5. **多腕バンディット** → `algorithms/multi-armed-bandit.html`  

その他準備中: AABB 衝突判定、ステートマシン  

定義場所: `js/main.js` の `TOPICS` 配列  

---

## UI / レイアウト合意

- **レスポンシブ**: 縦長＝ゲーム群の下に DS、横長＝左ゲーム群 | 右 DS  
- **ゲーム群** (`.demo-game-group`): 盤面 + 操作（操作は盤面とグループ、DS の間に挟まない）  
- **操作パネル**:  
  - 1行目: 操作（再生/1ステップ/再読込）・速度・式（ある場合）— 折り返しなし  
  - 2行目: **コスト** ラベル + ボタン（-1/0/1/2/壁）  
  - 操作パネル自体はスクロール不要（結果比較だけ長いときスクロール可）  
- 解説は `<details>` 折りたたみ  

---

## 重要な設計メモ

### BFS
- コストは参考値。探索順は歩数のみ  
- 探索済み表示: **大=歩数（深さ）**、**小=経路コスト c**（マス元コストは非表示）  

### DFS
- コールスタックを明示シミュレート（入場 → 子呼び出し → return/BT）  
- 初期地図は右優先で袋小路に入りバックトラックする迷路  

### A* 前後
- Dijkstra = g、Best-First = h、A* = g+h という教材ストーリー  

### ミニゲーム案
- エージェント側のミニゲーム提案は **保留**  
- **ユーザー側から提案する**方針  

---

## 主要パス

```
Project/
├── index.html, README.md, HANDOFF.md
├── algorithms/*.html
├── css/style.css
├── js/
│   ├── main.js          # メニュー TOPICS
│   ├── map-format.js, ds-viz.js
│   ├── bfs.js, dfs.js, dijkstra.js, best-first.js, astar.js
│   └── maps/*-map.js
└── samples/*.cs
```

メニュー追加: `js/main.js` に1件 + ナビは各 `algorithms/*.html`  
新トピック実装: A* or DFS の HTML/JS 構成を踏襲  

---

## 未実施・次にやること（候補）

1. ゲーム木シリーズ実装開始（ユーザー案のミニゲーム待ち。入口は AND-OR）  
2. Git / GitHub Pages 公開（環境によっては Xcode CLT 要）  
3. ナビが長い場合の UI 整理（モバイル）  

---

## ユーザー方針（記憶しておくこと）

- 日本語でやり取り  
- 初期地図は **エディタで map ファイル編集**  
- C# サンプルは受講生向け・デモ完全対応不要  
- α-β の表記は **ギリシャ文字 α-β**  
- コンテキスト逼迫時: `/compact`、`/flush`、本ファイル、`/resume`  
