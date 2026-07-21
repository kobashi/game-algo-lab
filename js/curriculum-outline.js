/**
 * 学習項目の見出し一覧（デモなし）
 * 正本: docs/ROADMAP.md §2.3–2.4
 * 実装済みデモは TOPICS（main.js）側。ここは企画中の見出し掲載用。
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   phase?: string,
 *   blurb?: string,
 *   items: { id: string, title: string }[],
 * }} CurriculumCategory
 */

/** 表示順（ROADMAP の期・カテゴリに沿う） */
/** @type {CurriculumCategory[]} */
export const CURRICULUM_OUTLINE = [
  {
    id: "pathfinding",
    title: "経路探索",
    phase: "第1期",
    blurb: "デモあり（BFS〜A*）。以下は追加予定の学習項目。",
    items: [
      { id: "bidirectional-search", title: "双方向探索" },
      { id: "path-compare", title: "経路アルゴリズム同時比較" },
    ],
  },
  {
    id: "game-tree",
    title: "ゲーム木",
    phase: "第2期",
    blurb: "デモあり（AND-OR〜MCTS・実在ゲーム4本等）。以下は追加予定。",
    items: [
      { id: "game-tree-engine", title: "共通探索エンジン" },
    ],
  },
  {
    id: "physics",
    title: "物理・判定",
    phase: "第3期",
    blurb: "デモあり（AABB）。以下は段階シリーズの予定。",
    items: [
      { id: "grid-pseudo-physics", title: "グリッド擬似物理" },
      { id: "velocity-motion", title: "速度による移動" },
      { id: "accel-decel", title: "加減速" },
      { id: "accel-gravity", title: "加速度と重力" },
      { id: "friction-bounce", title: "摩擦・反発" },
      { id: "momentum-1d", title: "質量と運動量（1 次元）" },
      { id: "rotational-motion", title: "回転運動" },
      { id: "circle-collision", title: "円同士・円と AABB" },
      { id: "raycast-shapes", title: "線分・レイキャストと図形の交差" },
      { id: "obb-sat", title: "OBB / 分離軸定理 (SAT)" },
      { id: "swept-aabb", title: "連続衝突 (Swept AABB)" },
      { id: "rotating-collision", title: "回転中の物体との衝突" },
      { id: "concave-compound", title: "凹形状の凸分割・複合コライダー" },
      { id: "collision-response", title: "衝突応答" },
    ],
  },
  {
    id: "patterns",
    title: "設計パターン",
    phase: "第2〜3期",
    blurb: "デモあり（ステートマシン）。以下は追加予定。",
    items: [
      { id: "event-system", title: "イベントシステム" },
      { id: "command-pattern", title: "コマンドパターン" },
      { id: "component-vs-inheritance", title: "継承 vs コンポーネント" },
      { id: "object-pool", title: "オブジェクトプール" },
      { id: "ecs-intro", title: "ECS 入門" },
    ],
  },
  {
    id: "fundamentals",
    title: "基礎実行モデル",
    phase: "第1〜3期",
    blurb: "カテゴリごと企画中。デモはまだありません。",
    items: [
      { id: "game-loop", title: "ゲームループ" },
      { id: "time-management", title: "時間管理" },
      { id: "input-basics", title: "入力の基礎" },
      { id: "coordinates", title: "座標変換" },
      { id: "rng-seed", title: "乱数とシード" },
    ],
  },
  {
    id: "ai-steering",
    title: "ゲーム AI・自律移動",
    phase: "第4期",
    blurb: "カテゴリごと企画中（FSM は設計パターンにデモあり）。",
    items: [
      { id: "steering-seek-flee", title: "Seek / Flee / Arrive" },
      { id: "steering-wander-avoid", title: "Wander / Obstacle Avoidance" },
      { id: "steering-leader", title: "Leader Following" },
      { id: "boids", title: "Boids / Flocking" },
      { id: "behavior-tree", title: "ビヘイビアツリー" },
      { id: "obstacle-avoidance-nav", title: "障害物回避（ナビ連携）" },
    ],
  },
  {
    id: "spatial",
    title: "空間探索・最適化",
    phase: "第3〜4期",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "brute-force-pairs", title: "総当たり O(n²)" },
      { id: "broad-narrow-phase", title: "Broad / Narrow Phase" },
      { id: "uniform-grid", title: "一様グリッド" },
      { id: "quadtree", title: "四分木" },
      { id: "sweep-and-prune", title: "Sweep and Prune" },
      { id: "bvh-overview", title: "BVH（概説）" },
    ],
  },
  {
    id: "hci",
    title: "入力・操作感・HCI",
    phase: "第3期",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "input-buffer", title: "入力バッファ" },
      { id: "coyote-time", title: "コヨーテタイム" },
      { id: "input-abstraction", title: "入力抽象化" },
      { id: "command-input", title: "コマンド入力" },
      { id: "accessibility-basics", title: "アクセシビリティ基礎" },
    ],
  },
  {
    id: "networking",
    title: "通信・データ",
    phase: "第5期",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "net-p2p-demo", title: "P2P 通信の観察" },
      { id: "net-client-server", title: "クライアント・サーバ" },
      { id: "net-sync-modes", title: "状態同期 vs 入力同期" },
      { id: "net-prediction", title: "補間・予測・補正" },
      { id: "net-anti-cheat", title: "サーバ権威とチート対策" },
      { id: "net-db-transaction", title: "DB とトランザクション" },
    ],
  },
  {
    id: "audio",
    title: "ゲームサウンド",
    phase: "第5期",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "sfx-events", title: "イベントと効果音" },
      { id: "sfx-voice-limit", title: "同時発音・重複制御" },
      { id: "sfx-randomize", title: "ランダム化（音量・ピッチ・シャッフルバッグ）" },
      { id: "sfx-material", title: "材質別・衝突強度と音" },
      { id: "sfx-spatial", title: "距離・パン・優先順位" },
      { id: "audio-bus-ducking", title: "サウンドバスとダッキング" },
      { id: "bgm-loop", title: "BGM ループ / イントロ＋ループ" },
      { id: "bgm-transition-compare", title: "切替方式の比較（クロスフェード等）" },
      { id: "bgm-quantize", title: "量子化（拍・小節への丸め込み）" },
      { id: "bgm-interactive", title: "拍同期・レイヤー型 BGM" },
    ],
  },
  {
    id: "graphics",
    title: "ゲーム CG",
    phase: "第4期",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "gfx-coordinates", title: "座標系と変換" },
      { id: "gfx-camera", title: "カメラと投影" },
      { id: "gfx-sprite-2d", title: "2D スプライト" },
      { id: "gfx-mesh-uv", title: "メッシュ・UV・マテリアル" },
      { id: "gfx-lighting-alpha", title: "ライティング・透明度" },
      { id: "gfx-animation-vfx", title: "アニメーション・パーティクル" },
      { id: "gfx-postprocess", title: "ポストプロセス" },
      { id: "gfx-lod-culling", title: "LOD・カリング" },
      { id: "gfx-ui-canvas", title: "UI 描画" },
      { id: "gfx-gpu-concepts", title: "GPU パイプライン概説" },
    ],
  },
  {
    id: "quality",
    title: "設計・品質",
    phase: "横断",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "save-load", title: "セーブ・ロード" },
      { id: "replay-determinism", title: "リプレイと決定性" },
      { id: "debug-overlays", title: "デバッグ可視化" },
      { id: "profiling-loop", title: "プロファイリング循環" },
      { id: "unit-test-gameplay", title: "ゲームロジックのテスト" },
    ],
  },
  {
    id: "procgen",
    title: "プロシージャル・確率・バランス",
    phase: "第2〜4期",
    blurb: "カテゴリごと企画中。",
    items: [
      { id: "maze-gen", title: "迷路生成" },
      { id: "dungeon-gen", title: "ダンジョン生成" },
      { id: "noise-terrain", title: "ノイズと地形" },
      { id: "constrained-gen", title: "制約付き生成" },
      { id: "weighted-random", title: "重み付き抽選・分布" },
      { id: "balance-sim", title: "ゲームバランス分析" },
    ],
  },
];
