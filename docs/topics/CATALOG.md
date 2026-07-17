# トピックカタログ

最終更新: 2026-07-17  
実装状態の正: この表 と `js/main.js` の `TOPICS`（ずれたら両方直す）

---

## カテゴリ: 経路探索 (`pathfinding`)

| id | タイトル | ready | ページ | SPEC |
|----|----------|-------|--------|------|
| `bfs` | 幅優先探索 (BFS) | ✅ | `algorithms/bfs.html` | 実装済（SPEC 後追い可） |
| `dfs` | 深さ優先探索 (DFS) | ✅ | `algorithms/dfs.html` | 実装済 |
| `dijkstra` | ダイクストラ法 | ✅ | `algorithms/dijkstra.html` | 実装済 |
| `best-first` | 最良優先探索 | ✅ | `algorithms/best-first.html` | 実装済 |
| `astar` | A* 探索 | ✅ | `algorithms/astar.html` | 実装済 |

**学習ストーリー**: 歩数（BFS）→ 深さ（DFS）→ コスト g → 見積り h → 統合 f=g+h

---

## カテゴリ: ゲーム木 (`game-tree`)

| id | タイトル | ready | 予定ページ | SPEC |
|----|----------|-------|------------|------|
| `and-or` | AND-OR 探索 | ✅ | `algorithms/and-or.html` | [SPEC](./and-or/SPEC.md) |
| `minimax` | Min-Max 探索 | ✅ | `algorithms/minimax.html` | [SPEC](./minimax/SPEC.md) |
| `alpha-beta` | α-β 法 | ✅ | `algorithms/alpha-beta.html` | [SPEC](./alpha-beta/SPEC.md) |
| `monte-carlo` | モンテカルロ法 | ❌ | `algorithms/monte-carlo.html` | 未作成 |
| `multi-armed-bandit` | 多腕バンディット | ❌ | `algorithms/multi-armed-bandit.html` | 未作成 |

**推奨実装順**: 上から順（AND-OR → … → バンディット）

---

## カテゴリ: 物理・判定 (`physics`)

| id | タイトル | ready | 予定ページ | SPEC |
|----|----------|-------|------------|------|
| `collision` | AABB 衝突判定 | ❌ | `algorithms/collision.html` | 未作成 |

---

## カテゴリ: 設計パターン (`patterns`)

| id | タイトル | ready | 予定ページ | SPEC |
|----|----------|-------|------------|------|
| `fsm` | ステートマシン | ❌ | `algorithms/fsm.html` | 未作成 |

---

## 追加手順（短い版）

1. 本カタログに1行追加（ready ❌）  
2. `js/main.js` の `TOPICS` に同じ id で追加  
3. `docs/topics/<id>/SPEC.md` を [templates/SPEC.md](../templates/SPEC.md) から作成  
4. 実装後 ready ✅ とファイルパスを更新  

詳細は [WORKFLOW.md](../WORKFLOW.md)。
