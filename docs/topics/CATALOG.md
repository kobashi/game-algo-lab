# トピックカタログ

最終更新: 2026-07-23（`rng-seed` 実装 — 基礎実行モデル完了）  

- **実装の正**: この表 と `js/main.js` の `TOPICS`（ずれたら両方直す）  
- **成熟度の定義**: [MATURITY.md](./MATURITY.md)（`oneshot` / `revised` / `stable` + **修正回数** + **更新日**）  
- **Web 表示の正**: `js/platform/maturity.js` の `TOPIC_META`（`maturity` / `revisions` / `updated`）  
- **未実装のカテゴリ・トピック（企画中のみ）**: [../ROADMAP.md](../ROADMAP.md) の **§2.3 / §2.4**。メニュー未掲載。  
- **準備中**（SPEC あり・未 ready）: 下表の ready 空欄行、および ROADMAP §2.4。

### 成熟度の略号

| 表示 | コード | 意味 |
|------|--------|------|
| 一発 | `oneshot` | 一発未調整版 |
| 調整 | `revised` | 改訂・調整版 |
| 安定 | `stable` | 安定版 |

**修正** = 初回実装後の意図した改訂回数（oneshot は通常 0）。**更新** = 最終更新日 `YYYY-MM-DD`。

---

## カテゴリ: 経路探索 (`pathfinding`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `bfs` | 幅優先探索 (BFS) | ✅ | **調整** | 2 | 2026-07-17 | `algorithms/bfs.html` | 実装先行 | コスト比較・複数G・ペイント・表示 |
| `dfs` | 深さ優先探索 (DFS) | ✅ | **調整** | 3 | 2026-07-19 | `algorithms/dfs.html` | 実装先行 | コールスタック可視化・地図・ペイント／行き止まり3本の小さめ迷路に差し替え（バックトラック3回を検証） |
| `dijkstra` | ダイクストラ法 | ✅ | **調整** | 2 | 2026-07-17 | `algorithms/dijkstra.html` | 実装先行 | g 表示・複数G・platform 寄せ |
| `best-first` | 最良優先探索 | ✅ | **調整** | 3 | 2026-07-19 | `algorithms/best-first.html` | 実装先行 | h 表示・複数G・platform 寄せ／S側に口を開けた凹型ポケットを追加（greedy が突っ込み g=27 vs 最適22を検証） |
| `astar` | A* 探索 | ✅ | **調整** | 3 | 2026-07-17 | `algorithms/astar.html` | 実装先行 | f/g/h・負コスト・複数G・初期地図調整 |
| `bidirectional-search` | 双方向探索 | ✅ | **一発** | 0 | 2026-07-22 | `algorithms/bidirectional-search.html` | [SPEC](./bidirectional-search/SPEC.md) | 双方向 BFS。前=S / 後=全G（multi-source）。出会点で接合。展開数を一方向 BFS と比較。拡張方策: 小さい側優先 / 交互 |

**学習ストーリー**: 歩数（BFS）→ 深さ（DFS）→ コスト g → 見積り h → 統合 f=g+h → **双方向（両端から）**  

**成熟度メモ**: いずれも一発実装後に機能・教材表示の改訂あり → `revised`。授業で据え置くなら `stable` へ昇格。

---

