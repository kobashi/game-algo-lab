# Game Algo Lab — セッション引き継ぎ

最終更新: 2026-07-17  
パス: `~/Project`（`/Users/nagoyabunridaigakujouhoumediagakuka/Project`）

新セッション開始時の指示例:

> `~/Project` の Game Algo Lab を続ける。引き継ぎは `HANDOFF.md` と `docs/ROADMAP.md` を読んで。

---

## プロジェクト概要

- **名前**: Game Algo Lab  
- **目的**: ゲームプログラミングのアルゴリズムを **可視化 + インタラクティブ操作** で学ぶ教材  
- **公開**: GitHub Pages 前提（静的 HTML/CSS/JS、ビルド不要）  
- **受講生**: C# → `samples/*.cs`  
- **ローカル**: `cd ~/Project && python3 -m http.server 8080` → http://localhost:8080  
- **Git**: 既定ブランチ `main`。運用は `docs/WORKFLOW.md`  

---

## 今後の方針（要約）

1. **トピック拡大とカテゴリ化** — 経路探索 / ゲーム木 / 物理 / 設計パターン（`docs/topics/CATALOG.md`）  
2. **共通基盤** — UI・用語・ファイル規約の統一（`docs/PLATFORM.md`）  
3. **分業** — SPEC 先行 → 実装ブランチ → チェックリスト（`docs/WORKFLOW.md`、`docs/templates/`）  

詳細: [docs/ROADMAP.md](docs/ROADMAP.md) / 索引: [docs/README.md](docs/README.md)

---

## 実装済みトピック（ready: true）

| 順 | トピック | ページ | 地図 | C# | 要点 |
|----|----------|--------|------|-----|------|
| 1 | BFS | `algorithms/bfs.html` | `js/maps/bfs-map.js` | `BfsExample.cs` | 歩数最少。大=歩数、小=経路コスト c |
| 2 | DFS | `algorithms/dfs.html` | `js/maps/dfs-map.js` | `DfsExample.cs` | コールスタック + BT。方向: 右→下→左→上 |
| 3 | ダイクストラ | `algorithms/dijkstra.html` | `js/maps/dijkstra-map.js` | `DijkstraExample.cs` | 優先度 = g |
| 4 | 最良優先 | `algorithms/best-first.html` | `js/maps/best-first-map.js` | `BestFirstExample.cs` | 優先度 = h |
| 5 | A* | `algorithms/astar.html` | `js/maps/astar-map.js` | `AStarExample.cs` | f = g + h |

共通:

- 地図記号: `S` `G`(複数可) `#` `.` `0` `1` `2` `n`(-1)。`js/map-format.js`  
- ペイント: コスト / 壁 / **G（追加・削除、複数）**。ゴール最低1つ  
- h（複数ゴール時）: 最近傍 G へのマンハッタン  
- DS: `js/ds-viz.js`。親ポインタは HTML 固定タブ + JS 更新  
- 初期地図は `js/maps/*-map.js` をエディタ編集  

---

## メニューのみ（ready: false）

ゲーム木（この順で SPEC → 実装）:

1. AND-OR → 2. Min-Max → 3. α-β → 4. モンテカルロ → 5. 多腕バンディット  

その他: AABB、ステートマシン  

定義: `js/main.js` の `TOPICS` ＋ `docs/topics/CATALOG.md`

---

## UI / レイアウト合意

- 縦長: ゲーム群の下に DS / 横長: 左ゲーム群 | 右 DS  
- 操作1行目: 再生・ステップ・再読込・速度・式  
- 操作2行目: コスト + 壁 + G  
- 解説は `<details>`  

---

## 重要な設計メモ

### BFS
- コストは参考。探索順は歩数のみ  

### DFS
- コールスタック明示シミュレート  

### A* 前後
- ダイクストラ = g、最良優先 = h、A* = g+h  
- 負コストで admissibility が崩れるデモあり  

### 複数ゴール
- `goals[]`。到達時に `foundGoal` で経路復元  
- 地図パーサは `goals` 配列（互換で `goal` = 先頭）  

---

## Git / 公開

- ローカルに Git 履歴あり。リモート push は `gh auth` 後  
- `scripts/publish-github.sh`  
- タグ例: `v1.0.0`  

---

## 作業時の注意

- 新トピックは **SPEC を先に**（`docs/templates/SPEC.md`）  
- 共通 CSS / ds-viz / map-format を変えたら PLATFORM を更新  
- `interactive_game_programming_material_plan.docx` は Git 対象外（`.gitignore`）  
