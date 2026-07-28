# トピックカタログ

最終更新: 2026-07-28（ready 95 · v0.11.0）  

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
| `coordinates` | 座標変換 | ✅ | **調整** | 1 | 2026-07-28 | `algorithms/coordinates.html` | [SPEC](./coordinates/SPEC.md) | gfx-coordinates 統合・CG 導線（カメラ/UI/Mesh） |
| `rng-seed` | 乱数とシード | ✅ | **調整** | 1 | 2026-07-23 | `algorithms/rng-seed.html` | [SPEC](./rng-seed/SPEC.md) | Mulberry32/XorShift/LCG 切替。LCG は a,c,m プリセット（質の悪い例〜実用寄り）と周期計測・ヒストグラム |

**学習ストーリー**: ゲームループ → 時間管理 → 入力 → 座標 → 乱数とシード（**カテゴリ一通り完了**）  

---

## カテゴリ: プロシージャル (`procgen`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `maze-gen` | 迷路生成 | ✅ | **一発** | 0 | 2026-07-23 | `algorithms/maze-gen.html` | [SPEC](./maze-gen/SPEC.md) | Recursive Backtracker / Prim 風。Mulberry32 シード。1ステップ可視化 |
| `weighted-random` | 重み付き抽選・分布 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/weighted-random.html` | [SPEC](./weighted-random/SPEC.md) | 累積重み抽選 + ヒストグラム。Fisher–Yates 対比。Mulberry32 |
| `constrained-gen` | 制約付き生成 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/constrained-gen.html` | [SPEC](./constrained-gen/SPEC.md) | 乱択壁 + BFS 到達性棄却ループ |
| `dungeon-gen` | ダンジョン生成 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/dungeon-gen.html` | [SPEC](./dungeon-gen/SPEC.md) | 部屋配置 + L 字通路。1ステップ可視化 |
| `noise-terrain` | ノイズと地形 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/noise-terrain.html` | [SPEC](./noise-terrain/SPEC.md) | Value Noise + fBm。海陸色分け |
| `balance-sim` | ゲームバランス分析 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/balance-sim.html` | [SPEC](./balance-sim/SPEC.md) | 簡易戦闘 N 回 · 勝率バー |

**学習ストーリー**: 乱数 → 迷路 → 重み付き → 制約付き → ダンジョン → ノイズ → **バランス分析**  

---

## カテゴリ: 物理・判定 (`physics`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `grid-pseudo-physics` | グリッド擬似物理 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/grid-pseudo-physics.html` | [SPEC](./grid-pseudo-physics/SPEC.md) | マス落下。連続速度なし |
| `velocity-motion` | 速度による移動 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/velocity-motion.html` | [SPEC](./velocity-motion/SPEC.md) | p←p+v·dt。軌跡・速度矢印・壁バウンス |
| `accel-decel` | 加減速 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/accel-decel.html` | [SPEC](./accel-decel/SPEC.md) | 加速・最高速度・ブレーキ |
| `accel-gravity` | 加速度と重力 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/accel-gravity.html` | [SPEC](./accel-gravity/SPEC.md) | v+=g·dt; p+=v·dt。放物線・反発 |
| `friction-bounce` | 摩擦・反発 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/friction-bounce.html` | [SPEC](./friction-bounce/SPEC.md) | 床バウンス e · 接地摩擦 |
| `collision` | AABB 衝突判定 | ✅ | **調整** | 2 | 2026-07-17 | `algorithms/collision.html` | [SPEC](./collision/SPEC.md) | 非マップ説明UI。重なり/分離の二重実装と比較 |
| `circle-collision` | 円同士・円と AABB | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/circle-collision.html` | [SPEC](./circle-collision/SPEC.md) | 中心距離・Clamp 最近点 |
| `momentum-1d` | 質量と運動量（1D） | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/momentum-1d.html` | [SPEC](./momentum-1d/SPEC.md) | 弾性/非弾性 · Σp/KE |
| `raycast-shapes` | 線分・レイキャスト | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/raycast-shapes.html` | [SPEC](./raycast-shapes/SPEC.md) | 円・AABB への最近 t |
| `collision-response` | 衝突応答 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/collision-response.html` | [SPEC](./collision-response/SPEC.md) | 分離 + 法線インパルス |
| `obb-sat` | OBB / SAT | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/obb-sat.html` | [SPEC](./obb-sat/SPEC.md) | 回転矩形 · 分離軸 |
| `swept-aabb` | Swept AABB / TOI | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/swept-aabb.html` | [SPEC](./swept-aabb/SPEC.md) | 連続衝突 · トンネル比較 |
| `rotational-motion` | 回転運動 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/rotational-motion.html` | [SPEC](./rotational-motion/SPEC.md) | トルク · ω · 作用点 |
| `rotating-collision` | 回転中の衝突 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/rotating-collision.html` | [SPEC](./rotating-collision/SPEC.md) | 回転 OBB + SAT 応答 |
| `concave-compound` | 凹形状の凸分割 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/concave-compound.html` | [SPEC](./concave-compound/SPEC.md) | 複合 AABB · 誤ヒット比較 |

**学習ストーリー**: 擬似→…→回転 → 回転衝突 · 複合コライダー（物理シリーズ一通り）  

---

## カテゴリ: 設計パターン (`patterns`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `fsm` | ステートマシン | ✅ | **一発** | 0 | 2026-07-17 | `algorithms/fsm.html` | [SPEC](./fsm/SPEC.md) | 状態図・イベント・遷移表の初版 |
| `event-system` | イベントシステム | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/event-system.html` | [SPEC](./event-system/SPEC.md) | On/Off/Emit の pub/sub。購読ログ可視化 |
| `object-pool` | オブジェクトプール | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/object-pool.html` | [SPEC](./object-pool/SPEC.md) | 弾の Acquire/Release。created/reused 比較 |
| `command-pattern` | コマンドパターン | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/command-pattern.html` | [SPEC](./command-pattern/SPEC.md) | execute/undo 履歴スタック |
| `component-vs-inheritance` | 継承 vs コンポーネント | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/component-vs-inheritance.html` | [SPEC](./component-vs-inheritance/SPEC.md) | 階層 vs 能力トグル比較 |
| `ecs-intro` | ECS 入門 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/ecs-intro.html` | [SPEC](./ecs-intro/SPEC.md) | Entity/Component/System 表 |

