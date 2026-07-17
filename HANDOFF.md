# Game Algo Lab — セッション引き継ぎ

最終更新: 2026-07-17  
パス: `~/Project`（`/Users/nagoyabunridaigakujouhoumediagakuka/Project`）

新セッション開始時の指示例:

> `~/Project` の Game Algo Lab を続ける。引き継ぎは `HANDOFF.md` と `docs/ROADMAP.md` を読んで。計画の正本は `docs/interactive_game_programming_material_plan.docx`（策定 2026年7月）。

---

## プロジェクト概要

- **名前**: Game Algo Lab  
- **目的**: ゲームプログラミングのアルゴリズムを **可視化 + インタラクティブ操作** で学ぶ教材  
- **公開**: GitHub Pages 前提（静的 HTML/CSS/JS、ビルド不要）  
- **受講生**: C# → `samples/*.cs`  
- **ローカル**: `cd ~/Project && python3 -m http.server 8080` → http://localhost:8080  
- **Git**: 既定ブランチ `main`。運用は `docs/WORKFLOW.md`  
- **共通基盤**: `js/platform/`  
  - 再生・乱数・木レイアウト・塗り（`bindMapPaint`）・グリッド下地  
  - **シェル**: `mountTopicShellFromDataset()`（`#site-header` + `#site-footer`）  
  - 経路探索再生: `delayFromSpeed: (v) => 450 - v`  
- **追加手順**: `docs/templates/TOPIC_SCAFFOLD.md`  
- **成熟度（修正状況）**: `docs/topics/MATURITY.md` + `docs/topics/CATALOG.md`  
  - `oneshot` 一発未調整 / `revised` 改訂・調整 / `stable` 安定版  
  - ドキュメント: CATALOG。Web: `js/main.js` + `js/platform/maturity.js`（凡例・カード・デモページ）  
  - 成熟度を変えたら **3箇所**（CATALOG / main.js / maturity.js）を揃える  
- **健全性**: `python3 scripts/smoke-platform.py`  



---

## 今後の方針（要約）

1. **トピック拡大とカテゴリ化** — 経路探索 / ゲーム木 / 物理 / 設計パターン（`docs/topics/CATALOG.md`）  
2. **共通基盤** — UI・用語・ファイル規約の統一（`docs/PLATFORM.md`）  
3. **分業** — SPEC 先行 → 実装ブランチ → チェックリスト（`docs/WORKFLOW.md`、`docs/templates/`）  

### 着手保留（バックログ）

- **E2E**（ブラウザ自動操作テスト）— いまは `python3 scripts/smoke-platform.py` + 手動  
- **i18n**（多言語 UI）— 当面は日本語固定  

計画の正本: [docs/interactive_game_programming_material_plan.docx](docs/interactive_game_programming_material_plan.docx)（**策定 2026年7月**）。  
実装対応・バックログは [docs/ROADMAP.md](docs/ROADMAP.md)。索引: [docs/README.md](docs/README.md)

---

## 実装済みトピック（ready: true）

| 順 | トピック | ページ | 地図 | C# | 要点 |
|----|----------|--------|------|-----|------|
| 1 | BFS | `algorithms/bfs.html` | `js/maps/bfs-map.js` | `BfsExample.cs` | 歩数最少。大=歩数、小=経路コスト c |
| 2 | DFS | `algorithms/dfs.html` | `js/maps/dfs-map.js` | `DfsExample.cs` | コールスタック + BT。方向: 右→下→左→上 |
| 3 | ダイクストラ | `algorithms/dijkstra.html` | `js/maps/dijkstra-map.js` | `DijkstraExample.cs` | 優先度 = g |
| 4 | 最良優先 | `algorithms/best-first.html` | `js/maps/best-first-map.js` | `BestFirstExample.cs` | 優先度 = h |
| 5 | A* | `algorithms/astar.html` | `js/maps/astar-map.js` | `AStarExample.cs` | f = g + h |
| 6 | AND-OR | `algorithms/and-or.html` | `js/maps/and-or-tree.js` | `AndOrExample.cs` | OR=∃ / AND=∀。ゲーム木入口 |
| 7 | Min-Max | `algorithms/minimax.html` | `js/maps/minimax-tree.js` | `MinimaxExample.cs` | MAX/MIN・数値評価。枝刈りなし |
| 8 | α-β | `algorithms/alpha-beta.html` | `js/maps/alpha-beta-tree.js` | `AlphaBetaExample.cs` | α/β 窓で枝刈り。値は Min-Max と同じ |
| 9 | モンテカルロ | `algorithms/monte-carlo.html` | `js/maps/monte-carlo-tree.js` | `MonteCarloExample.cs` | 乱択プレイアウト平均。Min-Max と不一致 |
| 10 | 多腕バンディット | `algorithms/multi-armed-bandit.html` | `js/maps/bandit-config.js` | `MultiArmedBanditExample.cs` | ε-greedy / UCB1・リグレット |
| 11 | AABB | `algorithms/collision.html` | —（説明UI） | `AabbExample.cs` | 軸投影・非マップ |
| 12 | ステートマシン | `algorithms/fsm.html` | `js/maps/fsm-config.js` | `FsmExample.cs` | 状態図・遷移表・非マップ |

