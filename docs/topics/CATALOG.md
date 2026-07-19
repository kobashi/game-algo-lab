# トピックカタログ

最終更新: 2026-07-19（教材品質レビュー反映）  

- **実装の正**: この表 と `js/main.js` の `TOPICS`（ずれたら両方直す）  
- **成熟度の定義**: [MATURITY.md](./MATURITY.md)（`oneshot` / `revised` / `stable` + **修正回数** + **更新日**）  
- **Web 表示の正**: `js/platform/maturity.js` の `TOPIC_META`（`maturity` / `revisions` / `updated`）  
- **未実装のカテゴリ・トピック（企画中のみ）**: [../ROADMAP.md](../ROADMAP.md) の **§2.3 / §2.4**。メニュー未掲載・SPEC 未作成。

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

**学習ストーリー**: 歩数（BFS）→ 深さ（DFS）→ コスト g → 見積り h → 統合 f=g+h  

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
| `chopsticks` | 割り箸（循環グラフ・後退解析） | ✅ | **一発** | 0 | 2026-07-19 | `algorithms/chopsticks.html` | [SPEC](./chopsticks/SPEC.md)（implemented） | 正本 §6.4。初版。状態=(手番側ペア,相手側ペア)で正規化（225局面≤450）。後退解析を波単位ジェネレータで実装、15×15マトリクスで波の広がりを可視化。分割・死の条件（5以上/ちょうど5）・mod5 の6構成すべてで独立実装との全局面ラベル一致を確認。分割ありでDRAW14局面が出現（標準は0）。深さ制限Min-Max(5/10/20)はDRAW局面で値0のまま確定しない一方、決着バリアントは深さ10以降で真値に収束することを確認 |
| `nim` | ニム（完全読み切り→理論解） | ❌ | —（準備中） | 0 | 2026-07-19 | —（未実装） | [SPEC](./nim/SPEC.md)（draft） | 正本 §6.2。SPEC 起草済み・実装未着手 |

**推奨実装順**: 上から順（AND-OR → … → バンディット → 三目並べ）  

**成熟度メモ**: 2026-07-19 の教材品質レビュー（[レビュー](../reviews/2026-07-19-demo-pedagogy-review.md)）を受け、
ゲーム木4本（and-or/minimax/alpha-beta/monte-carlo）を深さ3の標準木に、多腕バンディットを
難易度プリセット追加に改訂 → いずれも `oneshot` → `revised`（修正+1）。
三目並べ・割り箸は同日に新規実装（初版のため `oneshot`）。

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

## 成熟度サマリ（試作 v0.9.0 時点）

| 成熟度 | 件数 | id |
|--------|------|-----|
| 一発 (`oneshot`) | 3 | fsm, tic-tac-toe, chopsticks |
| 調整 (`revised`) | 11 | bfs, dfs, dijkstra, best-first, astar, collision, and-or, minimax, alpha-beta, monte-carlo, multi-armed-bandit |
| 安定 (`stable`) | 0 | — |

---

## 企画中（本カタログ外）

実装済み以外のカテゴリ（`fundamentals`, `ai-steering`, `spatial`, `hci`, `networking`, `audio`, `graphics`, `quality`, `procgen` 等）および  
MCTS・ニム・4×4 オセロ・物理段階・Boids・通信 等のトピックは **[ROADMAP.md §2.4](../ROADMAP.md)** に **企画中** として列挙する。  
着手するまで **ready 行を増やさない**（先に ROADMAP の状態を「実装済」に更新する運用でも可）。

---

## 追加・更新手順

1. 本カタログに1行追加（ready ❌、成熟度は通常 **一発**、修正 **0**、更新は着手日）  
2. `js/platform/maturity.js` の `TOPIC_META` に `maturity` / `revisions` / `updated`  
3. `js/main.js` の `TOPICS` に同じ id・`maturity`  
4. `docs/topics/<id>/SPEC.md` を作成  
5. 実装後 ready ✅。**改訂したら** 成熟度を 調整、**修正 +1**、**更新日を今日**、改訂メモ1行  
6. 授業据え置きを決めたら **安定** へ（[MATURITY.md](./MATURITY.md) のチェック）  

詳細は [WORKFLOW.md](../WORKFLOW.md) / [TOPIC_SCAFFOLD.md](../templates/TOPIC_SCAFFOLD.md)。