**学習ストーリー**: FSM → イベント → プール → コマンド → 継承/Comp → ECS  

---

## カテゴリ: 入力・操作感 (`hci`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `coyote-time` | コヨーテタイム | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/coyote-time.html` | [SPEC](./coyote-time/SPEC.md) | 崖際ジャンプ猶予 ON/OFF 比較 |
| `input-buffer` | 入力バッファ | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/input-buffer.html` | [SPEC](./input-buffer/SPEC.md) | 着地前ジャンプの先読み窓 |

**学習ストーリー**: 入力の基礎 → コヨーテタイム → 入力バッファ →（予定）入力抽象化  

---

## カテゴリ: 空間探索・最適化 (`spatial`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `brute-force-pairs` | 総当たり O(n²) | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/brute-force-pairs.html` | [SPEC](./brute-force-pairs/SPEC.md) | 全ペア検査ベースライン |
| `uniform-grid` | 一様グリッド | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/uniform-grid.html` | [SPEC](./uniform-grid/SPEC.md) | 近傍セルのみ。総当たり比較 |
| `broad-narrow-phase` | Broad / Narrow Phase | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/broad-narrow-phase.html` | [SPEC](./broad-narrow-phase/SPEC.md) | 候補 vs 精密ヒット |
| `sweep-and-prune` | Sweep and Prune | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/sweep-and-prune.html` | [SPEC](./sweep-and-prune/SPEC.md) | X 軸区間ソート |
| `quadtree` | 四分木 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/quadtree.html` | [SPEC](./quadtree/SPEC.md) | 適応的4分割 · 範囲クエリ |
| `bvh-overview` | BVH 概説 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/bvh-overview.html` | [SPEC](./bvh-overview/SPEC.md) | 物体 AABB 階層 · クエリ剪定 |

**学習ストーリー**: 総当たり → グリッド → Broad/Narrow → SaP → 四分木 → BVH  

---

## カテゴリ: ゲーム AI・ステアリング (`ai-steering`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `steering-seek-flee` | Seek / Flee / Arrive | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/steering-seek-flee.html` | [SPEC](./steering-seek-flee/SPEC.md) | 舵力ベクトル可視化 |
| `steering-wander-avoid` | Wander / Avoidance | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/steering-wander-avoid.html` | [SPEC](./steering-wander-avoid/SPEC.md) | 揺らぎ + 障害回避 |
| `boids` | Boids / Flocking | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/boids.html` | [SPEC](./boids/SPEC.md) | 分離・整列・結合 |
| `steering-leader` | Leader Following | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/steering-leader.html` | [SPEC](./steering-leader/SPEC.md) | 後方スロットへ Arrive |
| `behavior-tree` | ビヘイビアツリー | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/behavior-tree.html` | [SPEC](./behavior-tree/SPEC.md) | Selector/Sequence · Chase/Patrol |
| `obstacle-avoidance-nav` | 障害物回避（ナビ連携） | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/obstacle-avoidance-nav.html` | [SPEC](./obstacle-avoidance-nav/SPEC.md) | BFS 経路 + 局所回避 |

**学習ストーリー**: Seek → Wander → Boids → Leader → BT → ナビ連携回避  

---

## カテゴリ: 設計・品質 (`quality`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `save-load` | セーブ・ロード | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/save-load.html` | [SPEC](./save-load/SPEC.md) | version + マイグレーション · localStorage |
| `replay-determinism` | リプレイと決定性 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/replay-determinism.html` | [SPEC](./replay-determinism/SPEC.md) | 入力記録 + シード |
| `debug-overlays` | デバッグ可視化 | ✅ | **一発** | 0 | 2026-07-27 | `algorithms/debug-overlays.html` | [SPEC](./debug-overlays/SPEC.md) | コライダー/速度/AI レイヤ |
| `profiling-loop` | プロファイリング循環 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/profiling-loop.html` | [SPEC](./profiling-loop/SPEC.md) | 測定→改善→再測定 |
| `unit-test-gameplay` | ゲームロジックのテスト | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/unit-test-gameplay.html` | [SPEC](./unit-test-gameplay/SPEC.md) | 純関数 PASS/FAIL |

**学習ストーリー**: セーブ → リプレイ → デバッグ → 計測 → ユニットテスト  

---

## カテゴリ: 入力・操作感 (`hci`) 追記

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `input-abstraction` | 入力抽象化 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/input-abstraction.html` | [SPEC](./input-abstraction/SPEC.md) | アクションマップ |
| `command-input` | コマンド入力 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/command-input.html` | [SPEC](./command-input/SPEC.md) | 技コマンド照合 |
| `accessibility-basics` | アクセシビリティ基礎 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/accessibility-basics.html` | [SPEC](./accessibility-basics/SPEC.md) | 色・字幕・動き・文字 |

