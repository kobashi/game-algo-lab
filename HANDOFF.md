# Game Algo Lab — セッション引き継ぎ

最終更新: 2026-07-21  
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

**2026-07-19 `nim`（ニム）実装（Sonnet5）**: [SPEC](docs/topics/nim/SPEC.md) を implemented に更新し `algorithms/nim.html` / `js/nim.js` / `js/maps/nim-config.js` / `samples/NimExample.cs` を追加。モード1（1山）は逆向き着色DP（`solveSingle`/`singleColoringSteps`）を n=0..N の順に1ステップずつ進めるジェネレータで実装し、0..Nの帯を左から着色。塗り終わると負け(LOSE)位置が n mod (k+1) = 0 の位置に並ぶ縞模様になり、帯の下に剰余行を並べて視覚比較できる。k（1〜5）・N（5〜40）スライダーで即座に縞の間隔が変わる。モード2（複数山）はメモ化探索（`solveMulti`）と nim-sum（`nimSum` = 各山のXOR）を実装し、2進パネルで各山の桁を揃えて表示・XOR列（nim-sum）を色分け表示。「一致確認」ボタン（`verifyAll`）で初期山構成の直積（各山0..初期値）の全局面についてメモ化探索のW/LとXOR判定を照合し、結果を result-compare に蓄積表示。CPUは1山が剰余を0にする手、複数山がnim-sumを0にする手（XORの構成的性質から直接算出、`cpuMoveMulti`）。モード切替は `<select>`＋`data-mode-only`属性によるパネル出し分け。数値検証（scratchpadのNode検証スクリプトで実施・全775チェックPASSED、`smoke-platform.py`もALL PASSED）: k=1..5×N=40の全域で着色L集合がn mod (k+1)=0の集合と完全一致、(3,5,7)=192局面・(1,2,3)=24局面・(2,4,6)=105局面すべてで探索とXOR判定が全数一致（探索が触った局面数=全局面数、直積が閉じた状態空間であることを実証）、`nim.js`のsolveMultiを使わない独立実装（素朴な再帰、メモ化なし）を別コードで書き(3,5,7)と(2,4,6)の全局面ラベルが完全一致することを確認、nim-sum≠0の全局面（3プリセット計276局面）でCPUの着手が必ずnim-sum=0の局面に遷移することを確認。プリセット結論: (3,5,7)はnim-sum=1（非0）で先手勝ち、(1,2,3)はnim-sum=0で先手負け、(2,4,6)もnim-sum=0で先手負け——(1,2,3)を単純に2倍しただけの構成だがXORのビットシフト不変性により結論（先手負け）が変わらないことを自前計算で確認した。学習進行の目安どおり NAV_GROUPS / FOOTER_RELATED を「三目並べ→ニム→割り箸」のリレーに更新（tic-tac-toeの次リンクをchopsticksからnimへ、chopsticksの前段リンクをtic-tac-toeからnimへ変更）。ready: true・`oneshot`。

