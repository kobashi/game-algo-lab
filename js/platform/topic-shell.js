/**
 * トピックページ共通シェル（ヘッダー・ナビ・フッター）
 * ビルド不要。HTML の data 属性からマウントする。
 *
 * @example
 * <header class="site-header" id="site-header" data-nav="pathfinding" data-active="bfs"></header>
 * <footer class="site-footer" id="site-footer"></footer>
 * import { mountTopicShellFromDataset } from "./platform/index.js";
 * mountTopicShellFromDataset();
 */

import { mountPageMaturity } from "./maturity.js";

/**
 * @typedef {{ id: string, label: string, href: string }} NavLink
 */

/** @type {Record<string, NavLink[]>} */
export const NAV_GROUPS = {
  pathfinding: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "bfs", label: "BFS", href: "bfs.html" },
    { id: "dfs", label: "DFS", href: "dfs.html" },
    { id: "dijkstra", label: "ダイクストラ", href: "dijkstra.html" },
    { id: "best-first", label: "最良優先", href: "best-first.html" },
    { id: "astar", label: "A*", href: "astar.html" },
    { id: "bidirectional-search", label: "双方向", href: "bidirectional-search.html" },
  ],
  "game-tree": [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "and-or", label: "AND-OR", href: "and-or.html" },
    { id: "minimax", label: "Min-Max", href: "minimax.html" },
    { id: "alpha-beta", label: "α-β", href: "alpha-beta.html" },
    { id: "monte-carlo", label: "モンテカルロ", href: "monte-carlo.html" },
    { id: "bandit", label: "バンディット", href: "multi-armed-bandit.html" },
    { id: "tic-tac-toe", label: "三目並べ", href: "tic-tac-toe.html" },
    { id: "mcts", label: "MCTS", href: "mcts.html" },
    { id: "nim", label: "ニム", href: "nim.html" },
    { id: "chopsticks", label: "割り箸", href: "chopsticks.html" },
    { id: "othello-4x4", label: "4×4オセロ", href: "othello-4x4.html" },
  ],
  explain: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "collision", label: "AABB", href: "collision.html" },
    { id: "fsm", label: "FSM", href: "fsm.html" },
    { id: "event-system", label: "イベント", href: "event-system.html" },
    { id: "object-pool", label: "プール", href: "object-pool.html" },
    { id: "command-pattern", label: "コマンド", href: "command-pattern.html" },
    {
      id: "component-vs-inheritance",
      label: "継承/Comp",
      href: "component-vs-inheritance.html",
    },
    { id: "ecs-intro", label: "ECS", href: "ecs-intro.html" },
    { id: "save-load", label: "セーブ", href: "save-load.html" },
    { id: "replay-determinism", label: "リプレイ", href: "replay-determinism.html" },
    { id: "debug-overlays", label: "デバッグ", href: "debug-overlays.html" },
    { id: "profiling-loop", label: "計測", href: "profiling-loop.html" },
    { id: "unit-test-gameplay", label: "テスト", href: "unit-test-gameplay.html" },
    { id: "sfx-events", label: "SFX", href: "sfx-events.html" },
    { id: "sfx-voice-limit", label: "ボイス", href: "sfx-voice-limit.html" },
    { id: "sfx-randomize", label: "ランダムSE", href: "sfx-randomize.html" },
    { id: "sfx-spatial", label: "空間SE", href: "sfx-spatial.html" },
    { id: "sfx-material", label: "材質SE", href: "sfx-material.html" },
    { id: "audio-bus-ducking", label: "バス", href: "audio-bus-ducking.html" },
    { id: "bgm-loop", label: "BGM", href: "bgm-loop.html" },
    { id: "bgm-quantize", label: "量子化", href: "bgm-quantize.html" },
    { id: "bgm-transition-compare", label: "BGM切替", href: "bgm-transition-compare.html" },
    { id: "gfx-gpu-concepts", label: "GPU", href: "gfx-gpu-concepts.html" },
    { id: "gfx-sprite-2d", label: "スプライト", href: "gfx-sprite-2d.html" },
    { id: "gfx-camera", label: "カメラ", href: "gfx-camera.html" },
    { id: "gfx-animation-vfx", label: "VFX", href: "gfx-animation-vfx.html" },
    { id: "gfx-lighting-alpha", label: "光/α", href: "gfx-lighting-alpha.html" },
    { id: "net-p2p-demo", label: "P2P", href: "net-p2p-demo.html" },
    { id: "net-prediction", label: "予測", href: "net-prediction.html" },
    { id: "net-client-server", label: "C/S", href: "net-client-server.html" },
    { id: "balance-sim", label: "バランス", href: "balance-sim.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  physics: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "grid-pseudo-physics", label: "擬似物理", href: "grid-pseudo-physics.html" },
    { id: "velocity-motion", label: "速度", href: "velocity-motion.html" },
    { id: "accel-decel", label: "加減速", href: "accel-decel.html" },
    { id: "accel-gravity", label: "重力", href: "accel-gravity.html" },
    { id: "friction-bounce", label: "摩擦", href: "friction-bounce.html" },
    { id: "collision", label: "AABB", href: "collision.html" },
    { id: "circle-collision", label: "円", href: "circle-collision.html" },
    { id: "momentum-1d", label: "運動量", href: "momentum-1d.html" },
    { id: "raycast-shapes", label: "レイ", href: "raycast-shapes.html" },
    { id: "collision-response", label: "応答", href: "collision-response.html" },
    { id: "obb-sat", label: "OBB", href: "obb-sat.html" },
    { id: "swept-aabb", label: "Swept", href: "swept-aabb.html" },
    { id: "rotational-motion", label: "回転", href: "rotational-motion.html" },
    { id: "rotating-collision", label: "回転衝突", href: "rotating-collision.html" },
    { id: "concave-compound", label: "複合", href: "concave-compound.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  spatial: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "brute-force-pairs", label: "総当たり", href: "brute-force-pairs.html" },
    { id: "uniform-grid", label: "グリッド", href: "uniform-grid.html" },
    { id: "broad-narrow-phase", label: "Broad/Narrow", href: "broad-narrow-phase.html" },
    { id: "sweep-and-prune", label: "SaP", href: "sweep-and-prune.html" },
    { id: "quadtree", label: "四分木", href: "quadtree.html" },
    { id: "bvh-overview", label: "BVH", href: "bvh-overview.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  steering: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "steering-seek-flee", label: "Seek/Flee", href: "steering-seek-flee.html" },
    { id: "steering-wander-avoid", label: "Wander", href: "steering-wander-avoid.html" },
    { id: "boids", label: "Boids", href: "boids.html" },
    { id: "steering-leader", label: "Leader", href: "steering-leader.html" },
    { id: "behavior-tree", label: "BT", href: "behavior-tree.html" },
    { id: "obstacle-avoidance-nav", label: "ナビ回避", href: "obstacle-avoidance-nav.html" },
    { id: "fsm", label: "FSM", href: "fsm.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  fundamentals: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "game-loop", label: "ゲームループ", href: "game-loop.html" },
    { id: "time-management", label: "時間管理", href: "time-management.html" },
    { id: "input-basics", label: "入力", href: "input-basics.html" },
    { id: "coyote-time", label: "コヨーテ", href: "coyote-time.html" },
    { id: "input-buffer", label: "バッファ", href: "input-buffer.html" },
    { id: "input-abstraction", label: "抽象入力", href: "input-abstraction.html" },
    { id: "command-input", label: "コマンド", href: "command-input.html" },
    { id: "accessibility-basics", label: "a11y", href: "accessibility-basics.html" },
    { id: "coordinates", label: "座標", href: "coordinates.html" },
    { id: "rng-seed", label: "乱数", href: "rng-seed.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  procgen: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "maze-gen", label: "迷路生成", href: "maze-gen.html" },
    { id: "weighted-random", label: "重み付き", href: "weighted-random.html" },
    { id: "constrained-gen", label: "制約生成", href: "constrained-gen.html" },
    { id: "dungeon-gen", label: "ダンジョン", href: "dungeon-gen.html" },
    { id: "noise-terrain", label: "ノイズ", href: "noise-terrain.html" },
    { id: "balance-sim", label: "バランス", href: "balance-sim.html" },
    { id: "rng-seed", label: "乱数", href: "rng-seed.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
  default: [
    { id: "home", label: "ホーム", href: "../index.html" },
    { id: "topics", label: "一覧", href: "../index.html#topics" },
  ],
};

/**
 * フッターの「関連リンク」（active id ごと）
 * @type {Record<string, { href: string, label: string }[]>}
 */
export const FOOTER_RELATED = {
  bfs: [{ href: "dfs.html", label: "DFS と比較" }],
  dfs: [
    { href: "bfs.html", label: "BFS と比較" },
    { href: "dijkstra.html", label: "ダイクストラへ" },
  ],
  dijkstra: [
    { href: "best-first.html", label: "最良優先へ" },
    { href: "astar.html", label: "A* へ" },
  ],
  "best-first": [
    { href: "dijkstra.html", label: "ダイクストラへ" },
    { href: "astar.html", label: "A* へ" },
  ],
  astar: [
    { href: "dijkstra.html", label: "ダイクストラ" },
    { href: "best-first.html", label: "最良優先" },
    { href: "bidirectional-search.html", label: "次: 双方向探索" },
  ],
  "bidirectional-search": [
    { href: "bfs.html", label: "BFS（片方向）" },
    { href: "astar.html", label: "A*（前段）" },
  ],
  "and-or": [{ href: "minimax.html", label: "次: Min-Max" }],
  minimax: [
    { href: "and-or.html", label: "AND-OR（前段）" },
    { href: "alpha-beta.html", label: "次: α-β" },
  ],
  "alpha-beta": [
    { href: "minimax.html", label: "Min-Max（前段）" },
    { href: "monte-carlo.html", label: "次: モンテカルロ" },
  ],
  "monte-carlo": [
    { href: "minimax.html", label: "Min-Max" },
    { href: "alpha-beta.html", label: "α-β" },
    { href: "multi-armed-bandit.html", label: "次: バンディット" },
  ],
  bandit: [
    { href: "monte-carlo.html", label: "モンテカルロ（前段）" },
    { href: "tic-tac-toe.html", label: "次: 三目並べ" },
  ],
  "tic-tac-toe": [
    { href: "multi-armed-bandit.html", label: "バンディット（前段）" },
    { href: "mcts.html", label: "次: MCTS" },
  ],
  mcts: [
    { href: "tic-tac-toe.html", label: "三目並べ（題材・完全解）" },
    { href: "multi-armed-bandit.html", label: "バンディット（UCB）" },
    { href: "nim.html", label: "次: ニム" },
  ],
  nim: [
    { href: "mcts.html", label: "MCTS（前段）" },
    { href: "chopsticks.html", label: "次: 割り箸" },
  ],
  chopsticks: [
    { href: "nim.html", label: "ニム（前段）" },
    { href: "othello-4x4.html", label: "次: 4×4オセロ" },
  ],
  "othello-4x4": [
    { href: "chopsticks.html", label: "割り箸（前段）" },
  ],
  collision: [
    { href: "friction-bounce.html", label: "摩擦・反発（前段）" },
    { href: "circle-collision.html", label: "次: 円衝突" },
  ],
  "circle-collision": [
    { href: "collision.html", label: "AABB（前段）" },
    { href: "collision-response.html", label: "次: 衝突応答" },
  ],
  "momentum-1d": [
    { href: "friction-bounce.html", label: "摩擦・反発（前段）" },
    { href: "collision-response.html", label: "衝突応答" },
  ],
  "raycast-shapes": [
    { href: "circle-collision.html", label: "円衝突（前段）" },
    { href: "collision.html", label: "AABB" },
  ],
  "collision-response": [
    { href: "circle-collision.html", label: "円判定（前段）" },
    { href: "obb-sat.html", label: "次: OBB/SAT" },
  ],
  "obb-sat": [
    { href: "collision.html", label: "AABB（前段）" },
    { href: "swept-aabb.html", label: "次: Swept AABB" },
  ],
  "swept-aabb": [
    { href: "obb-sat.html", label: "OBB/SAT（前段）" },
    { href: "rotational-motion.html", label: "次: 回転運動" },
  ],
  "rotational-motion": [
    { href: "accel-gravity.html", label: "重力（前段）" },
    { href: "rotating-collision.html", label: "次: 回転衝突" },
  ],
  "rotating-collision": [
    { href: "rotational-motion.html", label: "回転運動（前段）" },
    { href: "obb-sat.html", label: "OBB/SAT" },
  ],
  "concave-compound": [
    { href: "collision.html", label: "AABB" },
    { href: "circle-collision.html", label: "円衝突" },
  ],
  "input-abstraction": [
    { href: "input-basics.html", label: "入力の基礎（前段）" },
    { href: "command-input.html", label: "次: コマンド入力" },
  ],
  "command-input": [
    { href: "input-abstraction.html", label: "入力抽象（前段）" },
    { href: "input-buffer.html", label: "入力バッファ" },
  ],
  "profiling-loop": [
    { href: "brute-force-pairs.html", label: "総当たり" },
    { href: "uniform-grid.html", label: "グリッド" },
  ],
  "sfx-events": [
    { href: "event-system.html", label: "イベント（前段）" },
    { href: "sfx-voice-limit.html", label: "次: 同時発音制限" },
  ],
  "sfx-voice-limit": [
    { href: "sfx-events.html", label: "SFX イベント（前段）" },
    { href: "sfx-randomize.html", label: "次: SE ランダム化" },
  ],
  "sfx-randomize": [
    { href: "sfx-voice-limit.html", label: "ボイス制限（前段）" },
    { href: "sfx-spatial.html", label: "次: 距離・パン" },
  ],
  "sfx-spatial": [
    { href: "sfx-randomize.html", label: "SE ランダム（前段）" },
    { href: "audio-bus-ducking.html", label: "次: バス/ダック" },
  ],
  "audio-bus-ducking": [
    { href: "sfx-spatial.html", label: "空間 SE（前段）" },
    { href: "bgm-loop.html", label: "次: BGM ループ" },
  ],
  "bgm-loop": [
    { href: "audio-bus-ducking.html", label: "バス（前段）" },
    { href: "bgm-quantize.html", label: "次: 量子化" },
  ],
  "bgm-quantize": [
    { href: "bgm-loop.html", label: "BGM ループ（前段）" },
    { href: "bgm-transition-compare.html", label: "次: 切替比較" },
  ],
  "bgm-transition-compare": [
    { href: "bgm-quantize.html", label: "量子化（前段）" },
    { href: "audio-bus-ducking.html", label: "バス" },
  ],
  "sfx-material": [
    { href: "sfx-events.html", label: "SFX イベント（前段）" },
    { href: "sfx-randomize.html", label: "ランダム化" },
  ],
  "balance-sim": [
    { href: "weighted-random.html", label: "重み付き抽選" },
    { href: "rng-seed.html", label: "乱数とシード" },
  ],
  "gfx-gpu-concepts": [
    { href: "coordinates.html", label: "座標変換（関連）" },
    { href: "gfx-sprite-2d.html", label: "次: 2D スプライト" },
  ],
  "gfx-sprite-2d": [
    { href: "gfx-gpu-concepts.html", label: "GPU 概念（前段）" },
    { href: "gfx-camera.html", label: "次: カメラ" },
  ],
  "gfx-camera": [
    { href: "gfx-sprite-2d.html", label: "スプライト（前段）" },
    { href: "gfx-animation-vfx.html", label: "次: VFX" },
  ],
  "gfx-animation-vfx": [
    { href: "gfx-sprite-2d.html", label: "スプライト（前段）" },
    { href: "object-pool.html", label: "プール" },
  ],
  "gfx-lighting-alpha": [
    { href: "gfx-gpu-concepts.html", label: "GPU（前段）" },
    { href: "gfx-sprite-2d.html", label: "スプライト" },
  ],
  "net-p2p-demo": [
    { href: "time-management.html", label: "時間管理（関連）" },
    { href: "net-prediction.html", label: "次: 予測・補正" },
  ],
  "net-prediction": [
    { href: "net-p2p-demo.html", label: "P2P（前段）" },
    { href: "net-client-server.html", label: "次: C/S 権威" },
  ],
  "net-client-server": [
    { href: "net-prediction.html", label: "予測（前段）" },
    { href: "net-p2p-demo.html", label: "P2P" },
  ],
  "accessibility-basics": [
    { href: "input-abstraction.html", label: "入力抽象（前段）" },
  ],
  "unit-test-gameplay": [
    { href: "collision.html", label: "AABB" },
    { href: "profiling-loop.html", label: "プロファイリング" },
  ],
  "obstacle-avoidance-nav": [
    { href: "steering-seek-flee.html", label: "Seek（前段）" },
    { href: "bfs.html", label: "BFS" },
  ],
  "save-load": [
    { href: "ecs-intro.html", label: "ECS（状態の切り出し）" },
    { href: "replay-determinism.html", label: "次: リプレイ" },
  ],
  "replay-determinism": [
    { href: "save-load.html", label: "セーブ（前段）" },
    { href: "rng-seed.html", label: "乱数とシード" },
  ],
  "debug-overlays": [
    { href: "collision.html", label: "AABB" },
    { href: "behavior-tree.html", label: "BT（AI 状態）" },
  ],
  "brute-force-pairs": [
    { href: "circle-collision.html", label: "円判定（前段）" },
    { href: "uniform-grid.html", label: "次: 一様グリッド" },
  ],
  "uniform-grid": [
    { href: "brute-force-pairs.html", label: "総当たり（前段）" },
    { href: "broad-narrow-phase.html", label: "次: Broad/Narrow" },
  ],
  "broad-narrow-phase": [
    { href: "uniform-grid.html", label: "一様グリッド（前段）" },
    { href: "sweep-and-prune.html", label: "次: Sweep and Prune" },
  ],
  "sweep-and-prune": [
    { href: "broad-narrow-phase.html", label: "Broad/Narrow（前段）" },
    { href: "quadtree.html", label: "次: 四分木" },
  ],
  quadtree: [
    { href: "uniform-grid.html", label: "一様グリッド（対比）" },
    { href: "bvh-overview.html", label: "次: BVH" },
  ],
  "steering-seek-flee": [
    { href: "accel-decel.html", label: "加減速（前段）" },
    { href: "steering-wander-avoid.html", label: "次: Wander/Avoid" },
  ],
  "steering-wander-avoid": [
    { href: "steering-seek-flee.html", label: "Seek（前段）" },
    { href: "boids.html", label: "次: Boids" },
  ],
  boids: [
    { href: "steering-wander-avoid.html", label: "Wander（前段）" },
    { href: "steering-leader.html", label: "次: Leader Following" },
  ],
  "steering-leader": [
    { href: "boids.html", label: "Boids（前段）" },
    { href: "behavior-tree.html", label: "次: ビヘイビアツリー" },
  ],
  "behavior-tree": [
    { href: "steering-leader.html", label: "Leader（前段）" },
    { href: "fsm.html", label: "FSM（対比）" },
  ],
  "bvh-overview": [
    { href: "quadtree.html", label: "四分木（対比）" },
    { href: "broad-narrow-phase.html", label: "Broad/Narrow" },
  ],
  "ecs-intro": [
    { href: "component-vs-inheritance.html", label: "継承/Comp（前段）" },
    { href: "fsm.html", label: "FSM" },
  ],
  fsm: [
    { href: "event-system.html", label: "次: イベントシステム" },
    { href: "collision.html", label: "AABB" },
  ],
  "event-system": [
    { href: "fsm.html", label: "FSM（前段）" },
    { href: "object-pool.html", label: "次: オブジェクトプール" },
  ],
  "object-pool": [
    { href: "event-system.html", label: "イベント（前段）" },
    { href: "command-pattern.html", label: "次: コマンドパターン" },
  ],
  "command-pattern": [
    { href: "object-pool.html", label: "プール（前段）" },
    { href: "component-vs-inheritance.html", label: "次: 継承 vs Comp" },
  ],
  "component-vs-inheritance": [
    { href: "command-pattern.html", label: "コマンド（前段）" },
    { href: "ecs-intro.html", label: "次: ECS 入門" },
  ],
  "grid-pseudo-physics": [
    { href: "velocity-motion.html", label: "次: 速度による移動" },
  ],
  "velocity-motion": [
    { href: "grid-pseudo-physics.html", label: "グリッド擬似物理（前段）" },
    { href: "accel-decel.html", label: "次: 加減速" },
  ],
  "accel-decel": [
    { href: "velocity-motion.html", label: "速度（前段）" },
    { href: "accel-gravity.html", label: "次: 加速度と重力" },
  ],
  "accel-gravity": [
    { href: "accel-decel.html", label: "加減速（前段）" },
    { href: "friction-bounce.html", label: "次: 摩擦・反発" },
  ],
  "friction-bounce": [
    { href: "accel-gravity.html", label: "重力（前段）" },
    { href: "collision.html", label: "次: AABB 衝突" },
  ],
  "game-loop": [
    { href: "time-management.html", label: "次: 時間管理" },
  ],
  "time-management": [
    { href: "game-loop.html", label: "ゲームループ（前段）" },
    { href: "input-basics.html", label: "次: 入力の基礎" },
  ],
  "input-basics": [
    { href: "time-management.html", label: "時間管理（前段）" },
    { href: "coyote-time.html", label: "次: コヨーテタイム" },
  ],
  "coyote-time": [
    { href: "input-basics.html", label: "入力の基礎（前段）" },
    { href: "input-buffer.html", label: "次: 入力バッファ" },
  ],
  "input-buffer": [
    { href: "coyote-time.html", label: "コヨーテ（対比）" },
    { href: "input-basics.html", label: "入力の基礎" },
  ],
  coordinates: [
    { href: "input-basics.html", label: "入力の基礎（前段）" },
    { href: "rng-seed.html", label: "次: 乱数とシード" },
  ],
  "rng-seed": [
    { href: "coordinates.html", label: "座標変換（前段）" },
    { href: "maze-gen.html", label: "次: 迷路生成" },
  ],
  "maze-gen": [
    { href: "rng-seed.html", label: "乱数とシード（前段）" },
    { href: "weighted-random.html", label: "次: 重み付き抽選" },
  ],
  "weighted-random": [
    { href: "maze-gen.html", label: "迷路生成（前段）" },
    { href: "constrained-gen.html", label: "次: 制約付き生成" },
  ],
  "constrained-gen": [
    { href: "weighted-random.html", label: "重み付き抽選（前段）" },
    { href: "dungeon-gen.html", label: "次: ダンジョン生成" },
  ],
  "dungeon-gen": [
    { href: "constrained-gen.html", label: "制約付き生成（前段）" },
    { href: "noise-terrain.html", label: "次: ノイズと地形" },
  ],
  "noise-terrain": [
    { href: "dungeon-gen.html", label: "ダンジョン（前段）" },
    { href: "rng-seed.html", label: "乱数とシード" },
  ],
};

/** ナビ group ごとのフッター注記（data-note 未指定時） */
export const FOOTER_NOTES = {
  pathfinding: "経路探索シリーズ",
  "game-tree": "ゲーム木シリーズ",
  explain: "説明特化 UI · 経路探索マップは使いません",
  physics: "物理・判定 · 速度・衝突",
  spatial: "空間探索 · 総当たりから分割へ",
  steering: "ゲーム AI · ステアリング",
  fundamentals: "基礎実行モデル · ループ・時間・入力・座標・乱数",
  procgen: "プロシージャル · 生成と確率",
  default: "",
};

/**
 * @param {object} opts
 * @param {HTMLElement | null} opts.root
 * @param {string} [opts.nav]
 * @param {string} [opts.active]
 * @param {string} [opts.homeHref]
 */
export function mountSiteHeader(opts) {
  const {
    root,
    nav = "default",
    active = "",
    homeHref = "../index.html",
  } = opts;
  if (!root) return;

  const links = NAV_GROUPS[nav] ?? NAV_GROUPS.default;
  const navHtml = links
    .map((link) => {
      const isActive = link.id === active;
      return `<a href="${link.href}" class="nav-link${isActive ? " is-active" : ""}">${link.label}</a>`;
    })
    .join("\n        ");

  root.innerHTML = `
    <div class="container container-wide header-inner">
      <a href="${homeHref}" class="logo">
        <span class="logo-mark">◆</span>
        Game Algo Lab
      </a>
      <nav class="nav" aria-label="メイン">
        ${navHtml}
      </nav>
    </div>
  `;
}

/**
 * @param {object} opts
 * @param {HTMLElement | null} opts.root
 * @param {string} [opts.active]
 * @param {string} [opts.nav]
 * @param {string} [opts.note]  明示注記（優先）
 * @param {string} [opts.topicsHref]
 */
export function mountSiteFooter(opts) {
  const {
    root,
    active = "",
    nav = "default",
    note = "",
    topicsHref = "../index.html",
  } = opts;
  if (!root) return;

  const related = FOOTER_RELATED[active] ?? [];
  const parts = [
    `<a href="${topicsHref}">← トピック一覧</a>`,
    ...related.map((r) => `<a href="${r.href}">${r.label}</a>`),
  ];

  const noteText =
    note ||
    root.dataset.note ||
    FOOTER_NOTES[nav] ||
    "";

  root.innerHTML = `
    <div class="container container-wide">
      <p class="site-footer-links">
        ${parts.join("\n        ·\n        ")}
      </p>
      ${
        noteText
          ? `<p class="footer-muted">${noteText}</p>`
          : ""
      }
    </div>
  `;
}

/** `#site-header` の data-nav / data-active からヘッダーのみ */
export function mountSiteHeaderFromDataset() {
  const root = document.getElementById("site-header");
  if (!root) return;
  mountSiteHeader({
    root,
    nav: root.dataset.nav || "default",
    active: root.dataset.active || "",
  });
}

/** ヘッダー + フッターをまとめてマウント（推奨） */
export function mountTopicShellFromDataset() {
  const header = document.getElementById("site-header");
  const nav = header?.dataset.nav || "default";
  const active = header?.dataset.active || "";

  mountSiteHeaderFromDataset();

  const footer = document.getElementById("site-footer");
  if (footer) {
    mountSiteFooter({
      root: footer,
      active,
      nav,
      note: footer.dataset.note || "",
    });
  }

  // デモ本文の .page-header に成熟度バッジを表示
  mountPageMaturity(active);
}
