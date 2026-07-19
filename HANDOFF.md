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

**2026-07-19 `tic-tac-toe`（三目並べ）実装（Sonnet5）**: [SPEC](docs/topics/tic-tac-toe/SPEC.md) を implemented に更新し `algorithms/tic-tac-toe.html` / `js/tic-tac-toe.js` / `js/maps/tic-tac-toe-config.js` / `samples/TicTacToeExample.cs` を追加。negamax + α-β/メモ化（exact/lower/upper 境界フラグ付き転置表）/対称性除去（8変換最小符号化）を独立トグルで比較でき、8構成一括比較・MC評価・1ステップ実行（コールスタック）・8対称パネルを実装。数値検証: 空盤=引き分け、到達5478局面/対称除去765局面を実装のcanonical関数で再現、トグル8構成の訪問局面数の単調性、隅初手の理論値スポットチェック、ダブルリーチ罠プリセットで低N(30,seed20)がMC最善手を外し高N(5000)で収束、を全てNode検証スクリプトで確認済み（`smoke-platform.py` も ALL PASSED）。ready: true・`oneshot`。

**2026-07-19 `chopsticks`（割り箸）実装（Sonnet5）**: [SPEC](docs/topics/chopsticks/SPEC.md) を implemented に更新し `algorithms/chopsticks.html` / `js/chopsticks.js` / `js/maps/chopsticks-config.js` / `samples/ChopsticksExample.cs` を追加。局面は `{mover:[a,b], opp:[c,d]}`（手番側/相手側、正規化ソート済み）で表現し、状態数は 15×15=225（SPEC の上界450以下）。後退解析を波単位ジェネレータ（`retrogradeAnalysisSteps`）で実装し、波0=合法手0件(負け)からWIN/LOSEを確定、最後まで残った局面をDRAWとする。15×15マトリクスで波の広がりをアニメーション表示、対局ビューでは各合法手の行き先3値ラベルを表示、CPUはWIN維持/DRAWはDRAW維持の応手を実装（LOSE時の最長粘りはSPEC通りv1では未実装）。バリアント（分割・死の条件「5以上/ちょうど5」・mod5）は独立トグルで比較表に蓄積。深さ制限Min-Max（5/10/20、メモ化negamax）対比パネルも実装。数値検証（scratchpadのNode検証スクリプトで実施、smoke-platform.pyもALL PASSED）: 状態数225・全終局が波0/LOSE、6バリアント全てで不動点性質（WIN⇔∃手→相手LOSE、LOSE⇔∀手→相手WIN、DRAW⇔勝ち手なし∧∃手→相手DRAW）を全局面で確認、独立に再実装した後退解析（predecessor逆伝播ベース、chopsticks.jsのlegalMovesを使わない別コード）と全225局面のラベルが完全一致、分割ありで初めてDRAW局面が出現（標準0→分割あり14）、mod5/split+exact5では初期局面自体がDRAWに変わる、深さ制限Min-MaxはDRAW局面で深さ5/10/20とも値0のまま確定しない一方、決着バリアント（標準）は深さ10以降で真値(-1)に収束することを確認。詳細な数値表は下記「割り箸 メモ」。ready: true・`oneshot`。

**次の実装ターゲット**: `nim`（ニム・完全読み切り→剰余/nim-sum）— 正本 §6.4 学習進行の目安（三目並べ→ニム→割り箸→4×4オセロ）どおり。SPEC 未着手。

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
| 13 | 三目並べ | `algorithms/tic-tac-toe.html` | `js/maps/tic-tac-toe-config.js` | `TicTacToeExample.cs` | negamax全解析。α-β/メモ化/対称性除去(8変換)を独立トグル。3×3専用UI（非マップ） |
| 14 | 割り箸 | `algorithms/chopsticks.html` | `js/maps/chopsticks-config.js` | `ChopsticksExample.cs` | 循環グラフを後退解析（波単位）で3値化。状態225局面。15×15マトリクス+対局ビュー（非マップ） |

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
| 5 | 多腕バンディット | **ready** — `algorithms/multi-armed-bandit.html` / SPEC |
| 6 | 三目並べ | **ready** — `algorithms/tic-tac-toe.html` / SPEC（実在ルール優先の初例） |
| 7 | 割り箸 | **ready** — `algorithms/chopsticks.html` / SPEC（循環グラフ・後退解析の初例） |

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

### 三目並べ メモ
- 盤面は9文字の string（`.`/`X`/`O`）。手番はXとOの個数差から一意に決まる（実装で `currentPlayer` として export）
- negamax（`solveNode`）。α-β・メモ化・対称性除去（8変換=回転4×鏡映2の最小符号化）を**独立に** ON/OFF
  - メモ化 と α-β を併用する場合、置換表には値だけでなく **exact/lower/upper の境界フラグ**が必須
    （フラグなしで値だけキャッシュすると別窓での読み出しで値が壊れるバグを実装中に検出・修正）
- 空盤の完全解析: 根の値は8トグル構成すべてで **引き分け（0）**（学習目標1）
- 到達可能な合法局面 **5,478**、対称性除去後の代表局面 **765**（`countReachableStates()` で実装から再現・検証済み）
- トグル8構成（2^3）の訪問局面数は「素の全探索 ≥ 各単独ON ≥ 全部ON」の単調減少を確認
  （中盤局面 `XO..O..X.` で: 素257 → 全部ON 120、根の値はどの構成でも一致）