**2026-07-19 `othello-4x4`（4×4 オセロ）実装（Sonnet5）**: [SPEC](docs/topics/othello-4x4/SPEC.md) を implemented に更新し `algorithms/othello-4x4.html` / `js/othello-4x4.js` / `js/maps/othello-4x4-config.js` / `samples/Othello4x4Example.cs` を追加。局面は16文字盤面文字列＋手番の組（`(board, turn)`）で表現し、SPEC擬似コードの「直前がパスか」フラグは持たず、「両者とも合法手がない」という盤面だけから決まる性質として終局判定する設計にした（SPEC §11）。negamax（`solveNode`）に α-β・転置表（exact/lower/upper境界フラグ付き）・対称性除去（8変換=回転4×鏡映2の最小符号化、手番込み）を独立トグルで実装。実装前にNodeで性能実測: 初期局面からの素の全探索（全トグルOFF）は224,820局面・約0.4秒（SPEC §4のガードライン閾値3秒未満）、α-βのみ18,030局面・約37ms、α-β+転置表11,822局面・約38ms、全ON432局面・約6ms。3秒未満だったため8構成比較ボタンの既定プリセットは中盤に強制せず、現在のプリセット（既定=初期局面）のままとした（§11に判断根拠を記録）。ただしSPEC §4-2の要件どおりチャンク実行（ジェネレータ＋時間分割）は実装必須要件として実施し、`js/platform/chunked-run.js`（`runChunked`）をトピック非依存の汎用ランナーとして新設（`docs/PLATFORM.md`・`js/platform/README.md`同時更新）。3段計測（生の生成局面数/転置表による再訪除去後/対称正規化後）を主役の計測パネルとして実装。対局UIは合法手ハイライト・返る石ハイライト・パスバナー・CPU最善手・評価オーバレイ（勝/分/負+石差）・8対称パネル（canonical値ハイライト）・符号化ビュー（現局面のencode値表示）を実装。数値検証（scratchpadのNode検証スクリプトで実施・全18項目PASSED、`smoke-platform.py`もALL PASSED）: ルール正当性を独立実装（別コードの素朴な8方向走査）と500局×全手（102,320件）で完全一致確認、パス・両者パス終局・満杯終局の3系統がランダム対局で発生することを確認、初期局面の理論結果を実装solverと独立実装（別コードのメモ化のみ・α-βなしnegamax）の両方で計算し**黒-8石差（白の勝ち）**で一致、canonical不変条件（8変換いずれから取っても同じ代表値・8変換encodeの辞書順最小であること）をランダム1000局面で確認、トグル単調性（素≥転置表のみ≥全ON、3段計測のraw≥tt≥sym）を初期局面・中盤・終盤プリセット全てで確認。詳細は下記「4×4オセロ メモ」。ready: true・`oneshot`。

**2026-07-21 `mcts` 実装（Grok4.5）**: 題材=三目並べ。`js/tic-tac-toe.js` を直 import（UI は `data-active="tic-tac-toe"` のときだけ起動するガードを追加）。4相 UCT・探索木 SVG・完全解/素の MC 比較。主プリセット `double-threat`（seed 既定20）。[SPEC](docs/topics/mcts/SPEC.md) implemented。ready: true・`oneshot`。

**次の実装ターゲット**: 正本第2期ゲーム木は一通り出揃った。候補は (1) 指摘9の疑似コード同期・戻る（platform）(2) 第3期物理段階の入口 (3) MCTS の発展（C 比較強化・4×4オセロ題材）など。ユーザー判断で優先度を決める。

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
| 14 | MCTS | `algorithms/mcts.html` | `js/maps/mcts-config.js` | `MctsExample.cs` | 三目並べ題材。UCT 4相・探索木・完全解/素のMC比較。`tic-tac-toe.js` 再利用 |
| 15 | ニム | `algorithms/nim.html` | `js/maps/nim-config.js` | `NimExample.cs` | 1山=逆向き着色DP（周期n mod k+1）／複数山=メモ化探索+nim-sum(XOR)全局面一致確認。2モードUI（非マップ） |
| 16 | 割り箸 | `algorithms/chopsticks.html` | `js/maps/chopsticks-config.js` | `ChopsticksExample.cs` | 循環グラフを後退解析（波単位）で3値化。状態225局面。15×15マトリクス+対局ビュー（非マップ） |
| 17 | 4×4オセロ | `algorithms/othello-4x4.html` | `js/maps/othello-4x4-config.js` | `Othello4x4Example.cs` | negamax全解析。α-β/転置表/対称除去(8変換・手番込み)を独立トグル、3段計測（生/転置表後/対称除去後）が主役。チャンク実行（`js/platform/chunked-run.js`）でUI非ブロック。初期局面=黒-8石差（自前計算）。非マップ専用UI |

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
| 7 | MCTS | **ready** — `algorithms/mcts.html` / SPEC（三目並べ題材・UCT 4相） |
| 8 | ニム | **ready** — `algorithms/nim.html` / SPEC（全探索→周期性・nim-sum の理論解の初例） |
| 9 | 割り箸 | **ready** — `algorithms/chopsticks.html` / SPEC（循環グラフ・後退解析の初例） |
| 10 | 4×4オセロ | **ready** — `algorithms/othello-4x4.html` / SPEC（実在ゲーム4本の最終段・チャンク実行の初例） |

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

### ニム メモ
- モード1（1山・サブトラクションゲーム）: `solveSingle(N,k)` が n=0..N の逆向き着色DPの結果配列を返す。
  `value[0]=LOSE`、n=1..Nは相手をLOSE局面(n-t)へ送れる手t(1..k)が1つでもあればWIN。
  理論判定 `singleTheory(n,k)` は `n % (k+1) === 0` の1行だが、着色DPと全域で完全一致することを機械確認済み