---

## カテゴリ: サウンド (`audio`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `sfx-events` | イベントと効果音 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/sfx-events.html` | [SPEC](./sfx-events/SPEC.md) | Emit → Web Audio |
| `sfx-voice-limit` | 同時発音・重複制御 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/sfx-voice-limit.html` | [SPEC](./sfx-voice-limit/SPEC.md) | steal / drop |
| `sfx-randomize` | SE のランダム化 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/sfx-randomize.html` | [SPEC](./sfx-randomize/SPEC.md) | ピッチ/音量 + シャッフルバッグ |
| `sfx-spatial` | 距離・パン・空間 SE | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/sfx-spatial.html` | [SPEC](./sfx-spatial/SPEC.md) | 距離減衰 + ステレオパン |
| `audio-bus-ducking` | サウンドバスとダッキング | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/audio-bus-ducking.html` | [SPEC](./audio-bus-ducking/SPEC.md) | Master/BGM/SE · ダック |
| `bgm-loop` | BGM ループ / イントロ＋ループ | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/bgm-loop.html` | [SPEC](./bgm-loop/SPEC.md) | 再生ヘッド · loopStart |
| `sfx-material` | 材質別・衝突強度と音 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/sfx-material.html` | [SPEC](./sfx-material/SPEC.md) | 材質ペア · 強度スケール |
| `bgm-quantize` | 量子化（拍・小節） | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/bgm-quantize.html` | [SPEC](./bgm-quantize/SPEC.md) | 即時/次拍/次小節 |
| `bgm-transition-compare` | BGM 切替方式の比較 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/bgm-transition-compare.html` | [SPEC](./bgm-transition-compare/SPEC.md) | 即時/クロス/拍同期 |
| `bgm-interactive` | 拍同期・レイヤー型 BGM | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/bgm-interactive.html` | [SPEC](./bgm-interactive/SPEC.md) | 層 gain · 次小節 |

---

## カテゴリ: ゲーム CG (`graphics`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `gfx-gpu-concepts` | GPU パイプライン概説 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-gpu-concepts.html` | [SPEC](./gfx-gpu-concepts/SPEC.md) | 概念デモ · 実 GPU API なし |
| `gfx-sprite-2d` | 2D スプライト | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-sprite-2d.html` | [SPEC](./gfx-sprite-2d/SPEC.md) | シートフレーム · Y ソート |
| `gfx-camera` | カメラと投影（2D フォロー） | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-camera.html` | [SPEC](./gfx-camera/SPEC.md) | デッドゾーン · world→screen |
| `gfx-animation-vfx` | アニメーション・パーティクル | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-animation-vfx.html` | [SPEC](./gfx-animation-vfx/SPEC.md) | lifetime · 上限プール |
| `gfx-lighting-alpha` | ライティング・透明度 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-lighting-alpha.html` | [SPEC](./gfx-lighting-alpha/SPEC.md) | 点光源 · α/加算 |
| `gfx-postprocess` | ポストプロセス | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-postprocess.html` | [SPEC](./gfx-postprocess/SPEC.md) | 彩度·ビネット·ブルーム |
| `gfx-lod-culling` | LOD・カリング | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-lod-culling.html` | [SPEC](./gfx-lod-culling/SPEC.md) | フラスタム · LOD0/1/2 |
| `gfx-ui-canvas` | UI 描画（Anchor・Pivot） | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-ui-canvas.html` | [SPEC](./gfx-ui-canvas/SPEC.md) | Anchor·Pivot·解像度 |
| `gfx-mesh-uv` | メッシュ・UV・マテリアル | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/gfx-mesh-uv.html` | [SPEC](./gfx-mesh-uv/SPEC.md) | 2tris · UV · tint |

