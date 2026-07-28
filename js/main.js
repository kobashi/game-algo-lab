/**
 * トップページ: 学習トピック一覧をカテゴリ別に描画
 * 新しいアルゴリズムを追加するときは TOPICS に1件足すだけでOK
 * @see docs/PLATFORM.md
 * @see docs/topics/CATALOG.md
 * @see docs/topics/MATURITY.md
 */

import {
  MATURITY_ORDER,
  MATURITY_HINT,
  TOPIC_META,
  resolveTopicMeta,
  countByMaturity,
  createMaturityBadge,
} from "./platform/maturity.js";
import { CURRICULUM_OUTLINE } from "./curriculum-outline.js";

/**
 * @typedef {'oneshot' | 'revised' | 'stable'} Maturity
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   href: string,
 *   badge: string,
 *   category: string,
 *   ready: boolean,
 *   maturity: Maturity,
 * }} Topic
 */

/** 表示順（未掲載カテゴリは末尾） */
const CATEGORY_ORDER = [
  "経路探索",
  "ゲーム木",
  "基礎実行モデル",
  "プロシージャル",
  "物理・判定",
  "空間探索・最適化",
  "ゲーム AI・ステアリング",
  "設計パターン",
  "設計・品質",
  "入力・操作感",
  "サウンド",
  "ゲーム CG",
  "通信・データ",
];