- 着色は `singleColoringSteps` ジェネレータで n を1つずつ進める（chopsticksの「波」と違い非循環なので
  単純な昇順1ステップでよい。SPEC §4の非循環版という位置づけどおり）
- モード2（複数山）: `solveMulti(piles, memo)` はメモ化再帰探索（山の合計が着手ごとに厳密に減るため
  循環なし・必ず停止）。`nimSum(piles)` は全山のXOR。`verifyAll(piles)` が初期山構成の直積
  （各山0..初期値）の全局面についてこの2つを照合する
- CPUの着手（複数山）はメモ化探索の結果からではなく、nim-sumのXOR構成的性質
  （`piles[i] XOR nimSum` が `piles[i]` より小さければ、その山をそこまで減らすと着手後のnim-sumが0になる）
  から直接算出（`cpuMoveMulti`、SPEC §11に判断記録）。正当性は「一致確認」が探索と理論の等価性を
  別途機械証明しているため担保される
- プリセット（`js/maps/nim-config.js`）と結論（自前計算・実装値、全局面照合で確認済み）:

  | プリセット | nim-sum | 結論（先手） | 全局面数（直積） |
  |---|---|---|---|
  | (3,5,7) | 1（非0） | 勝ち | 192 (=4×6×8) |
  | (1,2,3) | 0 | 負け | 24 (=2×3×4) |
  | (2,4,6) | 0 | 負け | 105 (=3×5×7) |

  (2,4,6) は (1,2,3) の全山をちょうど2倍しただけの構成。XORはビットごとの線形演算で、
  各ビットを1つ左シフトしても0は0のまま変わらないため、(1,2,3)と同じ「先手負け」という
  結論を保つ好例として一致確認プリセットに採用した
- 検証（scratchpadのNodeスクリプトで実施・全775チェックPASSED。文献値ではなく自前計算値）:
  - k=1..5 それぞれ N=40（n=0..40 の全域）で、DP着色のLOSE位置集合が `{n: n%(k+1)==0}` と完全一致
    （k=1:21件, k=2:14件, k=3:11件, k=4:9件, k=5:7件のLOSE位置を実測・全一致）
  - (3,5,7)=192局面・(1,2,3)=24局面・(2,4,6)=105局面すべてで `solveMulti` のW/Lと`nimSum≠0`が完全一致。
    探索が触った局面数（memo.size）は常に全局面数と一致（初期山構成の直積が閉じた到達可能状態空間で
    あることの実証 — どの手も山を減らすだけなので直積の外には出られない）
  - `js/nim.js` の `solveMulti` を使わない独立実装（メモ化なしの素朴な再帰を別コードでゼロから記述）で
    (3,5,7)・(2,4,6) の全局面ラベルが完全一致することを確認（独立実装との突き合わせ）
  - nim-sum≠0の全局面（3プリセット計276局面: 168+18+90）で `cpuMoveMulti` の着手が必ず
    nim-sum=0の局面に遷移することを確認（CPU着手アルゴリズムの健全性）
- 設定: `js/maps/nim-config.js`（初版・2026-07-19）

### 割り箸 メモ
- **2026-07-19 改訂1（Sonnet5、Fable5レビュー起点）**: `nim` 実装レビュー中に「割り箸の『波を再生』ボタンが1波進めただけで
  自動停止する」というバグを発見・確認。原因は `createPlayback` の契約（`onTick()` の戻り値 `true` で次ティックを予約、
  `false`/`undefined` で自動停止）に対し、`js/chopsticks.js` の `onTick` がブロック本体の矢印関数
  `() => { const cont = stepWave(); if (!cont) playback.stop(); }` になっており、戻り値が常に `undefined`
  （falsy）だったため。`stepWave()` 自体は正しく続行可否の boolean を返していたので、修正は
  `onTick: () => stepWave()` に1行置き換えるだけ（`if (!cont) playback.stop()` は falsy 戻り値で
  `createPlayback` 側が自動停止するため不要になり削除）。ready 状態や後退解析ロジック自体に変更はない。
  成熟度は主要操作の破綻修正のため `oneshot`→`revised`（修正+1、更新2026-07-19）に記帳
  （CATALOG / `TOPIC_META` / `main.js` の3点セット・本SPEC最終改訂行も同時更新）
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