---

## カテゴリ: 通信・データ (`networking`)

| id | タイトル | ready | 成熟度 | 修正 | 更新 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|------|------|--------|------|----------|
| `net-p2p-demo` | P2P 通信の観察 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/net-p2p-demo.html` | [SPEC](./net-p2p-demo/SPEC.md) | 疑似遅延・欠落・順序 |
| `net-prediction` | 補間・予測・補正 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/net-prediction.html` | [SPEC](./net-prediction/SPEC.md) | クライアント予測 · 権威補正 |
| `net-client-server` | クライアント・サーバ（権威） | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/net-client-server.html` | [SPEC](./net-client-server/SPEC.md) | maxSpeed クランプ |
| `net-sync-modes` | 状態同期 vs 入力同期 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/net-sync-modes.html` | [SPEC](./net-sync-modes/SPEC.md) | 帯域・誤差比較 |
| `net-anti-cheat` | サーバ権威とチート対策 | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/net-anti-cheat.html` | [SPEC](./net-anti-cheat/SPEC.md) | 速度·スコア検証 |
| `net-db-transaction` | DB とトランザクション | ✅ | **一発** | 0 | 2026-07-28 | `algorithms/net-db-transaction.html` | [SPEC](./net-db-transaction/SPEC.md) | COMMIT/ROLLBACK |

---

## 成熟度サマリ（2026-07-28·95 トピック ready）

| 成熟度 | 件数 | id |
|--------|------|-----|
| 一発 (`oneshot`) | 81 | 詳細は TOPIC_META |
| 調整 (`revised`) | 14 | bfs〜rng-seed · coordinates 等 |
| 安定 (`stable`) | 0 | — |

Fable5 起点のコード改訂 ↔ 成熟度の対応表: [MATURITY.md](./MATURITY.md) の「Fable5 レビュー → 成熟度の突き合わせ」。

---

## 企画中（本カタログ外）

実装済み以外のカテゴリ（`networking`, `audio`, `graphics`, `quality` 等）および  
（`fundamentals` / `procgen` / `spatial` 入口 / `ai-steering` 入口 は着手済）  

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
