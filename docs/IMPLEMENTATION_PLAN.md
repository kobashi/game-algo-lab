# 実装計画（難易度順）

| 項目 | 内容 |
|------|------|
| **根拠** | [ROADMAP.md](./ROADMAP.md) §2.3–2.4・§5 |
| **現状** | ready **71** トピック（2026-07-28 時点） |
| **方針** | **簡単なものから順に** SPEC → 実装 → smoke →（区切りで）Release |
| **除外** | §5 着手保留: E2E / i18n / `path-compare` / `game-tree-engine` |

最終更新: **2026-07-28**（a11y / unit-test / ナビ回避 / voice-limit）

---

## 1. 難易度の見方（このリポジトリ向け）

| 難度 | 目安 | 典型パターン |
|------|------|----------------|
| **E（易）** | 1 セッション前後 | explain UI または既存グリッド流用、純関数中心、platform 追加ほぼ不要、`rng-seed` / `maze-gen` / `fsm` 級 |
| **M（中）** | 1〜2 セッション | 複数オブジェクト・比較トグル・計測パネル、既存 category の延長 |
| **H（難）** | 複数セッション or platform 拡張 | 連続物理・空間分割の本格可視化・通信疑似・音の拍同期・GPU 概念の深い説明 |
| **X（後回し）** | 方針決定が先 | Unity 依存の分岐、バックエンド必須、大規模抽象化 |

**依存ルール**

- 同カテゴリは ROADMAP の学習順を優先（難度が近くても順を崩しすぎない）
- 既存トピックへの接続が強いもの（乱数→procgen、入力→HCI、AABB→物理）を先にすると再利用が効く
- 品質系は「見せる対象」が先にあるほど効果が出る → 物理・AI が少し揃ってからでもよい

---

## 2. 実装済み（計画対象外）

| カテゴリ | 実装済 id |
|----------|-----------|
| pathfinding | bfs, dfs, dijkstra, best-first, astar, bidirectional-search |
| game-tree | and-or, minimax, alpha-beta, monte-carlo, multi-armed-bandit, tic-tac-toe, mcts, nim, chopsticks, othello-4x4 |
| fundamentals | game-loop, time-management, input-basics, coordinates, rng-seed |
| physics | 擬似〜応答, obb-sat, swept-aabb, rotational-motion |
| patterns | fsm, event-system, object-pool, command-pattern, component-vs-inheritance, ecs-intro |
| procgen | maze-gen, weighted-random, constrained-gen, dungeon-gen, noise-terrain |
| hci | coyote-time, input-buffer |
| spatial | brute-force〜quadtree, bvh-overview |
| ai-steering | seek〜leader, boids, behavior-tree |
| quality | save-load, replay-determinism, debug-overlays |

---

## 3. 推奨実装順（難易度 × 依存）

番号が小さいほど先。同じ Wave 内は上から。

### Wave A — すぐ効く・易〜中（現状の延長）

| # | id | タイトル | 難度 | カテゴリ | 理由・依存 |
|---|-----|----------|------|----------|------------|
| 1 | `weighted-random` | 重み付き抽選・分布 | **E** | procgen | ✅ **実装済** 2026-07-27 |
| 2 | `event-system` | イベントシステム | **E** | patterns | ✅ **実装済** 2026-07-27 |
| 3 | `object-pool` | オブジェクトプール | **E** | patterns | ✅ **実装済** 2026-07-27 |
| 4 | `velocity-motion` | 速度による移動 | **E** | physics | ✅ **実装済** 2026-07-27 |
| 5 | `grid-pseudo-physics` | グリッド擬似物理 | **E** | physics | ✅ **実装済** 2026-07-27 |
| 6 | `coyote-time` | コヨーテタイム | **E** | hci | ✅ **実装済** 2026-07-27 |
| 7 | `input-buffer` | 入力バッファ | **E〜M** | hci | ✅ **実装済** 2026-07-27 |
| 8 | `command-pattern` | コマンドパターン | **E〜M** | patterns | ✅ **実装済** 2026-07-27 |
| 9 | `component-vs-inheritance` | 継承 vs コンポーネント | **E** | patterns | ✅ **実装済** 2026-07-27 |
| 10 | `constrained-gen` | 制約付き生成 | **M** | procgen | ✅ **実装済** 2026-07-27 |
| 11 | `dungeon-gen` | ダンジョン生成 | **M** | procgen | ✅ **実装済** 2026-07-27 |
| 12 | `noise-terrain` | ノイズと地形 | **M** | procgen | ✅ **実装済** 2026-07-27 |