### 4×4オセロ メモ
- 盤面は16文字の string（行優先。`.`/`B`/`W`）。**手番は個数差から決まらない**（パスがあるため）ので、
  局面は `(board, turn)` の組で表す。符号化 `encode(board,turn) = board + turn`（SPEC §4「符号化は手番込み」）
- **SPEC §11 実装判断（状態表現）**: SPEC擬似コードの pos = (盤面, 手番, 直前がパスか) のうち
  「直前がパスか」は状態に持たなかった。理由: 終局条件「両者連続パス」は
  `legalMoves(board,'B').length===0 && legalMoves(board,'W').length===0` という**盤面だけから決まる性質**と
  数学的に同値（パスは手番を渡すだけで盤面を変えないため、経路に依存しない）。これにより状態空間が
  余分な次元を持たずに済み、canonical・転置表キーも `(board, turn)` だけで正しく機能する。検証スクリプトで
  パス・両者パス終局・満杯終局の3系統がすべて実際に発生することを確認済み（下記）
- **SPEC §11 実装判断（盤面表現）**: 16文字stringを採用（ビットボードではなく、三目並べ・割り箸と同じ
  読みやすい文字列表現に統一）。理由: 性能実測（下記）で素の全探索が初期局面から0.4秒程度と十分高速であり、
  ビットボード化による高速化のメリットより可読性・他トピックとの一貫性を優先した
- **SPEC §11 実装判断（8構成比較の既定プリセット）**: SPEC §4-3は「素の全探索が3秒超なら中盤プリセットを既定にする」
  条件付き要件。実測は初期局面で224,820局面・約0.4秒と3秒未満だったため、8構成比較ボタンは
  現在選択中のプリセット（既定=初期局面）でそのまま実行する設計とし、中盤への強制切り替えは行わなかった。
  ただしチャンク実行（SPEC §4-2）自体は条件なしの必須要件のため、3段計測・8構成比較とも
  `js/platform/chunked-run.js` の `runChunked` でジェネレータを時間分割実行している
- **SPEC §11 実装判断（3段計測とトグルの関係）**: 「解析」ボタンは①現在の3トグル（α-β/転置表/対称除去）設定で
  1回の `analyzeMoves` を実行（訪問局面・転置表ヒット・カットを表示）→②続けて3段計測
  （raw=転置表・対称OFF固定 / tt=転置表ONのみ / sym=転置表+対称ON、**α-βは現在のトグル値を3列共通で適用**）を
  自動実行する、の2段階構成にした。対称除去は転置表がONでなければ効果がない（canonical化した結果を
  格納する先＝転置表が存在しないため）ことを性能実測で確認済み（8構成比較で「対称:ONのみ・転置表:OFF」の
  訪問局面数が「全OFF」と完全一致：224,820=224,820）
- **チャンク実行の platform 抽出（SPEC §9 判断）**: `js/platform/chunked-run.js`（`runChunked`）を新設。
  ジェネレータを一定時間（既定16ms）ごとに区切って `setTimeout` で継続するだけの、
  トピックに依存しない汎用ロジックのため platform に置いた（`docs/PLATFORM.md` / `js/platform/README.md` 同時更新）。
  8対称パネルの UI 部品自体（ミニ盤面描画）は三目並べと似た構造だが、盤サイズ（3×3 vs 4×4）・
  ピース表現（文字 vs 円形コマ）が異なり、抽出しても分岐が増えるだけと判断し**共通化しなかった**
  （SPEC §9/§11「する/しないの判断」）
- **性能実測（Node、初期局面から）**:

  | 構成 | 訪問局面数 | 所要時間 |
  |---|---|---|
  | (a) 素のnegamax（全OFF） | 224,820 | 約0.39〜0.42秒 |
  | (b) α-βのみ | 18,030 | 約37ms |
  | (c) α-β+転置表 | 11,822 | 約38ms |
  | (d) 全ON（α-β+転置表+対称） | 432 | 約6ms |
  | 8構成合計（初期局面） | — | 約1.3秒 |

  対称性除去のみ（転置表OFF）は訪問局面数224,820で全OFFと完全一致（対称除去は転置表と組み合わせて初めて効く）。
  中盤プリセットは素の全探索でも255局面・約14ms、終盤プリセットは4局面・0.1ms未満と、いずれも軽い
