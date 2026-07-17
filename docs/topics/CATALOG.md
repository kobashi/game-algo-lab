# トピックカタログ

最終更新: 2026-07-17  

- **実装の正**: この表 と `js/main.js` の `TOPICS`（ずれたら両方直す）  
- **成熟度の定義**: [MATURITY.md](./MATURITY.md)（`oneshot` / `revised` / `stable`）

### 成熟度の略号

| 表示 | コード | 意味 |
|------|--------|------|
| 一発 | `oneshot` | 一発未調整版 |
| 調整 | `revised` | 改訂・調整版 |
| 安定 | `stable` | 安定版 |

---

## カテゴリ: 経路探索 (`pathfinding`)

| id | タイトル | ready | 成熟度 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|--------|------|----------|
| `bfs` | 幅優先探索 (BFS) | ✅ | **調整** | `algorithms/bfs.html` | 実装先行 | コスト比較・複数G・ペイント・表示 |
| `dfs` | 深さ優先探索 (DFS) | ✅ | **調整** | `algorithms/dfs.html` | 実装先行 | コールスタック可視化・地図・ペイント |
| `dijkstra` | ダイクストラ法 | ✅ | **調整** | `algorithms/dijkstra.html` | 実装先行 | g 表示・複数G・platform 寄せ |
| `best-first` | 最良優先探索 | ✅ | **調整** | `algorithms/best-first.html` | 実装先行 | h 表示・複数G・platform 寄せ |
| `astar` | A* 探索 | ✅ | **調整** | `algorithms/astar.html` | 実装先行 | f/g/h・負コスト注記・複数G |

**学習ストーリー**: 歩数（BFS）→ 深さ（DFS）→ コスト g → 見積り h → 統合 f=g+h  

**成熟度メモ**: いずれも一発実装後に機能・教材表示の改訂あり → `revised`。授業で据え置くなら `stable` へ昇格。

---

## カテゴリ: ゲーム木 (`game-tree`)

| id | タイトル | ready | 成熟度 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|--------|------|----------|
| `and-or` | AND-OR 探索 | ✅ | **一発** | `algorithms/and-or.html` | [SPEC](./and-or/SPEC.md) | シリーズ初版。基盤寄せのみ |
| `minimax` | Min-Max 探索 | ✅ | **一発** | `algorithms/minimax.html` | [SPEC](./minimax/SPEC.md) | シリーズ初版。基盤寄せのみ |
| `alpha-beta` | α-β 法 | ✅ | **一発** | `algorithms/alpha-beta.html` | [SPEC](./alpha-beta/SPEC.md) | 枝刈り可視化の初版 |
| `monte-carlo` | モンテカルロ法 | ✅ | **一発** | `algorithms/monte-carlo.html` | [SPEC](./monte-carlo/SPEC.md) | プレイアウト平均の初版 |
| `multi-armed-bandit` | 多腕バンディット | ✅ | **一発** | `algorithms/multi-armed-bandit.html` | [SPEC](./multi-armed-bandit/SPEC.md) | ε-greedy/UCB1 初版 |

**推奨実装順**: 上から順（AND-OR → … → バンディット）  

**成熟度メモ**: 試作 v0.9.0 時点は内容の大規模改訂なし → `oneshot`。教材フィードバック後に `revised` へ。

---

## カテゴリ: 物理・判定 (`physics`)

| id | タイトル | ready | 成熟度 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|--------|------|----------|
| `collision` | AABB 衝突判定 | ✅ | **調整** | `algorithms/collision.html` | [SPEC](./collision/SPEC.md) | 非マップ説明UI。重なり/分離の二重実装と比較 |

---

## カテゴリ: 設計パターン (`patterns`)

| id | タイトル | ready | 成熟度 | ページ | SPEC | 改訂メモ |
|----|----------|-------|--------|--------|------|----------|
| `fsm` | ステートマシン | ✅ | **一発** | `algorithms/fsm.html` | [SPEC](./fsm/SPEC.md) | 状態図・イベント・遷移表の初版 |

---

## 成熟度サマリ（試作 v0.9.0 時点）

| 成熟度 | 件数 | id |
|--------|------|-----|
| 一発 (`oneshot`) | 6 | and-or, minimax, alpha-beta, monte-carlo, multi-armed-bandit, fsm |
| 調整 (`revised`) | 6 | bfs, dfs, dijkstra, best-first, astar, collision |
| 安定 (`stable`) | 0 | — |

---

## 追加・更新手順

1. 本カタログに1行追加（ready ❌、成熟度は通常 **一発**）  
2. `js/main.js` の `TOPICS` に同じ id・`maturity` を追加  
3. `docs/topics/<id>/SPEC.md` を作成（表に成熟度）  
4. 実装後 ready ✅。**改訂したら成熟度を 調整 に上げ、改訂メモを1行**  
5. 授業据え置きを決めたら **安定** へ（[MATURITY.md](./MATURITY.md) のチェック）  

詳細は [WORKFLOW.md](../WORKFLOW.md) / [TOPIC_SCAFFOLD.md](../templates/TOPIC_SCAFFOLD.md)。
