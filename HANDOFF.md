# Game Algo Lab — セッション引き継ぎ

最終更新: 2026-07-19  
パス: `~/Project`（`/Users/nagoyabunridaigakujouhoumediagakuka/Project`）

新セッション開始時の指示例:

> `~/Project` の Game Algo Lab を続ける。引き継ぎは `HANDOFF.md` と `docs/ROADMAP.md` を読んで。計画の正本は `docs/interactive_game_programming_material_plan.docx`（策定 2026年7月）。

---

## エージェント運用（2026-07-19〜）

複数 AI 体制: **Grok4.5** が開発の起点（企画・ROADMAP 立案）、**Fable5** はレビュー専任（コード非編集）、**Sonnet5** が実装を担当。詳細は [docs/WORKFLOW.md §10](docs/WORKFLOW.md)。

直近の対応: 正本 docx との突き合わせレビュー（Fable5）を受け、ROADMAP.md §2.4 の物理／CG／サウンド企画中表に見落とし項目を追加し、`patterns`/`quality` 分割と FSM のカテゴリ分類の根拠を明記（Sonnet5、`js/curriculum-outline.js` も同期済み）。コード・メニュー・成熟度は無変更。

**2026-07-19 正本改訂（ユーザー全件承認・Fable5 反映版を正本として確定）**: Fable5 のミニゲームレビュー（`docs/reviews/2026-07-19-docx-minigames-review.md`、変更履歴版 docx はアーカイブとして併置）を全件承認し、正本 docx に反映 — §2 実在ルール優先原則、§4 procgen 行、§6.1 三目並べ、**§6.4 割り箸（循環ゲームグラフ・後退解析）新設**、§15 第2期追記。以後の開発はこの改訂版正本を基準とする。ROADMAP §2.4 と `curriculum-outline.js` に `tic-tac-toe` / `chopsticks` を追加。

**2026-07-19 教材品質レビュー反映（Fable5 指摘 → Sonnet5 実装）**: `docs/reviews/2026-07-19-demo-pedagogy-review.md` の指摘1〜7に対応。
ゲーム木4本（Min-Max/α-β/モンテカルロ/AND-OR）は深さ2の同型木が「MIN の下にまた MAX が現れる交互再帰」「β カット」を構造的に見せられなかった問題を解消 — Min-Max/α-β/モンテカルロを同型・同値の深さ3・葉12標準木（根max=7、最善手R）に差し替え、AND-OR は「鍵を入手」を葉→OR節点（買う/盗む）に差し替えて深さ3化。DFS は行き止まり3本の小さめ迷路に、最良優先はS側に口を開けた凹型ポケット（greedy が突っ込み g=27 vs 最適22を確認）に地図を差し替え。多腕バンディットは易しい/難しい2プリセット化＋既定手数300へ。5トピックを oneshot→revised（修正+1、更新2026-07-19）。指摘9（疑似コード同期・戻る）はバックログのまま未対応。

**次の実装ターゲット**: `tic-tac-toe`（三目並べ）— [SPEC draft](docs/topics/tic-tac-toe/SPEC.md) 起草済み・CATALOG に ready ❌ で登録済み。SPEC レビュー → `topic/tic-tac-toe` ブランチで実装、の順（WORKFLOW §5）。その次は `chopsticks`（割り箸、SPEC 未着手）。

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
  - 付帯: **修正回数** (`revisions`) · **更新日** (`updated`)  
  - Web 正: `js/platform/maturity.js` の `TOPIC_META`（カード・デモ・凡例）  
  - 改訂したら CATALOG + `TOPIC_META`（+1 / 日付）+ `main.js` の maturity を揃える  
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
実装対応・**企画中トピック一覧**・バックログは [docs/ROADMAP.md](docs/ROADMAP.md)（§2.3–2.4）。  
サイト上の **見出しのみ掲載**（デモなし）: トップ `#curriculum` ← `js/curriculum-outline.js`。  
索引: [docs/README.md](docs/README.md)

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
- 深さ3化: 「鍵を入手」を葉→OR節点（買う→盗む）に。買うが失敗、盗むが成功して
  「AND の中の OR」の交互再帰が見える（根の結論は不変）  
- 木: `js/maps/and-or-tree.js`（2026-07-19 改訂）

### Min-Max メモ
- MAX = max 子、MIN = min 子、葉 = score  
- **枝刈りなし**（全子評価）。深さ3・葉12標準木。答え: 手L=5, 手M=3, 手R=7 → 根 v=7（手 R）  
- 木: `js/maps/minimax-tree.js`（2026-07-19 深さ2→深さ3に改訂。α-β・モンテカルロと同型・同値）

### α-β メモ
- 根: α=−∞, β=+∞。MAX で v≥β → βカット、MIN で v≤α → αカット  
- Min-Max と同じ深さ3・葉12標準木。手Lの応手L2がβカット（葉L2b=9未評価）、
  手Mの応手M1=4≤αでαカット（応手M2は節点ごと未評価＝葉2枚が丸ごと刈られる）  
- 葉訪問 9 / 全葉 12、カット2回（βカット1・αカット1）、根 v=7 は Min-Max と同じ  
- 木: `js/maps/alpha-beta-tree.js`（2026-07-19 改訂。旧木は深さ2でβカットが構造的に発生し得なかった）

### モンテカルロ メモ
- プレイアウト: 各節点で子を一様ランダム → 葉スコア平均  
- Min-Max と同じ深さ3・葉12標準木。真の乱択 EV ≈ 4.917、Min-Max = 7  
  （手L≈6.0と手R≈6.25が僅差になり、Min-Maxの5 vs 7と食い違うのが教材ポイント）  
- 1ステップ=経路1マス、再生=1ティック1プレイアウト  
- 木: `js/maps/monte-carlo-tree.js`（2026-07-19 深さ2→深さ3に改訂）

### 多腕バンディット メモ
- ベルヌーイ腕、2プリセット: easy（既定・最適腕D μ=0.8）/ hard（0.40/0.50/0.55/0.60/0.45 接近型）  
- ε-greedy / UCB1、累積リグレット Σ(μ*−μ_a)、既定手数 300  
- 真の μ 表示トグルあり  
- 設定: `js/maps/bandit-config.js`（2026-07-19 難易度プリセット追加）

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