- **理論結果（自前計算・独立実装で一致確認済み。文献値は参照していない）**: 初期局面（黒先手・標準交差配置）の
  完全解析は**黒視点で-8**（絶対値8=最終石差、符号=白の勝ち）。独立実装（`legalMoves`/`applyMove`を一切
  参照せず別コードでゼロから書いた素朴な8方向走査＋メモ化のみ・α-βなしnegamax）でも同じ-8を得て一致確認済み
- プリセット（`js/maps/othello-4x4-config.js`。boardはいずれも実際のランダム対局(seed=1)から生成した到達可能局面）:

  | プリセット | 手番 | 完全解析の根の値 | 備考 |
  |---|---|---|---|
  | 初期局面 | 黒 | -8（黒が8石差で負け） | 標準交差配置 |
  | 中盤（比較用） | 黒 | +2（黒が2石差で勝ち） | 初期局面から6手進めた局面。空きマス6 |
  | 終盤（読み切り観察向け） | 黒 | -8（黒が8石差で負け） | 同じ対局を10手まで進めた局面。空きマス2・合法手2つ |
- 検証（scratchpadのNodeスクリプトで実施・全18項目PASSED。文献値ではなく自前計算値。`smoke-platform.py`もALL PASSED）:
  - ルール正当性: 独立実装（別コードの素朴な8方向走査による合法手・反転判定）と500局×全手（102,320件の
    合法手判定）で完全一致。パス・両者連続パスによる終局（満杯でない終局）・盤面満杯による終局の3系統が
    いずれもランダム対局中に発生することを確認
  - 初期局面の理論結果: 実装solver（negamax+α-β+転置表+対称除去）と独立実装（メモ化のみ・α-βなしnegamax、
    上記とは別のシンプルな実装）の両方で-8に一致
  - canonical不変条件: ランダム1000局面で、8変換のいずれから`canonicalKey`を取っても同じ代表値になること、
    かつその代表値が8変換のencodeの辞書順最小であることを確認
  - トグル単調性: 初期局面で「素224,820 ≥ 転置表のみ89,332 ≥ 全ON432」、3段計測（raw≥tt≥sym）を
    alphaBeta ON/OFF両方、初期・中盤・終盤の3プリセットすべてで確認。8構成すべてで根の値が一致することも確認
- 設定: `js/maps/othello-4x4-config.js`（初版・2026-07-19）

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
- 既定ブランチ: `main`（ローカルは `origin/main` と同期済み想定）  
- **GitHub Pages（試作運用中）**: https://kobashi.github.io/game-algo-lab/  
  - Source: `main` / `/ (root)`  
- **Release 試作版**: https://github.com/kobashi/game-algo-lab/releases/tag/v0.9.2  
  - タグ `v0.9.2`（prerelease）— `RELEASE_NOTES_v0.9.2.md`（MCTS 追加）  
  - 前版: `v0.9.0` / ノート `RELEASE_NOTES_v0.9.1.md`（ゲーム木4本・教材改訂）  
- 再公開: `./scripts/publish-github.sh game-algo-lab v0.9.2`（または新タグ）  
- 旧ローカルタグ `v1.0.0` は初期準備用。正式版は別途 `v1.0.0` を切り直す想定  

### リモートブランチ（不要マーク・削除しない）

クラウド／別環境でレビュー・修正後に `main` へ merge 済みの作業ブランチ。  
**作業再開の起点にしない**。履歴参照用に remote 上に残す（削除はユーザー判断のときだけ）。

| ブランチ | 状態 | 備考 |
|----------|------|------|
| `origin/claude/grok4-5-learning-roadmap-iiihaa` | **不要（保持）** | tip = `main` の `a56ccde`（PR #1/#2 反映後と同一）。`main` に完全包含。2026-07-21 確認 |

---

## 作業時の注意

- 新トピックは **SPEC を先に**（`docs/templates/SPEC.md`）  
- 共通 CSS / ds-viz / map-format を変えたら PLATFORM を更新  
- 計画の正本 `docs/interactive_game_programming_material_plan.docx` は **Git 管理**（`docs/**/*.docx` のみ許可）。ルートの同名ファイルは下書き扱いで ignore  
- 方針変更は正本 Docx を更新し `docs/ROADMAP.md` を同期  
