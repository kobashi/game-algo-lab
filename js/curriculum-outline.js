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
  // pathfinding / game-tree の追加案:
  // path-compare・game-tree-engine は ROADMAP §5 のアイディアメモ（低優先）のため outline 非掲載。デモは TOPICS 側。
  {
    id: "physics",
    title: "物理・判定",
    phase: "第3期",
    blurb: "デモあり（擬似〜応答・レイ・運動量）。以下は高度トピック予定。",
    items: [
    ],
  },
  {
    id: "patterns",
    title: "設計パターン",
    phase: "第2〜3期",
    blurb: "デモあり（FSM〜ECS）。設計パターン一通り揃った。",
    items: [],
  },
  // fundamentals: 5 本すべて TOPICS に ready（game-loop〜rng-seed）
  {
    id: "ai-steering",
    title: "ゲーム AI・自律移動",
    phase: "第4期",
    blurb: "デモあり（Seek〜ナビ連携・Boids・BT）。FSM は設計パターンにデモあり。",
    items: [],
  },
  {
    id: "spatial",
    title: "空間探索・最適化",
    phase: "第3〜4期",
    blurb: "デモあり（総当たり〜BVH）。カテゴリ一通り揃った。",
    items: [],
  },
  {
    id: "hci",
    title: "入力・操作感・HCI",
    phase: "第3期",
    blurb: "デモあり（コヨーテ〜a11y・コマンド入力）。",
    items: [],
  },
  {
    id: "networking",
    title: "通信・データ",
    phase: "第5期",
    blurb: "デモあり（P2P · 予測 · C/S 権威）。同期モード・DB 等は企画中。",
    items: [
      { id: "net-sync-modes", title: "状態同期 vs 入力同期" },
      { id: "net-anti-cheat", title: "サーバ権威とチート対策（発展）" },
      { id: "net-db-transaction", title: "DB とトランザクション" },
    ],
  },
  {
    id: "audio",
    title: "ゲームサウンド",
    phase: "第5期",
    blurb: "デモあり（SFX〜BGM 切替・量子化）。レイヤー型 interactive は企画中。",
    items: [
      { id: "bgm-interactive", title: "拍同期・レイヤー型 BGM" },
    ],
  },
  {
    id: "graphics",
    title: "ゲーム CG",
    phase: "第4期",
    blurb: "デモあり（GPU · スプライト · カメラ · VFX · 光/α）。ポスト等は企画中。",
    items: [
      { id: "gfx-coordinates", title: "座標系と変換" },
      { id: "gfx-mesh-uv", title: "メッシュ・UV・マテリアル" },
      { id: "gfx-postprocess", title: "ポストプロセス" },
      { id: "gfx-lod-culling", title: "LOD・カリング" },
      { id: "gfx-ui-canvas", title: "UI 描画" },
    ],
  },
  {
    id: "quality",
    title: "設計・品質",
    phase: "横断",
    blurb: "デモあり（セーブ〜計測・ユニットテスト）。",
    items: [],
  },
  {
    id: "procgen",
    title: "プロシージャル・確率・バランス",
    phase: "第2〜4期",
    blurb: "デモあり（迷路〜ノイズ・バランス分析）。乱数は基礎実行にデモあり。",
    items: [],
  },
];