/** @type {Topic[]} */
const TOPICS = [
  {
    id: "bfs",
    title: "幅優先探索 (BFS)",
    description: "最短歩数探索を可視化。Queue で広げる。",
    href: "algorithms/bfs.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "dfs",
    title: "深さ優先探索 (DFS)",
    description: "再帰で深く潜りバックトラック。コールスタックを可視化。",
    href: "algorithms/dfs.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "dijkstra",
    title: "ダイクストラ法",
    description: "優先度 = g（経路コスト）。A* のコスト側の前振り。",
    href: "algorithms/dijkstra.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "best-first",
    title: "最良優先探索",
    description: "優先度 = h（見積り）のみ。A* のヒューリスティック側の前振り。",
    href: "algorithms/best-first.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "astar",
    title: "A* 探索",
    description: "f = g + h。ダイクストラと最良優先を統合した探索。",
    href: "algorithms/astar.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "revised",
  },
  {
    id: "bidirectional-search",
    title: "双方向探索",
    description:
      "S と G の両側から BFS。出会点で経路接合。一方向より展開が減ることがある。",
    href: "algorithms/bidirectional-search.html",
    badge: "経路探索",
    category: "経路探索",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "game-loop",
    title: "ゲームループ",
    description:
      "可変/固定 timestep。人工遅延で重いフレームと MAX_STEPS 打ち切りを観察。",
    href: "algorithms/game-loop.html",
    badge: "基礎実行",
    category: "基礎実行モデル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "time-management",
    title: "時間管理",
    description:
      "壁時計とゲーム内時間。time scale・ポーズ・スロー/早送りを scaledDt で統一。",
    href: "algorithms/time-management.html",
    badge: "基礎実行",
    category: "基礎実行モデル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "input-basics",
    title: "入力の基礎",
    description:
      "held / down / up エッジと長押し。ジャンプは edge、連射は held の対比。",
    href: "algorithms/input-basics.html",
    badge: "基礎実行",
    category: "基礎実行モデル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "coordinates",
    title: "座標変換",
    description:
      "ローカル / ワールド / スクリーン。親子の回転合成とカメラ。",
    href: "algorithms/coordinates.html",
    badge: "基礎実行",
    category: "基礎実行モデル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "rng-seed",
    title: "乱数とシード",
    description:
      "Mulberry32 / XorShift32 / LCG。XorShift はシフト組、LCG は a,c,m と周期。",
    href: "algorithms/rng-seed.html",
    badge: "基礎実行",
    category: "基礎実行モデル",
    ready: true,
    maturity: "revised",
  },
  {
    id: "maze-gen",
    title: "迷路生成",
    description:
      "Recursive Backtracker と Prim 風。シード付きで生成過程を可視化。",
    href: "algorithms/maze-gen.html",
    badge: "プロシージャル",
    category: "プロシージャル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "weighted-random",
    title: "重み付き抽選・分布",
    description:
      "累積重みで偏った抽選。回数を増やすと理論確率に近づく。Fisher–Yates と対比。",
    href: "algorithms/weighted-random.html",
    badge: "プロシージャル",
    category: "プロシージャル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "constrained-gen",
    title: "制約付き生成",
    description:
      "ランダム壁配置のあと BFS で S→G 到達性を検査。棄却して再生成するループ。",
    href: "algorithms/constrained-gen.html",
    badge: "プロシージャル",
    category: "プロシージャル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "dungeon-gen",
    title: "ダンジョン生成",
    description:
      "矩形部屋を配置し L 字通路で接続。シード再現と 1 ステップ可視化。",
    href: "algorithms/dungeon-gen.html",
    badge: "プロシージャル",
    category: "プロシージャル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "noise-terrain",
    title: "ノイズと地形",
    description:
      "Value Noise + オクターブ（fBm 風）。高さマップを海陸に色分け。",
    href: "algorithms/noise-terrain.html",
    badge: "プロシージャル",
    category: "プロシージャル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "and-or",
    title: "AND-OR 探索",
    description:
      "ゲーム木の入口。OR（どれか1つ）と AND（すべて）で終局まで読み切る。",
    href: "algorithms/and-or.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "minimax",
    title: "Min-Max 探索",
    description:
      "MAX/MIN と局面評価値。相手も最善を取る前提で木を読む。",
    href: "algorithms/minimax.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "alpha-beta",
    title: "α-β 法",
    description:
      "Min-Max に α・β 窓を付け、答えに効かない枝を刈る。",
    href: "algorithms/alpha-beta.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "monte-carlo",
    title: "モンテカルロ法",
    description:
      "ランダムプレイアウトの平均で評価。全部読む Min-Max との違いを学ぶ。",
    href: "algorithms/monte-carlo.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "multi-armed-bandit",
    title: "多腕バンディット",
    description:
      "探索と活用。ε-greedy / UCB1。MCTS の腕選択の基礎。",
    href: "algorithms/multi-armed-bandit.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "tic-tac-toe",
    title: "三目並べ（全解析・対称性除去）",
    description:
      "全探索で引き分けを証明。α-β・メモ化・対称性除去(765局面)をON/OFF比較し、MCの誤判定も見る。",
    href: "algorithms/tic-tac-toe.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "mcts",
    title: "モンテカルロ木探索 (MCTS)",
    description:
      "三目並べ上で選択・展開・シミュレーション・逆伝播。UCB1 と完全解・素の MC を同一局面で比較。",
    href: "algorithms/mcts.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "nim",
    title: "ニム（完全読み切り→理論解）",
    description:
      "1山の逆向き着色で周期性(n mod k+1)を発見、複数山の全局面探索でnim-sum(XOR)判定と一致確認。",
    href: "algorithms/nim.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "chopsticks",
    title: "割り箸（循環グラフ・後退解析）",
    description:
      "同一局面に戻る循環グラフを後退解析で3値（勝ち/負け/引き分け）に確定。バリアント・深さ制限Min-Maxと比較。",
    href: "algorithms/chopsticks.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "revised",
  },
  {
    id: "othello-4x4",
    title: "4×4 オセロ（符号化・転置表・対称正規化）",
    description:
      "実在ルール＋パス・終局を持つゲーム木最終段。生の生成局面数/転置表後/対称除去後の3段比較をチャンク実行で可視化。",
    href: "algorithms/othello-4x4.html",
    badge: "ゲーム木",
    category: "ゲーム木",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "grid-pseudo-physics",
    title: "グリッド擬似物理",
    description:
      "マス単位の落下・接地。連続速度を持たない擬似重力の入口。",
    href: "algorithms/grid-pseudo-physics.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "velocity-motion",
    title: "速度による移動",
    description:
      "p ← p + v·dt。壁バウンスと速度ベクトル表示。物理シリーズの入口。",
    href: "algorithms/velocity-motion.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "accel-decel",
    title: "加減速",
    description:
      "入力で加速、最高速度クランプ、離すとブレーキ。慣性のある移動。",
    href: "algorithms/accel-decel.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "accel-gravity",
    title: "加速度と重力",
    description:
      "v ← v + g·dt のあと p ← p + v·dt。放物線軌跡と床バウンス。",
    href: "algorithms/accel-gravity.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "friction-bounce",
    title: "摩擦・反発",
    description:
      "床バウンスで vy を反発係数で縮め、接地中は摩擦で vx を減衰。",
    href: "algorithms/friction-bounce.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "collision",
    title: "AABB 衝突判定",
    description:
      "重なり判定と分離判定の2通りを実装比較。軸投影と複雑度表付き。",
    href: "algorithms/collision.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "revised",
  },
  {
    id: "circle-collision",
    title: "円同士・円と AABB",
    description:
      "中心距離と Clamp 最近点。円–円 / 円–箱のライブ判定。",
    href: "algorithms/circle-collision.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "momentum-1d",
    title: "質量と運動量（1D）",
    description:
      "弾性 / 完全非弾性。Σp と KE の前後比較。質量比で跳ね返りが変わる。",
    href: "algorithms/momentum-1d.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "raycast-shapes",
    title: "線分・レイキャスト",
    description:
      "円と AABB へのレイ。最近 t と法線。スラブ法と二次方程式。",
    href: "algorithms/raycast-shapes.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "collision-response",
    title: "衝突応答",
    description:
      "めり込み分離 + 法線インパルス。判定だけでなく跳ね返りまで。",
    href: "algorithms/collision-response.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "obb-sat",
    title: "OBB / SAT",
    description:
      "回転矩形と分離軸定理。軸投影がすべて重なれば衝突。",
    href: "algorithms/obb-sat.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "swept-aabb",
    title: "Swept AABB / TOI",
    description:
      "移動区間の最初の衝突時刻。離散判定のトンネリングと比較。",
    href: "algorithms/swept-aabb.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "rotational-motion",
    title: "回転運動",
    description:
      "トルク τ=r×F と角速度。作用点オフセットで並進と回転が変わる。",
    href: "algorithms/rotational-motion.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "rotating-collision",
    title: "回転中の衝突",
    description:
      "回転 OBB を SAT で毎フレーム判定。押し戻しと角速度減衰。",
    href: "algorithms/rotating-collision.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "concave-compound",
    title: "凹形状の凸分割",
    description:
      "L 字を複数 AABB で近似。外接 AABB の誤ヒットを比較。",
    href: "algorithms/concave-compound.html",
    badge: "物理・判定",
    category: "物理・判定",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "brute-force-pairs",
    title: "総当たり O(n²)",
    description:
      "全ペア距離判定。検査回数 n(n−1)/2。空間分割のベースライン。",
    href: "algorithms/brute-force-pairs.html",
    badge: "空間分割",
    category: "空間探索・最適化",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "uniform-grid",
    title: "一様グリッド",
    description:
      "セルに分け近傍だけ検査。総当たりとの検査数を同じ n で比較。",
    href: "algorithms/uniform-grid.html",
    badge: "空間分割",
    category: "空間探索・最適化",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "broad-narrow-phase",
    title: "Broad / Narrow Phase",
    description:
      "Broad=粗い候補、Narrow=精密判定。黄線と赤線で件数差を可視化。",
    href: "algorithms/broad-narrow-phase.html",
    badge: "空間分割",
    category: "空間探索・最適化",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "sweep-and-prune",
    title: "Sweep and Prune",
    description:
      "1 軸の区間をソートして候補を絞る。X 投影と AABB ヒットを比較。",
    href: "algorithms/sweep-and-prune.html",
    badge: "空間分割",
    category: "空間探索・最適化",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "quadtree",
    title: "四分木",
    description:
      "容量超過で4分割。クエリ矩形と交差する点をハイライト。",
    href: "algorithms/quadtree.html",
    badge: "空間分割",
    category: "空間探索・最適化",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "steering-seek-flee",
    title: "Seek / Flee / Arrive",
    description:
      "希望速度への舵力。Seek・Flee・Arrive をベクトル表示で比較。",
    href: "algorithms/steering-seek-flee.html",
    badge: "ステアリング",
    category: "ゲーム AI・ステアリング",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "steering-wander-avoid",
    title: "Wander / Avoidance",
    description:
      "前方円の揺らぎ点 Seek と障害回避。うろつきつつ衝突を避ける。",
    href: "algorithms/steering-wander-avoid.html",
    badge: "ステアリング",
    category: "ゲーム AI・ステアリング",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "boids",
    title: "Boids / Flocking",
    description:
      "分離・整列・結合。力の ON/OFF と重みで群れの質感を変える。",
    href: "algorithms/boids.html",
    badge: "ステアリング",
    category: "ゲーム AI・ステアリング",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "behavior-tree",
    title: "ビヘイビアツリー",
    description:
      "Selector/Sequence。視界内 Chase、否则 Patrol。Tick 結果を木に着色。",
    href: "algorithms/behavior-tree.html",
    badge: "ステアリング",
    category: "ゲーム AI・ステアリング",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "obstacle-avoidance-nav",
    title: "障害物回避（ナビ連携）",
    description:
      "BFS 経路のウェイポイントへ Seek + 局所壁回避。",
    href: "algorithms/obstacle-avoidance-nav.html",
    badge: "ステアリング",
    category: "ゲーム AI・ステアリング",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "steering-leader",
    title: "Leader Following",
    description:
      "リーダー後方スロットへ Arrive。列になって追従する。",
    href: "algorithms/steering-leader.html",
    badge: "ステアリング",
    category: "ゲーム AI・ステアリング",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "bvh-overview",
    title: "BVH 概説",
    description:
      "物体 AABB の階層木。クエリで枝を剪定しヒット葉を数える。",
    href: "algorithms/bvh-overview.html",
    badge: "空間分割",
    category: "空間探索・最適化",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "ecs-intro",
    title: "ECS 入門",
    description:
      "Entity / Component / System。表と System ログでデータ駆動を観察。",
    href: "algorithms/ecs-intro.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "save-load",
    title: "セーブ・ロード",
    description:
      "JSON + version とマイグレーション。localStorage で永続化。",
    href: "algorithms/save-load.html",
    badge: "品質",
    category: "設計・品質",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "replay-determinism",
    title: "リプレイと決定性",
    description:
      "入力記録とシード固定で軌跡を再現。記録→再生。",
    href: "algorithms/replay-determinism.html",
    badge: "品質",
    category: "設計・品質",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "debug-overlays",
    title: "デバッグ可視化",
    description:
      "コライダー・速度・AI 状態を本番描画に重ねる。レイヤ ON/OFF。",
    href: "algorithms/debug-overlays.html",
    badge: "品質",
    category: "設計・品質",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "profiling-loop",
    title: "プロファイリング循環",
    description:
      "測定→改善→再測定。総当たり vs グリッドのフレーム内訳。",
    href: "algorithms/profiling-loop.html",
    badge: "品質",
    category: "設計・品質",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "unit-test-gameplay",
    title: "ゲームロジックのテスト",
    description:
      "描画なしの純関数を PASS/FAIL で検証。衝突・ダメージ境界。",
    href: "algorithms/unit-test-gameplay.html",
    badge: "品質",
    category: "設計・品質",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "coyote-time",
    title: "コヨーテタイム",
    description:
      "接地を離れた直後の猶予でもジャンプ可。ON/OFF で崖際の操作感を比較。",
    href: "algorithms/coyote-time.html",
    badge: "入力・操作感",
    category: "入力・操作感",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "input-buffer",
    title: "入力バッファ",
    description:
      "着地前のジャンプ入力を短い窓だけ記憶し、着地直後に実行する。",
    href: "algorithms/input-buffer.html",
    badge: "入力・操作感",
    category: "入力・操作感",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "input-abstraction",
    title: "入力抽象化",
    description:
      "論理アクションとキーバインドを分離。プリセット差し替え。",
    href: "algorithms/input-abstraction.html",
    badge: "入力・操作感",
    category: "入力・操作感",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "command-input",
    title: "コマンド入力",
    description:
      "方向・ボタンの時系列を窓時間内で技表と照合。",
    href: "algorithms/command-input.html",
    badge: "入力・操作感",
    category: "入力・操作感",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "accessibility-basics",
    title: "アクセシビリティ基礎",
    description:
      "色覚・字幕・動き抑制・文字サイズを設定として反映。",
    href: "algorithms/accessibility-basics.html",
    badge: "入力・操作感",
    category: "入力・操作感",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "sfx-events",
    title: "イベントと効果音",
    description:
      "ゲームイベントを Emit して SE を再生。Web Audio トーン + ログ。",
    href: "algorithms/sfx-events.html",
    badge: "サウンド",
    category: "サウンド",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "sfx-voice-limit",
    title: "同時発音・重複制御",
    description:
      "ボイス数上限。steal / drop 方策と連打の飽和を観察。",
    href: "algorithms/sfx-voice-limit.html",
    badge: "サウンド",
    category: "サウンド",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "sfx-randomize",
    title: "SE のランダム化",
    description:
      "ピッチ/音量の揺らぎとシャッフルバッグで連打の機械感を抑える。",
    href: "algorithms/sfx-randomize.html",
    badge: "サウンド",
    category: "サウンド",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "sfx-spatial",
    title: "距離・パン・空間 SE",
    description:
      "音源とリスナーの距離減衰とステレオパンをキャンバスで観察。",
    href: "algorithms/sfx-spatial.html",
    badge: "サウンド",
    category: "サウンド",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "audio-bus-ducking",
    title: "サウンドバスとダッキング",
    description:
      "Master / BGM / SE バス。SE 中に BGM を一時減衰。",
    href: "algorithms/audio-bus-ducking.html",
    badge: "サウンド",
    category: "サウンド",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "bgm-loop",
    title: "BGM ループ / イントロ＋ループ",
    description:
      "再生ヘッドがイントロ後は loopStart〜End だけを繰り返す。",
    href: "algorithms/bgm-loop.html",
    badge: "サウンド",
    category: "サウンド",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "balance-sim",
    title: "ゲームバランス分析",
    description:
      "簡易戦闘を N 回自動対戦。勝率バーでパラメータ感度を見る。",
    href: "algorithms/balance-sim.html",
    badge: "プロシージャル",
    category: "プロシージャル",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "gfx-gpu-concepts",
    title: "GPU パイプライン概説",
    description:
      "頂点→ラスタ→ピクセル→結合→表示の段階を概念キャンバスで辿る。",
    href: "algorithms/gfx-gpu-concepts.html",
    badge: "ゲーム CG",
    category: "ゲーム CG",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "gfx-sprite-2d",
    title: "2D スプライト",
    description:
      "スプライトシートのフレーム切替と Y ソートによる前後描画。",
    href: "algorithms/gfx-sprite-2d.html",
    badge: "ゲーム CG",
    category: "ゲーム CG",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "net-p2p-demo",
    title: "P2P 通信の観察",
    description:
      "疑似ネットの遅延・欠落・順序乱れ。Local と Remote 位置のズレ。",
    href: "algorithms/net-p2p-demo.html",
    badge: "通信・データ",
    category: "通信・データ",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "fsm",
    title: "ステートマシン",
    description:
      "状態・イベント・遷移表。キャラ行動を FSM でモデル化（非マップ UI）。",
    href: "algorithms/fsm.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "event-system",
    title: "イベントシステム",
    description:
      "On / Off / Emit。発行側が受信側を知らなくても通知できる pub/sub。",
    href: "algorithms/event-system.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "object-pool",
    title: "オブジェクトプール",
    description:
      "弾の Acquire / Release。毎回 new と再利用の生成カウンタを比較。",
    href: "algorithms/object-pool.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "command-pattern",
    title: "コマンドパターン",
    description:
      "操作を execute/undo オブジェクトに。履歴スタックで Undo。",
    href: "algorithms/command-pattern.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
  {
    id: "component-vs-inheritance",
    title: "継承 vs コンポーネント",
    description:
      "クラス階層の固定能力と、コンポーネント合成の付け外しを並べて比較。",
    href: "algorithms/component-vs-inheritance.html",
    badge: "設計パターン",
    category: "設計パターン",
    ready: true,
    maturity: "oneshot",
  },
];

/**
 * @param {Topic} topic
 */
function createCard(topic) {
  const meta =
    resolveTopicMeta(topic.id) ||
    TOPIC_META[topic.id] || {
      maturity: topic.maturity || "oneshot",
      revisions: 0,
      updated: "",
    };
  const maturityCode = meta.maturity;
  const card = document.createElement("article");
  card.className = topic.ready ? "card" : "card is-coming-soon";
  card.dataset.maturity = maturityCode;
  card.dataset.revisions = String(meta.revisions);
  if (meta.updated) card.dataset.updated = meta.updated;

  const badgeRow = document.createElement("div");
  badgeRow.className = "card-badge-row";

  const badge = document.createElement("span");
  badge.className = "card-badge";
  badge.textContent = topic.badge;

  const maturity = createMaturityBadge(meta);
  if (maturity) badgeRow.append(badge, maturity);
  else badgeRow.append(badge);

  const title = document.createElement("h3");
  title.textContent = topic.title;

  const desc = document.createElement("p");
  desc.textContent = topic.description;

  card.append(badgeRow, title, desc);

  if (topic.ready) {
    const link = document.createElement("a");
    link.className = "btn btn-ghost";
    link.href = topic.href;
    link.textContent = "デモを開く";
    card.append(link);
  } else {
    const soon = document.createElement("span");
    soon.className = "btn btn-ghost";
    soon.textContent = "準備中";
    soon.setAttribute("aria-disabled", "true");
    card.append(soon);
  }

  return card;
}

/**
 * @param {Topic[]} topics
 * @returns {Map<string, Topic[]>}
 */
function groupByCategory(topics) {
  /** @type {Map<string, Topic[]>} */
  const map = new Map();
  for (const t of topics) {
    const cat = t.category || t.badge || "その他";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(t);
  }
  return map;
}

function orderedCategories(map) {
  const keys = [...map.keys()];
  const ordered = [];
  for (const c of CATEGORY_ORDER) {
    if (map.has(c)) ordered.push(c);
  }
  for (const c of keys) {
    if (!ordered.includes(c)) ordered.push(c);
  }
  return ordered;
}

/** 成熟度の色付き凡例 + 件数 */
function renderMaturityLegend() {
  const root = document.getElementById("maturity-legend");
  if (!root) return;

  const counts = countByMaturity(TOPICS);

  const title = document.createElement("p");
  title.className = "maturity-legend-title";
  title.textContent = "修正状況（成熟度）";

  const list = document.createElement("ul");
  list.className = "maturity-legend-list";
  list.setAttribute("aria-label", "成熟度の凡例");

  for (const code of MATURITY_ORDER) {
    const li = document.createElement("li");
    li.className = "maturity-legend-item";

    const badge = createMaturityBadge(code, { className: "card-maturity-lg" });
    const meta = document.createElement("div");
    meta.className = "maturity-legend-meta";

    const count = document.createElement("span");
    count.className = "maturity-legend-count";
    count.textContent = `${counts[code]} 件`;

    const hint = document.createElement("span");
    hint.className = "maturity-legend-hint";
    hint.textContent = MATURITY_HINT[code];

    meta.append(count, hint);
    if (badge) li.append(badge, meta);
    list.appendChild(li);
  }

  const note = document.createElement("p");
  note.className = "maturity-legend-note";
  note.innerHTML =
    "各カードには成熟度に加え <strong>修正回数</strong> と <strong>更新日</strong> を表示します（定義: <code>docs/topics/MATURITY.md</code>）。";

  root.replaceChildren(title, list, note);
}

function renderTopics() {
  const root = document.getElementById("topic-list");
  if (!root) return;

  const byCat = groupByCategory(TOPICS);
  const cats = orderedCategories(byCat);
  const fragment = document.createDocumentFragment();

  for (const cat of cats) {
    const section = document.createElement("section");
    section.className = "topic-category";
    section.setAttribute("aria-label", cat);

    const heading = document.createElement("h3");
    heading.className = "topic-category-title";
    heading.textContent = cat;

    const grid = document.createElement("div");
    grid.className = "card-grid topic-category-grid";

    for (const topic of byCat.get(cat) ?? []) {
      grid.appendChild(createCard(topic));
    }

    section.append(heading, grid);
    fragment.appendChild(section);
  }

  root.replaceChildren(fragment);
}

/**
 * ROADMAP の企画中トピックを「見出しのみ」掲載（デモ・リンクなし）
 */
function renderCurriculumOutline() {
  const root = document.getElementById("curriculum-outline");
  if (!root) return;

  const fragment = document.createDocumentFragment();
  let itemCount = 0;

  for (const cat of CURRICULUM_OUTLINE) {
    itemCount += cat.items.length;

    const section = document.createElement("section");
    section.className = "curriculum-category";
    section.setAttribute("aria-labelledby", `curriculum-${cat.id}`);

    const head = document.createElement("div");
    head.className = "curriculum-category-head";

    const h3 = document.createElement("h3");
    h3.className = "curriculum-category-title";
    h3.id = `curriculum-${cat.id}`;
    h3.textContent = cat.title;

    const badges = document.createElement("div");
    badges.className = "curriculum-category-badges";

    const planned = document.createElement("span");
    planned.className = "curriculum-badge curriculum-badge-planned";
    planned.textContent = "企画中";

    badges.append(planned);
    if (cat.phase) {
      const phase = document.createElement("span");
      phase.className = "curriculum-badge curriculum-badge-phase";
      phase.textContent = cat.phase;
      badges.append(phase);
    }

    head.append(h3, badges);

    if (cat.blurb) {
      const blurb = document.createElement("p");
      blurb.className = "curriculum-category-blurb";
      blurb.textContent = cat.blurb;
      section.append(head, blurb);
    } else {
      section.append(head);
    }

    const list = document.createElement("ul");
    list.className = "curriculum-item-list";
    list.setAttribute("aria-label", `${cat.title}の学習項目`);

    for (const item of cat.items) {
      const li = document.createElement("li");
      li.className = "curriculum-item";
      li.dataset.id = item.id;

      const title = document.createElement("span");
      title.className = "curriculum-item-title";
      title.textContent = item.title;

      // デモなし: リンク・ボタンは付けない（見出しのみ）
      const mark = document.createElement("span");
      mark.className = "curriculum-item-mark";
      mark.textContent = "見出しのみ";
      mark.title = "デモ未実装。学習項目として掲載";

      li.append(title, mark);
      list.appendChild(li);
    }

    section.append(list);
    fragment.appendChild(section);
  }

  const summary = document.createElement("p");
  summary.className = "curriculum-summary";
  summary.textContent = `カテゴリ ${CURRICULUM_OUTLINE.length} · 学習項目（企画中） ${itemCount} — デモは上の「学習トピック」を参照`;

  root.replaceChildren(summary, fragment);
}

renderMaturityLegend();
renderTopics();
renderCurriculumOutline();