**Wave A 完了**（2026-07-27）: procgen が乱数→迷路→抽選→制約→ダンジョン→ノイズまで繋がり、物理の連続運動入口と HCI の操作感デモが立った。

---

### Wave B — 第3期物理の本線（段階的・難度上昇）

正本の段階性に沿い、**連続座標の運動 → 衝突形状 → 応答**。

| # | id | タイトル | 難度 | 前提 |
|---|-----|----------|------|------|
| 13 | `accel-decel` | 加減速 | **E〜M** | ✅ **実装済** 2026-07-27 |
| 14 | `accel-gravity` | 加速度と重力 | **E〜M** | ✅ **実装済** |
| 15 | `friction-bounce` | 摩擦・反発 | **M** | ✅ **実装済** 2026-07-27 |
| 16 | `circle-collision` | 円同士・円と AABB | **M** | ✅ **実装済** 2026-07-27 |
| 17 | `momentum-1d` | 質量と運動量（1D） | **M** | ✅ **実装済** 2026-07-27 |
| 18 | `raycast-shapes` | 線分・レイキャスト | **M** | ✅ **実装済** 2026-07-27 |
| 19 | `collision-response` | 衝突応答 | **M〜H** | ✅ **実装済** 2026-07-27 |
| 20 | `obb-sat` | OBB / SAT | **H** | ✅ **実装済** 2026-07-27 |
| 21 | `swept-aabb` | Swept AABB / TOI | **H** | ✅ **実装済** 2026-07-27 |
| 22 | `rotational-motion` | 回転運動 | **H** | ✅ **実装済** 2026-07-27 |
| 23 | `rotating-collision` | 回転中の衝突 | **H** | ✅ **実装済** 2026-07-28 |
| 24 | `concave-compound` | 凹形状の凸分割 | **H** | ✅ **実装済** 2026-07-28 |

**物理の最短パス（教材として十分見えるまで）**:  
`velocity-motion` → `accel-gravity` → `circle-collision` → `collision-response`  
（その後に SAT / swept を足す）

---

### Wave C — 空間分割（物理・大量オブジェクトと接続）

| # | id | タイトル | 難度 | メモ |
|---|-----|----------|------|------|
| 25 | `brute-force-pairs` | 総当たり O(n²) | **E〜M** | ✅ **実装済** 2026-07-27 |
| 26 | `uniform-grid` | 一様グリッド | **M** | ✅ **実装済** 2026-07-27 |
| 27 | `broad-narrow-phase` | Broad / Narrow | **M** | ✅ **実装済** 2026-07-27 |
| 28 | `sweep-and-prune` | Sweep and Prune | **M〜H** | ✅ **実装済** 2026-07-27 |
| 29 | `quadtree` | 四分木 | **H** | ✅ **実装済** 2026-07-27 |
| 30 | `bvh-overview` | BVH 概説 | **H** | ✅ **実装済** 2026-07-27 |

---

### Wave D — AI ステアリング（第4期入口）

| # | id | タイトル | 難度 | メモ |
|---|-----|----------|------|------|
| 31 | `steering-seek-flee` | Seek / Flee / Arrive | **M** | ✅ **実装済** |
| 32 | `steering-wander-avoid` | Wander / Obstacle Avoidance | **M** | ✅ **実装済** 2026-07-27 |
| 33 | `steering-leader` | Leader Following | **M** | ✅ **実装済** 2026-07-27 |
| 34 | `boids` | Boids | **M〜H** | ✅ **実装済** |
| 35 | `behavior-tree` | ビヘイビアツリー | **M** | ✅ **実装済** |
| 36 | `obstacle-avoidance-nav` | 障害物回避（ナビ連携） | **H** | ✅ **実装済** 2026-07-28 |

---

### Wave E — 設計・品質・HCI 残り

