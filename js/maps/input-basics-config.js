/**
 * 入力の基礎デモ設定
 * @see docs/topics/input-basics/SPEC.md
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   keys: string[],
 *   hint: string,
 * }} InputActionDef
 */

/** @type {InputActionDef[]} */
export const INPUT_ACTIONS = [
  {
    id: "jump",
    label: "Jump",
    keys: ["Space", " "],
    hint: "Space — down エッジのみで +1（押し続けても 1 回）",
  },
  {
    id: "fire",
    label: "Fire",
    keys: ["KeyZ", "z", "Z"],
    hint: "Z — 押しているあいだ毎フレーム +1。離す（up）と 0 に戻す",
  },
  {
    id: "charge",
    label: "Charge",
    keys: ["KeyX", "x", "X"],
    hint: "X — 閾値で 1 回消費し、金色の弾。押し続けても 2 発目は出ない",
  },
  {
    id: "move",
    label: "Move",
    keys: ["ArrowRight", "ArrowLeft"],
    hint: "←→ — held で移動（押し続けてよい例）",
  },
];

export const INPUT_BASICS_CONFIG = {
  defaultLongPressMs: 400,
  minLongPressMs: 100,
  maxLongPressMs: 1500,
  logMax: 36,
  moveSpeed: 0.45,
};
