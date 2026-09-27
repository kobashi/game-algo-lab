/**
 * 入門コースの詳説ページ（中学生向け）の一覧 — トピック id → ページ（14 本すべて）
 *
 * href はサイトルート基準。トピックページ（algorithms/）とコース入口（courses/）の両方から、
 * この一覧を使ってリンクを出す（js/platform/topic-shell.js・js/courses-intro.js）。
 *
 * @type {Record<string, { number: number, title: string, href: string }>}
 */
export const GUIDES = {
  "game-loop": { number: 1, title: "ゲームループ", href: "courses/guide-game-loop.html" },
  "input-basics": { number: 2, title: "入力の基礎", href: "courses/guide-input-basics.html" },
  "velocity-motion": { number: 3, title: "速度による移動", href: "courses/guide-velocity-motion.html" },
  "accel-gravity": { number: 4, title: "加速度と重力", href: "courses/guide-accel-gravity.html" },
  "circle-collision": { number: 5, title: "円同士・円と AABB", href: "courses/guide-circle-collision.html" },
  "coyote-time": { number: 6, title: "コヨーテタイム", href: "courses/guide-coyote-time.html" },
  "gfx-camera": { number: 7, title: "カメラ", href: "courses/guide-gfx-camera.html" },
  "gfx-ui-canvas": { number: 8, title: "UI の配置", href: "courses/guide-gfx-ui-canvas.html" },
  "sfx-events": { number: 9, title: "イベントと効果音", href: "courses/guide-sfx-events.html" },
  fsm: { number: 10, title: "ステートマシン", href: "courses/guide-fsm.html" },
  "rng-seed": { number: 11, title: "乱数とシード", href: "courses/guide-rng-seed.html" },
  minimax: { number: 12, title: "Min-Max 探索", href: "courses/guide-minimax.html" },
  "alpha-beta": { number: 13, title: "α-β 法", href: "courses/guide-alpha-beta.html" },
  "tic-tac-toe": { number: 14, title: "三目並べ", href: "courses/guide-tic-tac-toe.html" },
};