| # | id | タイトル | 難度 | メモ |
|---|-----|----------|------|------|
| 37 | `ecs-intro` | ECS 入門 | **M** | ✅ **実装済** 2026-07-27 |
| 38 | `input-abstraction` | 入力抽象化 | **M** | ✅ **実装済** 2026-07-28 |
| 39 | `command-input` | コマンド入力 | **M** | ✅ **実装済** 2026-07-28 |
| 40 | `replay-determinism` | リプレイと決定性 | **M** | ✅ **実装済** 2026-07-27 |
| 41 | `debug-overlays` | デバッグ可視化 | **E〜M** | ✅ **実装済** 2026-07-27 |
| 42 | `save-load` | セーブ・ロード | **M** | ✅ **実装済** |
| 43 | `unit-test-gameplay` | ゲームロジックのテスト | **M** | ✅ **実装済** 2026-07-28 |
| 44 | `profiling-loop` | プロファイリング循環 | **M** | ✅ **実装済** |
| 45 | `accessibility-basics` | アクセシビリティ基礎 | **E〜M** | ✅ **実装済** 2026-07-28 |
| 46 | `balance-sim` | ゲームバランス分析 | **H** | ✅ **実装済** 2026-07-28 |

---

### Wave F — サウンド·CG·通信（後段·難度高 or 方針依存）

| 群 | id 例 | 難度 | 備考 |
|----|--------|------|------|
| Audio | SFX〜レイヤー BGM | **M〜H** | ✅ カテゴリ一通り 2026-07-28 |
| Graphics | GPU〜UI·Mesh ✅ | **M〜H** | gfx-coordinates は coordinates と統合検討のみ残 |
| GPU | `gfx-gpu-concepts` | **E〜M** | ✅ **実装済** 2026-07-28（図解中心） |
| Networking | p2p〜DB·anti-cheat ✅ | **H** | ✅ カテゴリ一通り 2026-07-28 |

**通信·本格 BGM·Unity 本線は「静的サイトでどこまで見せるか」を各 SPEC の未決事項で固定してから着手。**

---

## 4. 直近スプリント提案（次にやる 8 本）

難易度が低く、既存資産と接続が強い順:

| 順 | id | 目安工数 | すぐ使える資産 | 状態 |
|----|-----|----------|----------------|------|
| 1 | **`weighted-random`** | 小 | mulberry32, explain UI | ✅ |
| 2 | **`velocity-motion`** | 小 | game-loop の dt 文化 | ✅ |
| 3 | **`event-system`** | 小 | fsm の explain レイアウト | ✅ |
| 4 | **`object-pool`** | 小 | canvas 弾幕ミニ | ✅ |
| 5 | **`coyote-time`** | 小〜中 | input-basics | ✅ |
| 6 | **`grid-pseudo-physics`** | 小 | グリッド | ✅ |
| 7 | **`constrained-gen`** | 中 | maze-gen + bfs 到達性 | ✅ |
| 8 | **`accel-gravity`** | 小〜中 | velocity の次 | ✅ |

**ready 95**: gfx-ui-canvas · gfx-mesh-uv · net-anti-cheat · net-db-transaction まで。  
Wave F 主要 id は概ね完了。次: gfx-coordinates 統合判断 / oneshot 改訂 / Release。

---

## 5. 各トピックの標準工程（変更なし）

1. ROADMAP 行を「準備中」に更新 + CATALOG 行（ready 未）  
2. `docs/topics/<id>/SPEC.md`  
3. `algorithms/` + `js/` + `maps/` + `samples/`  
4. `main.js` / `TOPIC_META` / ナビ / HANDOFF  
5. `python3 scripts/smoke-platform.py`  
6. 意味のあるまとまりで Release（試作タグ）

---

## 6. 非目標（この計画では増やさない）

- `path-compare` / `game-tree-engine` の本実装  
- E2E / i18n  
- ビルドツール必須化  
- 実サーバを要する通信教材の本番運用  

---

## 7. 見直しタイミング

- 各 Wave 終了時に本ファイルの順序を再評価  
- Fable5 レビューが入ったトピックは成熟度を `revised` に同期（[MATURITY.md](./topics/MATURITY.md)）  
- 正本 Docx の大きな改訂があったら ROADMAP と本計画を同時更新  