- 隅初手の理論値: X が隅→ O が中央以外なら X 必勝、O が中央なら引き分け（実装のnegamaxで再現）
- ダブルリーチ罠プリセット（`XO..O..X.`、Xの手番）: 完全解では手6が唯一の必勝手（他は引き分け）。
  乱択EVは手6が約0.83、次点が約0.65〜0.67と差が小さく、低N（既定N=30, seed=20）だとMCが最善手を外す例を
  再現。N=5000まで上げると正しい順位に収束
- 1ステップ実行はジェネレータ（`solveStep`）実装。空きマス5個超は警告表示（全展開は約55万ノード）。
  既定で「終盤（残り4手）」プリセットを用意し、コールスタック（盤面ミニチュア）を最後まで追える
- 設定: `js/maps/tic-tac-toe-config.js`（初版・2026-07-19）

### 割り箸 メモ
- 状態は `{ mover:[a,b], opp:[c,d] }`（手番側/相手側、a<=b・c<=d に正規化）。
  先手/後手の固定ラベルは持たない設計にしたため状態数は 15×15=**225**（SPEC の上界450以下。§11参照）
- タップ結果の本数（`applyHitValue`）は死の条件で分岐:
  - 標準（5以上で死）: raw>=5 → 0
  - **ちょうど5のみ死**: raw==5→0、raw>5（6〜8）は「片手に5本を超えて掲げられない」という物理的制約により
    **不可能な手として除外**（legalMovesに含めない）。こうしないと本数が際限なく増え続け状態空間が
    有限に収まらなくなるため採用（§11に明記）
  - mod5 ON: raw%5（余り0=死）。deathRuleの設定より優先
- 分割ルール: 自分の両手の合計を、現状と異なる 0〜4 の組へ再分配できる（(0,x) からの分割も許可）
- 終局判定は「合法手0件=手番側の負け」という一般化した基準（通常の mover=(0,0) を包含し、
  分割なし・相手が先に全滅した不到達局面などの縁も一貫して処理できる。§11参照）
- 後退解析（`retrogradeAnalysisSteps`）は波単位ジェネレータ。マトリクスの波アニメーション専用に使い、
  対局・CPU応手・比較表は即時に完了させた `runRetrogradeAnalysis` を別途使う（両者は同じロジック）
- マトリクスは **行=手番側の手ペア、列=相手側の手ペア**（先手/後手固定ラベルは不採用。§11参照）
- 検証（scratchpad の Node スクリプトで実施・全項目 PASSED。文献値ではなく自前計算値）:
  - 状態数225（≤450）、全終局局面（合法手0件）は波0・LOSE
  - 6バリアント全てで不動点性質（WIN⇔∃手→相手LOSE／LOSE⇔∀手→相手WIN／DRAW⇔勝ち手なし∧∃手→相手DRAW）を
    全225局面で確認
  - `chopsticks.js` の実装とは別に、predecessor逆伝播ベースの後退解析をゼロから再実装し、
    6バリアント×225局面すべてでラベル完全一致を確認（独立実装との突き合わせ）
  - バリアント別の初期局面(1,1)-(1,1)の結論とW/L/D（自前計算・実装値）:

    | バリアント | 初期局面 | 勝ち | 負け | 引分 | 到達可能 | 波数 |
    |---|---|---|---|---|---|---|
    | 標準（分割なし・5以上で死） | LOSE | 146 | 79 | 0 | 92 | 7 |
    | 分割あり（5以上で死） | LOSE | 141 | 70 | **14** | 191 | 18 |
    | ちょうど5のみ死（分割なし） | LOSE | 99 | 126 | 0 | 75 | 5 |
    | 分割あり + ちょうど5のみ死 | **DRAW** | 83 | 51 | 91 | 191 | 7 |
    | mod5 ON（分割なし） | **DRAW** | 86 | 61 | 78 | 200 | 5 |
    | 分割あり + mod5 ON | **DRAW** | 84 | 39 | 102 | 207 | 14 |

  - 分割なし（標準・ちょうど5）では引き分け局面が**0**、分割ありで初めてDRAWが出現（14局面）。
    さらに mod5 系・分割+ちょうど5では**初期局面そのものがDRAW**に変わる（バリアントで結論が変わる好例）
  - 深さ制限Min-Max（メモ化negamax、`depthLimitedValue`）: 初期局面がDRAWのバリアント（mod5・分割+ちょうど5）では
    深さ5/10/20のいずれも評価値が**0（未確定）のまま**変化しない。対照実験として決着がつく標準バリアントでは
    深さ10・20で真値（-1、初期局面LOSE）に収束することを確認（ループ局面は深さを増やしても解けないことの実証）
  - 標準の (1,1)-(1,1) が「手番側（先に動く方）の負け」になるのは直感に反するが、独立実装との
    ラベル完全一致で裏付け済み
- CPU応手: WIN局面では相手LOSEに行く手、DRAW局面では相手DRAWに行く手（DRAW局面には定義上必ず存在）を選択。
  LOSE局面での「最長粘り」はSPEC §11の通りv1では未実装（どの手を選んでも理論上は負けなので暫定で先頭の手を選択）
- 設定: `js/maps/chopsticks-config.js`（初版・2026-07-19）

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