## カテゴリ: ゲーム木 (`game-tree`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `and-or` | AND-OR 探索 | ✅ | **調整** | 1 | 2026-07-19 | `algorithms/and-or.html` | [SPEC](./and-or/SPEC.md) | 「鍵を入手」を葉→OR節点（買う/盗む）に差し替えて深さ3化 |
| `minimax` | Min-Max 探索 | ✅ | **調整** | 1 | 2026-07-19 | `algorithms/minimax.html` | [SPEC](./minimax/SPEC.md) | 深さ2→深さ3・葉12の標準木に差し替え。MIN下にMAXが現れる交互再帰を可視化 |
| `alpha-beta` | α-β 法 | ✅ | **調整** | 1 | 2026-07-19 | `algorithms/alpha-beta.html` | [SPEC](./alpha-beta/SPEC.md) | 深さ3木でβカットを初めて可視化（旧木は深さ2でβカット不能だった） |
| `monte-carlo` | モンテカルロ法 | ✅ | **調整** | 1 | 2026-07-19 | `algorithms/monte-carlo.html` | [SPEC](./monte-carlo/SPEC.md) | 深さ3木でプレイアウトが3手の系列に。乱択EVとMin-Maxの食い違いを強化 |
| `multi-armed-bandit` | 多腕バンディット | ✅ | **調整** | 1 | 2026-07-19 | `algorithms/multi-armed-bandit.html` | [SPEC](./multi-armed-bandit/SPEC.md) | 難易度プリセット（易しい/難しい）追加、既定手数300へ |
| `tic-tac-toe` | 三目並べ（全解析・対称性除去） | ✅ | **一発** | 0 | 2026-07-19 | `algorithms/tic-tac-toe.html` | [SPEC](./tic-tac-toe/SPEC.md) | 初版。negamax + α-β/メモ化/対称性除去(8変換)を独立トグル。到達5478局面・対称除去765局面を実装で再現。MCの低N誤判定プリセット付き |
| `nim` | ニム（完全読み切り→理論解） | ✅ | **一発** | 0 | 2026-07-19 | `algorithms/nim.html` | [SPEC](./nim/SPEC.md)（implemented） | 正本 §6.2。初版。モード1（1山）: 逆向き着色DPで n mod (k+1)==0 の周期を可視化（k=1..5×N=40の全域で機械確認）。モード2（複数山）: メモ化探索と nim-sum(XOR) 判定を全局面（直積、最大192局面）で一致確認、独立再実装の素朴再帰とも突き合わせ済み |
| `chopsticks` | 割り箸（循環グラフ・後退解析） | ✅ | **調整** | 1 | 2026-07-19 | `algorithms/chopsticks.html` | [SPEC](./chopsticks/SPEC.md)（implemented） | 正本 §6.4。初版。状態=(手番側ペア,相手側ペア)で正規化（225局面≤450）。後退解析を波単位ジェネレータで実装、15×15マトリクスで波の広がりを可視化。分割・死の条件（5以上/ちょうど5）・mod5 の6構成すべてで独立実装との全局面ラベル一致を確認。分割ありでDRAW14局面が出現（標準は0）。深さ制限Min-Max(5/10/20)はDRAW局面で値0のまま確定しない一方、決着バリアントは深さ10以降で真値に収束することを確認。**改訂1**: 「波を再生」が1波で自動停止するバグを修正（`createPlayback` の `onTick` 戻り値が常に `undefined` になっていたため。`nim` トピック実装時の Fable5 レビューで発覚） |
| `othello-4x4` | 4×4 オセロ（符号化・転置表・対称正規化） | ✅ | **一発** | 0 | 2026-07-19 | `algorithms/othello-4x4.html` | [SPEC](./othello-4x4/SPEC.md)（implemented） | 正本 §6.3。初版・ゲーム木シリーズ最終段。局面=(16文字盤面, 手番)、パス状態は「両者とも合法手なし」という盤面だけから決まる性質として実装（状態に持たない設計判断、SPEC §11）。負の全探索は初期局面で224,820局面・約0.4秒（Node実測、ガードライン閾値3秒未満のためチャンク実行は必須要件のまま維持しつつ8構成比較の既定プリセットは強制変更せず）。3段計測（生/転置表後/対称除去後）をチャンク実行ジェネレータ（`js/platform/chunked-run.js` を新設）で実装。初期局面の理論結果は自前計算（独立実装と一致確認済み）で黒 -8石差（白の勝ち） |
| `mcts` | モンテカルロ木探索 (MCTS) | ✅ | **一発** | 0 | 2026-07-21 | `algorithms/mcts.html` | [SPEC](./mcts/SPEC.md)（implemented） | 題材=**三目並べ**（`tic-tac-toe.js` 直 import・UI は data-active ガード）。4相+UCB1/UCT。探索木 SVG・根の子=腕の統計・完全解/素のMC比較。主シナリオ=`double-threat`（seed=20）。推奨手=訪問最多 |

**推奨実装順**: 上から順（AND-OR → … → バンディット → 三目並べ → ニム → 割り箸 → 4×4オセロ → **MCTS**）  

**成熟度メモ**: 2026-07-19 の教材品質レビュー（[レビュー](../reviews/2026-07-19-demo-pedagogy-review.md)）を受け、
ゲーム木4本（and-or/minimax/alpha-beta/monte-carlo）を深さ3の標準木に、多腕バンディットを
難易度プリセット追加に改訂 → いずれも `oneshot` → `revised`（修正+1）。
三目並べ・ニムは同日に新規実装（初版のため `oneshot`）。
割り箸も同日新規実装だが、直後の Fable5 レビューで「波を再生」の自動停止バグ（`onTick` 戻り値の不備）が
見つかり同日中に修正 → 意図した改訂として `oneshot` → `revised`（修正+1）。
4×4オセロも同日新規実装（初版のため `oneshot`）。ゲーム木シリーズ（三目並べ→ニム→割り箸→4×4オセロ）が
これで実在ゲーム4本すべて揃った。
**2026-07-21**: `mcts` 実装（初版 `oneshot`）。題材は三目並べ。ゲーム木シリーズのアルゴリズム可視化側が揃った。  
**2026-07-21 監査**: Fable5 レビュー起点の改訂は成熟度にすべて反映済み（詳細は [MATURITY.md §Fable5](./MATURITY.md)）。oneshot 残（ttt/nim/othello/mcts/fsm）は実装後レビュー未実施または「oneshot で十分」判定のため意図的。