共通:

- 地図記号: `S` `G`(複数可) `#` `.` `0` `1` `2` `n`(-1)。`js/map-format.js`  
- ペイント: コスト / 壁 / **G（追加・削除、複数）**。ゴール最低1つ  
- h（複数ゴール時）: 最近傍 G へのマンハッタン  
- DS: `js/ds-viz.js`。親ポインタは HTML 固定タブ + JS 更新  
- 初期地図は `js/maps/*-map.js` をエディタ編集  

---

## ゲーム木

| 順 | トピック | 状態 |
|----|----------|------|
| 1 | AND-OR | **ready** — `algorithms/and-or.html` / SPEC |
| 2 | Min-Max | **ready** — `algorithms/minimax.html` / SPEC |
| 3 | α-β | **ready** — `algorithms/alpha-beta.html` / SPEC |
| 4 | モンテカルロ | **ready** — `algorithms/monte-carlo.html` / SPEC |
| 5 | 多腕バンディット | **ready** — `algorithms/multi-armed-bandit.html` / SPEC（シリーズ完了） |

### 物理・判定
| トピック | 状態 |
|----------|------|
| AABB | **ready** — `algorithms/collision.html` / `js/collision.js` / `samples/AabbExample.cs` |
|  | **2 通り**: A ポジティブ（重なり AND）/ B ネガティブ（分離 OR+NOT）/ B′ 早期 return |
|  | 結果一致のライブ確認 + 複雑度比較表。2D + 軸投影。経路マップ不使用 |

### 設計パターン
| トピック | 状態 |
|----------|------|
| ステートマシン | **ready** — `algorithms/fsm.html` / `js/fsm.js` / `js/maps/fsm-config.js` / `samples/FsmExample.cs` |
|  | 状態図 SVG + イベントボタン（有効=緑）+ 遷移表 + 履歴。マップ不使用 |

（メニューのみのトピックは現状なし — 経路探索・ゲーム木・AABB・FSM まで ready）  



定義: `js/main.js` の `TOPICS` ＋ `docs/topics/CATALOG.md`

### AND-OR メモ
- OR = どれか1つ真、AND = すべて真、葉 = 固定真偽  
- 深さ優先・左から右。正規ルート(AND)が成功すると根 OR が打ち切り  
- 木: `js/maps/and-or-tree.js`

### Min-Max メモ
- MAX = max 子、MIN = min 子、葉 = score  
- **枝刈りなし**（全子評価）。答え: A=3, B=2, C=4 → 根 v=4（手 C）  
- 木: `js/maps/minimax-tree.js`

### α-β メモ
- 根: α=−∞, β=+∞。MAX で v≥β → βカット、MIN で v≤α → αカット  
- 手 B に葉 B3=99 を置き、B2=2 のあと α カットで B3 未評価  
- 葉訪問 6 / 全葉 7、根 v=4 は Min-Max と同じ  
- 木: `js/maps/alpha-beta-tree.js`

### モンテカルロ メモ
- プレイアウト: 各節点で子を一様ランダム → 葉スコア平均  
- 真の乱択 EV ≈ 5.833、Min-Max = 4（一致しないのが教材ポイント）  
- 1ステップ=経路1マス、再生=1ティック1プレイアウト  
- 木: `js/maps/monte-carlo-tree.js`

### 多腕バンディット メモ
- ベルヌーイ腕、最適は腕 D (μ=0.8)  
- ε-greedy / UCB1、累積リグレット Σ(μ*−μ_a)  
- 真の μ 表示トグルあり  
- 設定: `js/maps/bandit-config.js`

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

- リモート: `https://github.com/kobashi/game-algo-lab`（アカウント: kobashi）  
- **GitHub Pages（試作運用中）**: https://kobashi.github.io/game-algo-lab/  
  - Source: `main` / `/ (root)`  
- **Release 試作版**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.0  
  - タグ `v0.9.0`（prerelease）— `RELEASE_NOTES_v0.9.0.md`  
- 再公開: `./scripts/publish-github.sh game-algo-lab v0.9.0`（または新タグ）  
- 旧ローカルタグ `v1.0.0` は初期準備用。正式版は別途 `v1.0.0` を切り直す想定  

---

## 作業時の注意

- 新トピックは **SPEC を先に**（`docs/templates/SPEC.md`）  
- 共通 CSS / ds-viz / map-format を変えたら PLATFORM を更新  
- 計画の正本 `docs/interactive_game_programming_material_plan.docx` は **Git 管理**（`docs/**/*.docx` のみ許可）。ルートの同名ファイルは下書き扱いで ignore  
- 方針変更は正本 Docx を更新し `docs/ROADMAP.md` を同期  
