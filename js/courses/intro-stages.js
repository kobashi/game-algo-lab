/**
 * 入門コースの段構成（データのみ・描画の副作用なし）
 *
 * 正本はここ。`js/courses-intro.js`（コース入口ページの描画）と
 * `js/platform/course-nav.js`（トピックページのコース内ナビ）の
 * 両方がここから前後関係・段番号を引く（二重管理しない）。
 *
 * 文言（タイトル・説明）は `js/main.js` の `TOPICS` が正。
 * ここでは id と段の構成だけを持つ。
 *
 * @see docs/reviews/2026-09-26-intro-course-improvement-plan.md §8 決定3
 */

/**
 * @typedef {{ title: string, lead: string, ids: string[] }} CourseStage
 */

/** @type {CourseStage[]} */
export const STAGES = [
  {
    title: "まず動かす",
    lead: "ゲームが1秒間に何をしているかを知る",
    ids: ["game-loop", "input-basics"],
  },
  {
    title: "物を動かす",
    lead: "位置・速度・重力・当たり判定",
    ids: ["velocity-motion", "accel-gravity", "circle-collision"],
  },
  {
    title: "手ざわりを作る",
    lead: "同じ処理でも操作感は数値で変わる",
    ids: ["coyote-time", "gfx-camera"],
  },
  {
    title: "見せる・鳴らす",
    lead: "画面表示と効果音のつなぎ方",
    ids: ["gfx-ui-canvas", "sfx-events"],
  },
  {
    title: "状態と乱数",
    lead: "状態遷移と、再現できる乱数",
    ids: ["fsm", "rng-seed"],
  },
  {
    title: "考えるAI",
    lead: "先読みで手を選び、少ない読みで同じ答えに着く",
    // alpha-beta は minimax と tic-tac-toe の間（§8 決定3・案1）
    ids: ["minimax", "alpha-beta", "tic-tac-toe"],
  },
];

/**
 * 段をまたいだ、コース全体の学ぶ順（フラットな id 配列）を返す。
 * @returns {string[]}
 */
export function getCourseOrder() {
  return STAGES.flatMap((stage) => stage.ids);
}

/**
 * id がコースの何段目・何本目かを返す（0-based index を含む）。
 * 見つからなければ null。
 * @param {string} id
 * @returns {{ stageIndex: number, stage: CourseStage, order: string[], index: number, total: number } | null}
 */
export function findCoursePosition(id) {
  const order = getCourseOrder();
  const index = order.indexOf(id);
  if (index === -1) return null;
  let stageIndex = 0;
  let counted = 0;
  for (let i = 0; i < STAGES.length; i++) {
    counted += STAGES[i].ids.length;
    if (index < counted) {
      stageIndex = i;
      break;
    }
  }
  return { stageIndex, stage: STAGES[stageIndex], order, index, total: order.length };
}
