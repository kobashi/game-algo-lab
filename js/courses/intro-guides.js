/**
 * 入門コースの詳説ページ（中学生向け）の一覧 — トピック id → ページ
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
};