---

## カテゴリ: 基礎実行モデル (`fundamentals`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `game-loop` | ゲームループ | ✅ | **一発** | 0 | 2026-07-22 | `algorithms/game-loop.html` | [SPEC](./game-loop/SPEC.md) | 可変/固定 timestep。跳ねるボール。人工遅延・MAX_STEPS でスパイラル防止を観察。説明特化 UI |
| `time-management` | 時間管理 | ✅ | **一発** | 0 | 2026-07-22 | `algorithms/time-management.html` | [SPEC](./time-management/SPEC.md) | 壁時計 vs ゲーム内時間。time scale・ポーズ。往復キャラは game time 駆動 |
| `input-basics` | 入力の基礎 | ✅ | **一発** | 0 | 2026-07-22 | `algorithms/input-basics.html` | [SPEC](./input-basics/SPEC.md) | held / down / up。Jump=edge、Fire=held 連射対比、Charge=長押し |
| `coordinates` | 座標変換 | ✅ | **一発** | 0 | 2026-07-23 | `algorithms/coordinates.html` | [SPEC](./coordinates/SPEC.md) | ローカル/ワールド/スクリーン。親子回転合成・カメラ・クリック逆変換 |
| `rng-seed` | 乱数とシード | ✅ | **一発** | 0 | 2026-07-23 | `algorithms/rng-seed.html` | [SPEC](./rng-seed/SPEC.md) | Mulberry32（platform）。同シード再現・ヒストグラム・ダイス写像 |

**学習ストーリー**: ゲームループ → 時間管理 → 入力 → 座標 → 乱数とシード（**カテゴリ一通り完了**）  

---

## カテゴリ: 物理・判定 (`physics`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `collision` | AABB 衝突判定 | ✅ | **調整** | 2 | 2026-07-17 | `algorithms/collision.html` | [SPEC](./collision/SPEC.md) | 非マップ説明UI。重なり/分離の二重実装と比較 |

---

## カテゴリ: 設計パターン (`patterns`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `fsm` | ステートマシン | ✅ | **一発** | 0 | 2026-07-17 | `algorithms/fsm.html` | [SPEC](./fsm/SPEC.md) | 状態図・イベント・遷移表の初版 |

---

## 成熟度サマリ（2026-07-23・23 トピック ready）

| 成熟度 | 件数 | id |
|--------|------|-----|
| 一発 (`oneshot`) | 11 | fsm, tic-tac-toe, mcts, nim, othello-4x4, bidirectional-search, game-loop, time-management, input-basics, coordinates, rng-seed |
| 調整 (`revised`) | 12 | bfs, dfs, dijkstra, best-first, astar, collision, and-or, minimax, alpha-beta, monte-carlo, multi-armed-bandit, chopsticks |
| 安定 (`stable`) | 0 | — |

Fable5 起点のコード改訂 ↔ 成熟度の対応表: [MATURITY.md](./MATURITY.md) の「Fable5 レビュー → 成熟度の突き合わせ」。

---

## 企画中（本カタログ外）

実装済み以外のカテゴリ（`ai-steering`, `spatial`, `hci`, `networking`, `audio`, `graphics`, `quality`, `procgen` 等）および  
（`fundamentals` は 5 本すべて実装済）  

物理段階・Boids・通信 等のトピックは **[ROADMAP.md §2.4](../ROADMAP.md)** に **企画中** として列挙する。  
着手するまで ready 行を増やさない。

---

## 追加・更新手順

1. 本カタログに1行追加（ready ❌、成熟度は通常 **一発**、修正 **0**、更新は着手日）  
2. `js/platform/maturity.js` の `TOPIC_META` に `maturity` / `revisions` / `updated`  
3. `js/main.js` の `TOPICS` に同じ id・`maturity`  
4. `docs/topics/<id>/SPEC.md` を作成  
5. 実装後 ready ✅。**改訂したら** 成熟度を 調整、**修正 +1**、**更新日を今日**、改訂メモ1行  
6. 授業据え置きを決めたら **安定** へ（[MATURITY.md](./MATURITY.md) のチェック）  

詳細は [WORKFLOW.md](../WORKFLOW.md) / [TOPIC_SCAFFOLD.md](../templates/TOPIC_SCAFFOLD.md)。
